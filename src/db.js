import fs from 'fs';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, 'webchat.db');

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
    name TEXT UNIQUE NOT NULL,
    description TEXT DEFAULT '',
    password_hash TEXT,
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

  CREATE TABLE IF NOT EXISTS custom_emojis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    group_name TEXT DEFAULT '默认',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS room_backgrounds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(room_id, user_id)
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
export function createRoom(name, description, creatorId, password) {
  const passwordHash = password ? bcrypt.hashSync(password, 10) : null;
  const insert = db.prepare(
    `INSERT INTO rooms (name, description, creator_id, password_hash) VALUES (?, ?, ?, ?)`
  );
  const info = insert.run(name, description || '', creatorId, passwordHash);
  db.prepare(
    `INSERT INTO room_members (room_id, user_id) VALUES (?, ?)`
  ).run(info.lastInsertRowid, creatorId);
  return db.prepare(`SELECT id, name, description, creator_id, created_at FROM rooms WHERE id = ?`).get(info.lastInsertRowid);
}

// Only return rooms the user is a member of
export function getRooms(userId) {
  const rows = db.prepare(`
    SELECT r.id, r.name, r.description, r.password_hash,
      (SELECT COUNT(*) FROM room_members WHERE room_id = r.id) AS memberCount
    FROM rooms r
    JOIN room_members rm ON r.id = rm.room_id
    WHERE rm.user_id = ?
    ORDER BY r.created_at DESC
  `).all(userId);
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    description: r.description,
    hasPassword: !!r.password_hash,
    memberCount: r.memberCount,
  }));
}

export function findRoomByName(name) {
  return db.prepare(`SELECT id, name, description, password_hash FROM rooms WHERE name = ?`).get(name);
}

export function findRoomById(id) {
  return db.prepare(`SELECT id, name, description, password_hash, creator_id FROM rooms WHERE id = ?`).get(id);
}

export function joinRoomWithPassword(roomId, userId, password) {
  const room = findRoomById(roomId);
  if (!room) return { error: '聊天室不存在' };
  if (isRoomMember(roomId, userId)) return { ok: true };
  if (room.password_hash) {
    if (!password) return { error: '该聊天室需要密码' };
    if (!bcrypt.compareSync(password, room.password_hash)) return { error: '密码错误' };
  }
  db.prepare(`INSERT OR IGNORE INTO room_members (room_id, user_id) VALUES (?, ?)`).run(roomId, userId);
  return { ok: true };
}

export function joinRoomByName(name, userId, password) {
  const room = findRoomByName(name);
  if (!room) return { error: '聊天室不存在' };
  return joinRoomWithPassword(room.id, userId, password);
}

export function inviteToRoom(roomId, inviterId, inviteeId) {
  if (!isRoomMember(roomId, inviterId)) return { error: '你不是该聊天室的成员' };
  if (isRoomMember(roomId, inviteeId)) return { ok: true, message: '该用户已是成员' };
  db.prepare(`INSERT OR IGNORE INTO room_members (room_id, user_id) VALUES (?, ?)`).run(roomId, inviteeId);
  return { ok: true };
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

// Search users by username or nickname (for inviting)
export function searchUsers(query, excludeUserId) {
  return db.prepare(`
    SELECT id, username, nickname, avatar
    FROM users
    WHERE (username LIKE ? OR nickname LIKE ?) AND id != ?
    LIMIT 10
  `).all(`%${query}%`, `%${query}%`, excludeUserId);
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

export function saveCustomEmoji(userId, name, url, groupName) {
  const info = db.prepare(
    `INSERT INTO custom_emojis (user_id, name, url, group_name) VALUES (?, ?, ?, ?)`
  ).run(userId, name, url, groupName || '默认');
  return db.prepare(`SELECT * FROM custom_emojis WHERE id = ?`).get(info.lastInsertRowid);
}

export function getCustomEmojis(userId) {
  return db.prepare(
    `SELECT id, name, url, group_name AS groupName, created_at AS createdAt FROM custom_emojis WHERE user_id = ? ORDER BY group_name, created_at DESC`
  ).all(userId);
}

export function getCustomEmojiGroups(userId) {
  return db.prepare(
    `SELECT group_name AS groupName, COUNT(*) as count FROM custom_emojis WHERE user_id = ? GROUP BY group_name ORDER BY group_name`
  ).all(userId);
}

export function updateCustomEmojiGroup(id, userId, groupName) {
  const info = db.prepare(
    `UPDATE custom_emojis SET group_name = ? WHERE id = ? AND user_id = ?`
  ).run(groupName, id, userId);
  return info.changes > 0;
}

export function deleteCustomEmoji(id, userId) {
  const info = db.prepare(
    `DELETE FROM custom_emojis WHERE id = ? AND user_id = ?`
  ).run(id, userId);
  return info.changes > 0;
}

// ── Room background helpers ──
export function setRoomBackground(roomId, userId, imageUrl) {
  db.prepare(
    `INSERT INTO room_backgrounds (room_id, user_id, image_url) VALUES (?, ?, ?)
     ON CONFLICT(room_id, user_id) DO UPDATE SET image_url = excluded.image_url`
  ).run(roomId, userId, imageUrl);
  return { roomId, userId, imageUrl };
}

export function getRoomBackground(roomId, userId) {
  return db.prepare(
    `SELECT image_url AS imageUrl FROM room_backgrounds WHERE room_id = ? AND user_id = ?`
  ).get(roomId, userId);
}

export function deleteRoomBackground(roomId, userId) {
  const info = db.prepare(
    `DELETE FROM room_backgrounds WHERE room_id = ? AND user_id = ?`
  ).run(roomId, userId);
  return info.changes > 0;
}

export function getAllRoomBackgrounds(roomId) {
  return db.prepare(
    `SELECT user_id AS userId, image_url AS imageUrl FROM room_backgrounds WHERE room_id = ?`
  ).all(roomId);
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
