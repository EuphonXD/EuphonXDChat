import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { createUser, findUser, findUserById, updateProfile } from '../db.js';
import { authMiddleware, generateToken } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/register
router.post('/register', (req, res) => {
  try {
    const { username, email, password, nickname } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    const existing = findUser(username);
    if (existing) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const hash = bcrypt.hashSync(password, 10);
    const user = createUser(username, email, hash, nickname || username);
    const token = generateToken(user);

    res.status(201).json({ token, user });
  } catch (err) {
    if (err.message?.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: 'Username or email already taken' });
    }
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const { login, password } = req.body;
    if (!login || !password) {
      return res.status(400).json({ error: 'Login and password are required' });
    }

    const user = findUser(login);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user);
    res.json({ token, user: findUserById(user.id) });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  const user = findUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

// PUT /api/auth/profile
router.put('/profile', authMiddleware, (req, res) => {
  try {
    const { nickname, avatar } = req.body;
    const user = updateProfile(req.user.id, { nickname, avatar });
    res.json({ user });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
