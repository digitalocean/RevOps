require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 4000;

// ── DB Pool ──────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});
module.exports.pool = pool;

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
    res.json({ status: 'ok', db: 'connected', time: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ status: 'error', db: 'disconnected', message: e.message });
  }
});

// ── Start ─────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🏔  Meridian API running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
});
