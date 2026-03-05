// src/index.js — AgileOps API Server
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const pool    = require('./db/pool');

const app  = express();
const PORT = process.env.PORT || 4000;

// ─── Middleware ───────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json());

// Log every request in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// ─── Health check ─────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', time: new Date() });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

// ─── Root (so opening API URL in browser doesn’t 404) ───────────
app.get('/', (_req, res) => {
  res.json({
    name: 'AgileOps API',
    docs: 'Open the frontend app URL in your browser, not this API URL.',
    health: '/health',
    routes: ['/api/team-members', '/api/projects', '/api/sprints', '/api/items', '/api/labels', '/api/activity'],
  });
});

app.get('/api', (_req, res) => {
  res.json({ routes: ['/api/team-members', '/api/projects', '/api/sprints', '/api/items', '/api/labels', '/api/activity'] });
});

// ─── Routes ───────────────────────────────────────────────────
app.use('/api/team-members', require('./routes/teamMembers'));
app.use('/api/projects',     require('./routes/projects'));
app.use('/api/sprints',      require('./routes/sprints'));
app.use('/api/items',        require('./routes/items'));
app.use('/api/labels',       require('./routes/labels'));
app.use('/api/activity',     require('./routes/activity'));

// ─── 404 / Error handlers ─────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ─── Start ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 AgileOps API running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health\n`);
});
