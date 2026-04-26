require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const analyticsRoutes = require('./routes/analyticsRoutes');
const alertsRoutes    = require('./routes/alertsRoutes');
const sensorRoutes    = require('./routes/sensorRoutes');
const chatRoutes      = require('./routes/chatRoutes');

const app  = express();
const PORT = process.env.PORT || 5001;

// ── Middleware ─────────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST'],
}));
app.use(express.json());

// ── Request logger (helpful during development) ────────────────
app.use((req, _, next) => {
  console.log(`${new Date().toLocaleTimeString()}  ${req.method}  ${req.path}`);
  next();
});

// ── Routes ─────────────────────────────────────────────────────
app.use('/api/analytics', analyticsRoutes);
app.use('/api/alerts',    alertsRoutes);
app.use('/api/sensors',   sensorRoutes);
app.use('/api/chat',      chatRoutes);

// ── Health check ───────────────────────────────────────────────
app.get('/api/health', (_, res) => {
  res.json({
    status:    'ok',
    timestamp: new Date().toISOString(),
    model:     process.env.OLLAMA_MODEL || 'llama3.2',
  });
});

// ── 404 handler ────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// ── Global error handler ───────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ──────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n AWG Server running on http://localhost:${PORT}`);
  console.log(` Gemini model : ${process.env.GOOGLE_API_KEY ? 'gemini-2.0-flash ✓' : 'NO API KEY SET ✗'}`);
  console.log(` Endpoints:`);
  console.log(`   GET  /api/analytics/*`);
  console.log(`   GET  /api/alerts/*`);
  console.log(`   GET  /api/sensors/*`);
  console.log(`   POST /api/chat`);
  console.log(`   GET  /api/health\n`);
});