import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getMessages, getPrivateMessages, getPrivateConversations } from '../db.js';

const router = Router();

router.use(authMiddleware);

// GET /api/messages/room/:roomId?limit=50&before=timestamp
router.get('/room/:roomId', (req, res) => {
  try {
    const roomId = Number(req.params.roomId);
    const limit = Number(req.query.limit) || 50;
    const before = req.query.before || null;
    const messages = getMessages(roomId, limit, before);
    res.json({ messages });
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/messages/private/:userId?limit=50&before=timestamp
router.get('/private/:userId', (req, res) => {
  try {
    const otherUserId = Number(req.params.userId);
    const limit = Number(req.query.limit) || 50;
    const before = req.query.before || null;
    const messages = getPrivateMessages(req.user.id, otherUserId, limit, before);
    res.json({ messages });
  } catch (err) {
    console.error('Get private messages error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/messages/private-conversations
router.get('/private-conversations', (req, res) => {
  try {
    const conversations = getPrivateConversations(req.user.id);
    res.json({ conversations });
  } catch (err) {
    console.error('Get private conversations error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
