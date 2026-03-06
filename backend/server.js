require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 4000;

const dbUrl = process.env.DATABASE_URL || '';
const isRemoteDb = dbUrl && !/@(localhost|127\.0\.0\.1)(:\d+)?\//.test(dbUrl);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' || isRemoteDb || /sslmode=/.test(dbUrl)
    ? { rejectUnauthorized: false }
    : false,
});
module.exports.pool = pool;

let schemaEnsured = false;

async function ensureSchema() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'scripts', 'schema.sql'), 'utf8');
    await pool.query(sql);
    // One default workspace + project + sprint (no seed data beyond structure)
    const { rows: ws } = await pool.query(
      `INSERT INTO workspaces (name, slug) SELECT 'Default', 'default' WHERE NOT EXISTS (SELECT 1 FROM workspaces LIMIT 1) RETURNING id`
    );
    let wid = ws.length ? ws[0].id : null;
    if (!wid) {
      const r = await pool.query('SELECT id FROM workspaces LIMIT 1');
      wid = r.rows[0]?.id;
    }
    if (wid) {
      await pool.query(
        `INSERT INTO projects (workspace_id, name, description) SELECT $1, 'My Campaign', 'First campaign' WHERE NOT EXISTS (SELECT 1 FROM projects LIMIT 1)`,
        [wid]
      );
      const { rows: proj } = await pool.query('SELECT id FROM projects LIMIT 1');
      if (proj.length) {
        const pid = proj[0].id;
        const defaultCols = [
          { name: 'Base Camp', slug: 'backlog', color: '#3d4a63', is_done: false },
          { name: 'Summit Ready', slug: 'summit', color: '#3d9be9', is_done: false },
          { name: 'In Ascent', slug: 'ascent', color: '#f59e0b', is_done: false },
          { name: 'At Base Camp', slug: 'basecamp', color: '#9b7dff', is_done: false },
          { name: 'Peak Reached', slug: 'peak', color: '#00c9a7', is_done: true },
        ];
        const { rowCount: colCount } = await pool.query('SELECT 1 FROM board_columns WHERE project_id = $1 LIMIT 1', [pid]);
        if (colCount === 0) {
          for (let i = 0; i < defaultCols.length; i++) {
            const c = defaultCols[i];
            await pool.query(
              'INSERT INTO board_columns (project_id, name, slug, color, sort_order, is_done) VALUES ($1,$2,$3,$4,$5,$6)',
              [pid, c.name, c.slug, c.color, i, c.is_done]
            );
          }
        }
        await pool.query(
          `INSERT INTO sprints (project_id, name, goal, status) SELECT $1, 'Sprint 1', 'First expedition', 'active' WHERE NOT EXISTS (SELECT 1 FROM sprints LIMIT 1)`,
          [pid]
        );
      }
    }
    schemaEnsured = true;
    console.log('🏔  Meridian schema ensured.');
    return true;
  } catch (err) {
    console.error('Schema init failed (server still running):', err.message);
    return false;
  }
}

function runSchemaWithRetry() {
  ensureSchema().then((ok) => {
    if (ok) return;
    setTimeout(() => ensureSchema().then((ok2) => {
      if (ok2) return;
      setTimeout(() => ensureSchema(), 5000);
    }), 2000);
  });
}

// ── Middleware ───────────────────────────────────────────
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    /\.ondigitalocean\.app$/,
    /\.onrender\.com$/,
  ],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ───────────────────────────────────────────────
app.use('/api/items',        require('./routes/items'));
app.use('/api/sprints',      require('./routes/sprints'));
app.use('/api/projects',     require('./routes/projects'));
app.use('/api/crew',         require('./routes/crew'));
app.use('/api/log',          require('./routes/log'));
app.use('/api/trackers',     require('./routes/trackers'));
app.use('/api/custom-fields',require('./routes/customFields'));
app.use('/api/voice',        require('./routes/voice'));
app.use('/api/columns',      require('./routes/columns'));

// ── Health Check ─────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', schema: schemaEnsured, time: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ status: 'error', db: 'disconnected', message: e.message });
  }
});

// ── Optional: trigger schema ensure (e.g. if DB was not ready at startup) ─
app.get('/api/db/ensure', async (req, res) => {
  try {
    const ok = await ensureSchema();
    res.json({ ok, schema: schemaEnsured });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── Start: listen first, then ensure schema (with retry) ─
app.listen(PORT, () => {
  console.log(`\n🏔  Meridian API running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
  runSchemaWithRetry();
});
