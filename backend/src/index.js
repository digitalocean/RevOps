// src/index.js — AgileOps API Server
require('dotenv').config();

// Allow self-signed certs for managed DBs (e.g. DigitalOcean) when using SSL
const dbUrl = process.env.DATABASE_URL || '';
const isRemoteDb = dbUrl && !/@(localhost|127\.0\.0\.1)(:\d+)?\//.test(dbUrl);
if (isRemoteDb || dbUrl.includes('ondigitalocean.com') || /sslmode=/.test(dbUrl) || dbUrl.includes(':25060/')) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const fs   = require('fs');
const path = require('path');
const express = require('express');
const cors    = require('cors');
const pool    = require('./db/pool');

async function ensureSchema() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'db', 'schema.sql'), 'utf8');
    await pool.query(sql);
    console.log('Schema ensured (tables exist)');
  } catch (err) {
    console.error('Schema init failed:', err.message);
    process.exit(1);
  }
}

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
    routes: ['/api/team-members', '/api/roles', '/api/projects', '/api/sprints', '/api/items', '/api/labels', '/api/activity'],
  });
});

app.get('/api', (_req, res) => {
  res.json({ routes: ['/api/team-members', '/api/roles', '/api/projects', '/api/sprints', '/api/items', '/api/labels', '/api/activity'] });
});

// ─── Admin: delete all data (optional; set RESET_SECRET in env to enable) ───
app.post('/api/admin/reset', async (req, res) => {
  const secret = process.env.RESET_SECRET;
  if (!secret || req.headers['x-reset-secret'] !== secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const sql = fs.readFileSync(path.join(__dirname, 'db', 'reset.sql'), 'utf8');
  try {
    await pool.query(sql);
    res.json({ ok: true, message: 'All data deleted. Create projects and team from the app UI.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Routes ───────────────────────────────────────────────────
const teamMembers = require('./routes/teamMembers');
const roles       = require('./routes/roles');
const projects    = require('./routes/projects');
const sprints     = require('./routes/sprints');
const items       = require('./routes/items');
const labels      = require('./routes/labels');
const activity    = require('./routes/activity');

app.use('/api/team-members', teamMembers);
app.use('/api/roles',        roles);
app.use('/api/projects',     projects);
app.use('/api/sprints',      sprints);
app.use('/api/items',        items);
app.use('/api/labels',       labels);
app.use('/api/activity',     activity);

// If proxy strips /api prefix, also mount at root
app.use('/team-members', teamMembers);
app.use('/roles',        roles);
app.use('/projects',     projects);
app.use('/sprints',      sprints);
app.use('/items',        items);
app.use('/labels',       labels);
app.use('/activity',     activity);

// ─── 404 / Error handlers ─────────────────────────────────────
app.use((req, res) => res.status(404).json({
  error: 'Route not found',
  path: req.method + ' ' + req.path,
  hint: 'Use /api/projects, /api/sprints, /api/items etc. Or ensure VITE_API_URL points to this server.',
}));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ─── Start: ensure DB schema then listen ───────────────────────
ensureSchema().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 AgileOps API running on http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health\n`);
  });
}).catch((err) => {
  console.error('Startup failed:', err);
  process.exit(1);
});
