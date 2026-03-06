require('dotenv').config();

const dbUrl = process.env.DATABASE_URL || '';
const isLocalDb = /@(localhost|127\.0\.0\.1)(:\d+)?\//.test(dbUrl);
if (!isLocalDb && dbUrl.trim()) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 4000;

if (!dbUrl.trim()) {
  console.warn('⚠️  DATABASE_URL is not set. Create backend/.env with DATABASE_URL=postgresql://user:pass@host:5432/dbname');
}

function stripSslModeFromUrl(url) {
  if (!url || typeof url !== 'string') return url;
  return url
    .replace(/[?&]sslmode=[^&]+/gi, '')
    .replace(/[?&]sslrootcert=[^&]+/gi, '')
    .replace(/[?&]ssl=[^&]+/gi, '')
    .replace(/\?&/, '?')
    .replace(/\?$/, '');
}

const connectionString = stripSslModeFromUrl(process.env.DATABASE_URL);
const poolConfig = { connectionString };
if (!isLocalDb && dbUrl.trim()) {
  poolConfig.ssl = { rejectUnauthorized: false };
}
const pool = new Pool(poolConfig);
module.exports.pool = pool;

let schemaEnsured = false;

async function ensureSchema() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'scripts', 'schema.sql'), 'utf8');
    await pool.query(sql);
    // Only ensure one workspace exists so the app has somewhere to start (no projects/sprints)
    await pool.query(
      `INSERT INTO workspaces (name, slug) SELECT 'My Team', 'my-team' WHERE NOT EXISTS (SELECT 1 FROM workspaces LIMIT 1)`
    );
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
app.use('/api/workspaces',   require('./routes/workspaces'));
app.use('/api/items',        require('./routes/items'));
app.use('/api/sprints',      require('./routes/sprints'));
app.use('/api/projects',     require('./routes/projects'));
app.use('/api/crew',         require('./routes/crew'));
app.use('/api/log',          require('./routes/log'));
app.use('/api/trackers',     require('./routes/trackers'));
app.use('/api/custom-fields',require('./routes/customFields'));
app.use('/api/voice',        require('./routes/voice'));
app.use('/api/columns',      require('./routes/columns'));

// ── Health Check (both /api/health and /health for platform checks) ─
const healthHandler = async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', schema: schemaEnsured, time: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ status: 'error', db: 'disconnected', message: e.message });
  }
};
app.get('/api/health', healthHandler);
app.get('/health', healthHandler);

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
