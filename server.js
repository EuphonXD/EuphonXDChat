import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './src/routes/auth.js';
import roomRoutes from './src/routes/rooms.js';
import messageRoutes from './src/routes/messages.js';
import { setupSocket } from './src/socket.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

const app = express();
const httpServer = createServer(app);

// CORS
app.use(cors());

// Body parsing
app.use(express.json({ limit: '5mb' }));

// ── API Routes ──
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/messages', messageRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Serve static frontend if built ──
const clientDist = path.join(__dirname, 'client', 'dist');
app.use(express.static(clientDist));
// SPA fallback
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/socket.io')) {
    res.sendFile(path.join(clientDist, 'index.html'), (err) => {
      if (err) res.status(404).json({ error: 'Not found' });
    });
  }
});

// ── Socket.IO ──
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});
setupSocket(io);

// ── Start ──
httpServer.listen(PORT, () => {
  console.log(`WebChat server running on port ${PORT}`);
});
