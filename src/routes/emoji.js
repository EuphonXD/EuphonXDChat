import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { authMiddleware } from '../middleware/auth.js';
import { saveCustomEmoji, getCustomEmojis, deleteCustomEmoji } from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const emojiDir = path.join(__dirname, '..', '..', 'server', 'emoji');

const router = Router();

// ── Helpers ──

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

// ── Routes ──

// GET /api/emoji/packs - List all packs with full emoji data
router.get('/packs', (req, res) => {
  try {
    const files = getPackFiles();
    const packs = files.map(filename => {
      const data = readPack(filename);
      const id = filename.replace('.json', '');
      const categories = normalizePack(data);
      // Flatten all emojis from all categories into a single array
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

// GET /api/emoji/packs/:packName - Get stickers in a specific pack by category
router.get('/packs/:packName', (req, res) => {
  try {
    const { packName } = req.params;
    const filename = `${packName}.json`;
    const data = readPack(filename);
    if (!data) return res.status(404).json({ error: 'Pack not found' });
    const categories = normalizePack(data);
    res.json({ pack: packName, categories });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load pack' });
  }
});

// POST /api/emoji/custom - Upload custom sticker
router.post('/custom', authMiddleware, (req, res) => {
  try {
    const { name, url } = req.body;
    if (!name || !url) return res.status(400).json({ error: 'name and url are required' });
    const emoji = saveCustomEmoji(req.user.id, name, url);
    res.status(201).json({ emoji });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/emoji/custom - Get user's custom stickers
router.get('/custom', authMiddleware, (req, res) => {
  const emojis = getCustomEmojis(req.user.id);
  res.json({ emojis });
});

// DELETE /api/emoji/custom/:id - Delete custom sticker
router.delete('/custom/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id);
  const result = deleteCustomEmoji(id, req.user.id);
  if (result) {
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Sticker not found or not yours' });
  }
});

export default router;
