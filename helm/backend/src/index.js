require('dotenv').config();

const dbUrl = process.env.DATABASE_URL || '';
if (dbUrl && !/@(localhost|127\.0\.0\.1)(:\d+)?\//.test(dbUrl)) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const pool = require('./db/pool');

async function ensureSchema() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'db', 'schema.sql'), 'utf8');
    await pool.query(sql);
    console.log('Helm schema ensured.');
  } catch (err) {
    console.error('Schema init failed:', err.message);
    process.exit(1);
  }
}

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

const team = require('./routes/team');
const workspaces = require('./routes/workspaces');
const projects = require('./routes/projects');
const sprints = require('./routes/sprints');
const items = require('./routes/items');
const trackers = require('./routes/trackers');
const trackerRows = require('./routes/trackerRows');
const log = require('./routes/log');
const voice = require('./routes/voice');

app.use('/api/team', team);
app.use('/api/workspaces', workspaces);
app.use('/api/projects', projects);
app.use('/api/sprints', sprints);
app.use('/api', items);
app.use('/api/trackers', trackers);
app.use('/api/tracker-rows', trackerRows);
app.use('/api', log);
app.use('/api/voice', voice);

app.use((req, res) => res.status(404).json({ error: 'Route not found', path: req.method + ' ' + req.path }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

ensureSchema().then(() => {
  app.listen(PORT, () => console.log(`Helm API http://localhost:${PORT}`));
}).catch((e) => { console.error(e); process.exit(1); });