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

/**
 * Normalize a raw emoji JSON into { categories: { name: stickers[] } }
 * where each sticker is { name, url }.
 */
function normalizePack(data) {
  const categories = {};

  if (!data || typeof data !== 'object') return categories;

  for (const [key, value] of Object.entries(data)) {
    if (!value || typeof value !== 'object') continue;

    // Format: { type, container: [{ text, icon }] }
    if (Array.isArray(value.container)) {
      categories[key] = value.container.map(item => ({
        name: item.text || '',
        url: extractImgSrc(item.icon || item.url || ''),
      }));
    }
    // Fallback: plain array of items
    else if (Array.isArray(value)) {
      categories[key] = value.map(item => ({
        name: item.text || item.name || '',
        url: extractImgSrc(item.icon || item.url || ''),
      }));
    }
  }
  return categories;
}

/** Extract src from an HTML <img> tag or return the string if it's already a URL. */
function extractImgSrc(str) {
  if (!str) return '';
  const match = str.match(/src=['"]([^'"]+)['"]/i);
  return match ? match[1] : str;
}

// ── Routes ──

// GET /api/emoji/packs - List all built-in packs with category info
router.get('/packs', (req, res) => {
  const files = getPackFiles();
  const packs = files.map(filename => {
    const data = readPack(filename);
    const name = filename.replace('.json', '');
    const categories = normalizePack(data);
    let stickerCount = 0;
    for (const stickers of Object.values(categories)) {
      stickerCount += stickers.length;
    }
    return {
      name,
      filename,
      categories: Object.keys(categories),
      stickerCount,
    };
  });
  res.json({ packs });
});

// GET /api/emoji/packs/:packName - Get stickers in a specific pack
router.get('/packs/:packName', (req, res) => {
  const { packName } = req.params;
  const filename = `${packName}.json`;
  const data = readPack(filename);
  if (!data) {
    return res.status(404).json({ error: 'Pack not found' });
  }

  const categories = normalizePack(data);
  res.json({ pack: packName, categories });
});

// POST /api/emoji/custom - Upload custom sticker (auth required)
router.post('/custom', authMiddleware, (req, res) => {
  try {
    const { name, url } = req.body;
    if (!name || !url) {
      return res.status(400).json({ error: 'name and url are required' });
    }
    const emoji = saveCustomEmoji(req.user.id, name, url);
    res.status(201).json({ emoji });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/emoji/custom - Get user's custom stickers (auth required)
router.get('/custom', authMiddleware, (req, res) => {
  const emojis = getCustomEmojis(req.user.id);
  res.json({ emojis });
});

// DELETE /api/emoji/custom/:id - Delete custom sticker (auth required)
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
