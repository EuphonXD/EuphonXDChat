import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'webchat.db');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ──
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    nickname TEXT NOT NULL,
    avatar TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    creator_id INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS room_members (
    room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (room_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS private_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_user_id INTEGER REFERENCES users(id),
    to_user_id INTEGER REFERENCES users(id),
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// ── User helpers ──
export function createUser(username, email, passwordHash, nickname) {
  const stmt = db.prepare(
    `INSERT INTO users (username, email, password_hash, nickname) VALUES (?, ?, ?, ?)`
  );
  const info = stmt.run(username, email, passwordHash, nickname);
  return findUserById(info.lastInsertRowid);
}

export function findUser(usernameOrEmail) {
  return db.prepare(
    `SELECT * FROM users WHERE username = ? OR email = ?`
  ).get(usernameOrEmail, usernameOrEmail);
}

export function findUserById(id) {
  return db.prepare(
    `SELECT id, username, nickname, avatar, email, created_at FROM users WHERE id = ?`
  ).get(id);
}

export function updateProfile(userId, { nickname, avatar }) {
  const fields = [];
  const values = [];
  if (nickname !== undefined) { fields.push('nickname = ?'); values.push(nickname); }
  if (avatar !== undefined) { fields.push('avatar = ?'); values.push(avatar); }
  if (fields.length === 0) return findUserById(userId);
  values.push(userId);
  db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return findUserById(userId);
}

// ── Room helpers ──
export function createRoom(name, description, creatorId) {
  const insert = db.prepare(
    `INSERT INTO rooms (name, description, creator_id) VALUES (?, ?, ?)`
  );
  const info = insert.run(name, description || '', creatorId);
  db.prepare(
    `INSERT INTO room_members (room_id, user_id) VALUES (?, ?)`
  ).run(info.lastInsertRowid, creatorId);
  return db.prepare(`SELECT * FROM rooms WHERE id = ?`).get(info.lastInsertRowid);
}

export function getRooms(userId) {
  const rows = db.prepare(`
    SELECT r.id, r.name, r.description,
      (SELECT COUNT(*) FROM room_members WHERE room_id = r.id) AS memberCount,
      (SELECT COUNT(*) FROM room_members WHERE room_id = r.id AND user_id = ?) AS isMember
    FROM rooms r
    ORDER BY r.created_at DESC
  `).all(userId);
  return rows.map(r => ({ ...r, isMember: r.isMember > 0 }));
}

export function joinRoom(roomId, userId) {
  try {
    db.prepare(`INSERT OR IGNORE INTO room_members (room_id, user_id) VALUES (?, ?)`).run(roomId, userId);
    return true;
  } catch { return false; }
}

export function leaveRoom(roomId, userId) {
  db.prepare(`DELETE FROM room_members WHERE room_id = ? AND user_id = ?`).run(roomId, userId);
  return true;
}

export function getMembers(roomId) {
  return db.prepare(`
    SELECT u.id, u.username, u.nickname, u.avatar
    FROM users u
    JOIN room_members rm ON u.id = rm.user_id
    WHERE rm.room_id = ?
  `).all(roomId);
}

export function isRoomMember(roomId, userId) {
  const row = db.prepare(
    `SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?`
  ).get(roomId, userId);
  return !!row;
}

// ── Message helpers ──
export function getMessages(roomId, limit = 50, before) {
  if (before) {
    return db.prepare(`
      SELECT m.id, m.content, m.user_id AS userId, u.username, u.nickname, u.avatar,
             m.created_at AS createdAt
      FROM messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.room_id = ? AND m.created_at < ?
      ORDER BY m.created_at DESC
      LIMIT ?
    `).all(roomId, before, limit).reverse();
  }
  return db.prepare(`
    SELECT m.id, m.content, m.user_id AS userId, u.username, u.nickname, u.avatar,
           m.created_at AS createdAt
    FROM messages m
    JOIN users u ON m.user_id = u.id
    WHERE m.room_id = ?
    ORDER BY m.created_at DESC
    LIMIT ?
  `).all(roomId, limit).reverse();
}

export function saveMessage(roomId, userId, content) {
  const info = db.prepare(
    `INSERT INTO messages (room_id, user_id, content) VALUES (?, ?, ?)`
  ).run(roomId, userId, content);
  return db.prepare(`
    SELECT m.id, m.content, m.user_id AS userId, u.username, u.nickname, u.avatar,
           m.created_at AS createdAt
    FROM messages m
    JOIN users u ON m.user_id = u.id
    WHERE m.id = ?
  `).get(info.lastInsertRowid);
}

// ── Private message helpers ──
export function savePrivateMessage(fromUserId, toUserId, content) {
  const info = db.prepare(
    `INSERT INTO private_messages (from_user_id, to_user_id, content) VALUES (?, ?, ?)`
  ).run(fromUserId, toUserId, content);
  return db.prepare(`
    SELECT id, from_user_id AS fromUserId, to_user_id AS toUserId,
           content, created_at AS createdAt
    FROM private_messages WHERE id = ?
  `).get(info.lastInsertRowid);
}

export function getPrivateMessages(userId, otherUserId, limit = 50, before) {
  const query = before
    ? `
      SELECT id, from_user_id AS fromUserId, to_user_id AS toUserId,
             content, created_at AS createdAt
      FROM private_messages
      WHERE ((from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?))
        AND created_at < ?
      ORDER BY created_at DESC LIMIT ?`
    : `
      SELECT id, from_user_id AS fromUserId, to_user_id AS toUserId,
             content, created_at AS createdAt
      FROM private_messages
      WHERE ((from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?))
      ORDER BY created_at DESC LIMIT ?`;

  const params = before
    ? [userId, otherUserId, otherUserId, userId, before, limit]
    : [userId, otherUserId, otherUserId, userId, limit];

  return db.prepare(query).all(...params).reverse();
}

export function getPrivateConversations(userId) {
  // Get all users the current user has messaged with, plus the last message
  const rows = db.prepare(`
    SELECT
      CASE
        WHEN pm.from_user_id = ? THEN pm.to_user_id
        ELSE pm.from_user_id
      END AS otherUserId,
      MAX(pm.created_at) AS lastMessageAt
    FROM private_messages pm
    WHERE pm.from_user_id = ? OR pm.to_user_id = ?
    GROUP BY otherUserId
    ORDER BY lastMessageAt DESC
  `).all(userId, userId, userId);

  return rows.map(r => {
    const user = db.prepare(
      `SELECT id, username, nickname, avatar FROM users WHERE id = ?`
    ).get(r.otherUserId);
    const lastMsg = db.prepare(`
      SELECT content FROM private_messages
      WHERE (from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?)
      ORDER BY created_at DESC LIMIT 1
    `).get(userId, r.otherUserId, r.otherUserId, userId);
    return {
      userId: user.id,
      username: user.username,
      nickname: user.nickname,
      avatar: user.avatar,
      lastMessage: lastMsg.content,
      lastMessageAt: r.lastMessageAt,
    };
  });
}

export default db;
