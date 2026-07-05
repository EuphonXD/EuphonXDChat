import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth.js';
import {
  saveCustomEmoji, getCustomEmojis, getCustomEmojiGroups,
  updateCustomEmojiGroup, deleteCustomEmoji,
  setRoomBackground, getRoomBackground, deleteRoomBackground,
  getAllRoomBackgrounds
} from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const emojiDir = path.join(__dirname, '..', '..', 'server', 'emoji');
const uploadDir = path.join(__dirname, '..', '..', 'data', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const router = Router();

// ── File upload config ──
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `bg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('只能上传图片文件'));
  }
});

// ── Emoji pack helpers ──

function getPackFiles() {
  if (!fs.existsSync(emojiDir)) return [];
  return fs.readdirSync(emojiDir).filter(f => f.endsWith('.json'));
}

function readPack(filename) {
  const filepath = path.join(emojiDir, filename);
  if (!fs.existsSync(filepath)) return null;
  return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
}

function extractImgSrc(str) {
  if (!str) return '';
  const match = str.match(/src=['"]([^'"]+)['"]/i);
  return match ? match[1] : str;
}

function normalizePack(data) {
  const categories = {};
  if (!data || typeof data !== 'object') return categories;
  for (const [key, value] of Object.entries(data)) {
    if (!value || typeof value !== 'object') continue;
    if (Array.isArray(value.container)) {
      categories[key] = value.container.map(item => ({
        name: item.text || '',
        url: extractImgSrc(item.icon || item.url || ''),
      }));
    } else if (Array.isArray(value)) {
      categories[key] = value.map(item => ({
        name: item.text || item.name || '',
        url: extractImgSrc(item.icon || item.url || ''),
      }));
    }
  }
  return categories;
}

// ── Built-in packs ──

router.get('/packs', (req, res) => {
  try {
    const files = getPackFiles();
    const packs = files.map(filename => {
      const data = readPack(filename);
      const id = filename.replace('.json', '');
      const categories = normalizePack(data);
      const emojis = [];
      for (const [catName, stickers] of Object.entries(categories)) {
        for (const sticker of stickers) {
          emojis.push({ ...sticker, category: catName });
        }
      }
      return { id, name: id, emojis };
    });
    res.json({ packs });
  } catch (err) {
    console.error('List packs error:', err);
    res.status(500).json({ error: 'Failed to load emoji packs' });
  }
});

router.get('/packs/:packName', (req, res) => {
  try {
    const { packName } = req.params;
    const data = readPack(`${packName}.json`);
    if (!data) return res.status(404).json({ error: 'Pack not found' });
    const categories = normalizePack(data);
    res.json({ pack: packName, categories });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load pack' });
  }
});

// ── Custom emojis (grouped) ──

router.get('/custom', authMiddleware, (req, res) => {
  const emojis = getCustomEmojis(req.user.id);
  const groups = getCustomEmojiGroups(req.user.id);
  // Group emojis by group_name
  const grouped = {};
  for (const e of emojis) {
    if (!grouped[e.groupName]) grouped[e.groupName] = [];
    grouped[e.groupName].push(e);
  }
  res.json({ emojis: grouped, groups });
});

router.post('/custom', authMiddleware, (req, res) => {
  try {
    const { name, url, groupName } = req.body;
    if (!name || !url) return res.status(400).json({ error: 'name and url are required' });
    const emoji = saveCustomEmoji(req.user.id, name, url, groupName);
    res.status(201).json({ emoji });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/custom/:id/group', authMiddleware, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { groupName } = req.body;
    if (!groupName) return res.status(400).json({ error: 'groupName is required' });
    const ok = updateCustomEmojiGroup(id, req.user.id, groupName);
    if (ok) res.json({ success: true });
    else res.status(404).json({ error: 'Not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/custom/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id);
  const result = deleteCustomEmoji(id, req.user.id);
  if (result) res.json({ success: true });
  else res.status(404).json({ error: 'Not found' });
});

// ── Room backgrounds ──

router.get('/background/:roomId', authMiddleware, (req, res) => {
  const roomId = parseInt(req.params.roomId);
  const bg = getRoomBackground(roomId, req.user.id);
  res.json({ background: bg || null });
});

router.get('/background/:roomId/all', authMiddleware, (req, res) => {
  const roomId = parseInt(req.params.roomId);
  const bgs = getAllRoomBackgrounds(roomId);
  res.json({ backgrounds: bgs });
});

router.post('/background/:roomId', authMiddleware, upload.single('image'), (req, res) => {
  try {
    const roomId = parseInt(req.params.roomId);
    if (!req.file) return res.status(400).json({ error: '请选择图片' });
    const imageUrl = `/api/emoji/upload/${req.file.filename}`;
    const bg = setRoomBackground(roomId, req.user.id, imageUrl);
    res.status(201).json({ background: bg });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/background/:roomId', authMiddleware, (req, res) => {
  const roomId = parseInt(req.params.roomId);
  const result = deleteRoomBackground(roomId, req.user.id);
  if (result) res.json({ success: true });
  else res.status(404).json({ error: 'No background set' });
});

// Serve uploaded files
router.get('/upload/:filename', (req, res) => {
  const filepath = path.join(uploadDir, req.params.filename);
  if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'Not found' });
  res.sendFile(filepath);
});

export default router;
