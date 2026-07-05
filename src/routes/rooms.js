import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { createRoom, getRooms, joinRoom, leaveRoom, getMembers } from '../db.js';

const router = Router();

// All room routes require auth
router.use(authMiddleware);

// GET /api/rooms
router.get('/', (req, res) => {
  const rooms = getRooms(req.user.id);
  res.json({ rooms });
});

// POST /api/rooms
router.post('/', (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Room name is required' });
    const room = createRoom(name, description || '', req.user.id);
    res.status(201).json({ room });
  } catch (err) {
    console.error('Create room error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/rooms/:id/join
router.post('/:id/join', (req, res) => {
  try {
    const roomId = Number(req.params.id);
    joinRoom(roomId, req.user.id);
    res.json({ message: 'Joined room' });
  } catch (err) {
    console.error('Join room error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/rooms/:id/leave
router.post('/:id/leave', (req, res) => {
  try {
    const roomId = Number(req.params.id);
    leaveRoom(roomId, req.user.id);
    res.json({ message: 'Left room' });
  } catch (err) {
    console.error('Leave room error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/rooms/:id/members
router.get('/:id/members', (req, res) => {
  try {
    const roomId = Number(req.params.id);
    const members = getMembers(roomId);
    res.json({ members });
  } catch (err) {
    console.error('Get members error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
