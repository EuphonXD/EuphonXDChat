import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  createRoom, getRooms, joinRoomWithPassword, joinRoomByName,
  leaveRoom, getMembers, inviteToRoom, findRoomById, findRoomByName,
  isRoomMember, searchUsers
} from '../db.js';
import { getIO } from '../socket.js';

const router = Router();
router.use(authMiddleware);

// GET /api/rooms - only return rooms user is member of
router.get('/', (req, res) => {
  const rooms = getRooms(req.user.id);
  res.json({ rooms });
});

// POST /api/rooms - create a room (optionally with password)
router.post('/', (req, res) => {
  try {
    const { name, description, password } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: '请输入聊天室名称' });
    if (name.trim().length > 50) return res.status(400).json({ error: '名称不能超过50个字符' });
    const room = createRoom(name.trim(), description || '', req.user.id, password || null);

    // Broadcast new room to all connected users
    const io = getIO();
    if (io) {
      io.emit('room-created', {
        room: { id: room.id, name: room.name, description: room.description, hasPassword: !!password, memberCount: 1 }
      });
    }

    res.status(201).json({ room: { ...room, hasPassword: !!password } });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: '该聊天室名称已存在' });
    }
    console.error('Create room error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// POST /api/rooms/join - join by name + password
router.post('/join', (req, res) => {
  try {
    const { name, password } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: '请输入聊天室名称' });
    const result = joinRoomByName(name.trim(), req.user.id, password);
    if (result.error) return res.status(400).json({ error: result.error });
    const roomInfo = findRoomByName(name.trim());

    // Broadcast member count update
    const io = getIO();
    if (io && roomInfo) {
      const members = getMembers(roomInfo.id);
      io.emit('room-updated', { roomId: roomInfo.id, memberCount: members.length });
    }

    res.json({
      message: '已加入聊天室',
      room: roomInfo ? { id: roomInfo.id, name: roomInfo.name, description: roomInfo.description } : undefined
    });
  } catch (err) {
    console.error('Join room error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// POST /api/rooms/:id/invite - invite a user
router.post('/:id/invite', (req, res) => {
  try {
    const roomId = Number(req.params.id);
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: '请指定要邀请的用户' });
    if (!isRoomMember(roomId, req.user.id)) {
      return res.status(403).json({ error: '你不是该聊天室的成员' });
    }
    const result = inviteToRoom(roomId, req.user.id, userId);
    if (result.error) return res.status(400).json({ error: result.error });

    // Broadcast member count update
    const io = getIO();
    if (io) {
      const members = getMembers(roomId);
      io.emit('room-updated', { roomId, memberCount: members.length });
    }

    res.json({ message: result.message || '邀请成功' });
  } catch (err) {
    console.error('Invite error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// POST /api/rooms/:id/leave
router.post('/:id/leave', (req, res) => {
  try {
    const roomId = Number(req.params.id);
    leaveRoom(roomId, req.user.id);

    // Broadcast member count update
    const io = getIO();
    if (io) {
      const members = getMembers(roomId);
      io.emit('room-updated', { roomId, memberCount: members.length });
    }

    res.json({ message: '已退出聊天室' });
  } catch (err) {
    console.error('Leave room error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// GET /api/rooms/:id/members
router.get('/:id/members', (req, res) => {
  try {
    const roomId = Number(req.params.id);
    if (!isRoomMember(roomId, req.user.id)) {
      return res.status(403).json({ error: '你不是该聊天室的成员' });
    }
    const members = getMembers(roomId);
    res.json({ members });
  } catch (err) {
    console.error('Get members error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// GET /api/users/search - search users for inviting
router.get('/search/users', (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 1) return res.json({ users: [] });
    const users = searchUsers(q.trim(), req.user.id);
    res.json({ users });
  } catch (err) {
    console.error('Search users error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

export default router;
