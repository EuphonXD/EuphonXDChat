import jwt from 'jsonwebtoken';
import { saveMessage, savePrivateMessage, getMembers, isRoomMember } from './db.js';
import { findUserById } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'webchat-secret-key-2026';
const onlineUsers = new Map(); // userId -> Set<socketId>

// Shared reference to io instance for use in routes
let ioInstance = null;

export function getIO() {
  return ioInstance;
}

export function setupSocket(io) {
  ioInstance = io;

  // Auth middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.user = decoded;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;
    console.log(`User connected: ${userId} (socket ${socket.id})`);

    // Track online status
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);
    io.emit('online-users', [...onlineUsers.keys()]);

    // Join personal channel for private messages
    socket.join(userId.toString());

    // ── Room events ──
    socket.on('join-room', (roomId) => {
      const roomName = `room:${roomId}`;
      socket.join(roomName);

      // Notify room members
      const user = findUserById(userId);
      io.to(roomName).emit('user-joined', { roomId, user });

      // Broadcast member count update to all
      const members = getMembers(roomId);
      io.emit('room-updated', { roomId, memberCount: members.length });

      socket.emit('room-joined', { roomId });
    });

    socket.on('leave-room', (roomId) => {
      const roomName = `room:${roomId}`;
      socket.leave(roomName);
      io.to(roomName).emit('user-left', { roomId, userId });

      // Broadcast member count update
      const members = getMembers(roomId);
      io.emit('room-updated', { roomId, memberCount: members.length });
    });

    // ── Messaging ──
    socket.on('send-message', ({ roomId, content }) => {
      if (!content || !content.trim()) return;
      if (!isRoomMember(roomId, userId)) return;

      const message = saveMessage(roomId, userId, content);
      const roomName = `room:${roomId}`;
      io.to(roomName).emit('new-message', { ...message, roomId });
    });

    socket.on('send-private', ({ toUserId, content }) => {
      if (!content || !content.trim() || !toUserId) return;

      const pm = savePrivateMessage(userId, toUserId, content);
      io.to(userId.toString()).emit('new-private-message', pm);
      io.to(toUserId.toString()).emit('new-private-message', pm);
    });

    // ── Typing indicator ──
    socket.on('typing', ({ roomId, isTyping }) => {
      const roomName = `room:${roomId}`;
      socket.to(roomName).emit('user-typing', { roomId, userId, isTyping });
    });

    // ── Disconnect ──
    socket.on('disconnect', () => {
      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) onlineUsers.delete(userId);
      }
      io.emit('online-users', [...onlineUsers.keys()]);
      console.log(`User disconnected: ${userId}`);
    });
  });
}
