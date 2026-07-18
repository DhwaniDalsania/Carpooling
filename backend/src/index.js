// src/index.js
// Express app entry point — mounts all API routes and Socket.io namespaces.

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// ── Socket.io setup ───────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: '*' }, // Tighten in production
});

// /tracking namespace — GPS location broadcasts during a live trip
const trackingNs = io.of('/tracking');
app.set('trackingNs', trackingNs);

trackingNs.on('connection', (socket) => {
  console.log('[/tracking] client connected:', socket.id);

  // Driver emits: { tripId, lat, lng }
  socket.on('location:update', (data) => {
    // Broadcast to all passengers watching this trip
    socket.to(`trip:${data.tripId}`).emit('location:update', data);
  });

  socket.on('join:trip', (tripId) => {
    socket.join(`trip:${tripId}`);
    console.log(`[/tracking] ${socket.id} joined trip:${tripId}`);
  });

  socket.on('disconnect', () => {
    console.log('[/tracking] client disconnected:', socket.id);
  });
});

// /chat namespace — in-trip messages
const chatNs = io.of('/chat');
chatNs.on('connection', (socket) => {
  console.log('[/chat] client connected:', socket.id);

  socket.on('join:trip', (tripId) => {
    socket.join(`trip:${tripId}`);
  });

  // message payload: { tripId, senderId, text }
  socket.on('message:send', async (data) => {
    try {
      const { prisma, withRetry } = require('./lib/prisma');
      const savedMsg = await withRetry(() =>
        prisma.message.create({
          data: {
            tripId: data.tripId,
            senderId: data.senderId,
            text: data.text
          },
          include: {
            sender: {
              select: { id: true, name: true, photoUrl: true }
            }
          }
        })
      );
      chatNs.to(`trip:${data.tripId}`).emit('message:new', savedMsg);
      chatNs.to(`trip:${data.tripId}`).emit('message:receive', savedMsg);
    } catch (err) {
      console.error('[Socket Chat Save Error]', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('[/chat] client disconnected:', socket.id);
  });
});

// ── Global middleware ─────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '5mb' })); // 5mb for base64 photoUrl uploads

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));
app.use('/api/rides', require('./routes/rides'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/trips', require('./routes/trips'));
app.use('/api/vehicles', require('./routes/vehicles'));
app.use('/api/routes', require('./routes/routes'));

// Placeholder routers — to be implemented in subsequent tasks
// app.use('/api/wallet',   require('./routes/wallet'));
// app.use('/api/payments', require('./routes/payments'));
// app.use('/api/reports',  require('./routes/reports'));

// ── 404 catch-all ─────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ message: 'Route not found' }));

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Backend running at http://localhost:${PORT}`);
  console.log(`   Socket.io: /tracking and /chat namespaces ready`);
});
