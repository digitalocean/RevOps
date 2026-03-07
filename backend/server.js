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
    schemaEnsured = true;
    console.log('To-DO schema ensured.');
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
// Trust first proxy (e.g. DigitalOcean App Platform) so req.secure and req.ip are correct; required for cookies.
app.set('trust proxy', 1);

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? true
    : (process.env.FRONTEND_URL || 'http://localhost:5173'),
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Session & Auth (must be before routes that use req.user) ─
const session = require('express-session');
const pgSession = require('connect-pg-simple');
const authRoutes = require('./routes/auth');

const PgStore = pgSession(session);
const sessionStore = new PgStore({ pool, createTableIfMissing: true, tableName: 'session' });

app.use(
  session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'todo-dev-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    name: 'todo.sid',
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
    },
  })
);
app.use(authRoutes.passport.initialize());
app.use(authRoutes.passport.session());

app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);

// ── Routes ───────────────────────────────────────────────
// Mount with /api prefix (local dev, or when platform does not trim path)
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
app.use('/api/activity',     require('./routes/activity'));
app.use('/api',              require('./routes/analytics'));   // GET /api/projects/:id/analytics
app.use('/api',              require('./routes/fieldValues')); // GET/PATCH /api/tasks/:id/field-values
app.use('/api',              require('./routes/savedViews'));  // GET/POST /api/projects/:id/views, PATCH/DELETE /api/views/:id

// Mount without /api prefix (DigitalOcean App Platform trims /api before forwarding to the service)
const workspaces = require('./routes/workspaces');
const items = require('./routes/items');
const sprints = require('./routes/sprints');
const projects = require('./routes/projects');
const crew = require('./routes/crew');
const log = require('./routes/log');
const trackers = require('./routes/trackers');
const customFields = require('./routes/customFields');
const voice = require('./routes/voice');
const columns = require('./routes/columns');
const activity = require('./routes/activity');
app.use('/workspaces', workspaces);
app.use('/items', items);
app.use('/sprints', sprints);
app.use('/projects', projects);
app.use('/crew', crew);
app.use('/log', log);
app.use('/trackers', trackers);
app.use('/custom-fields', customFields);
app.use('/voice', voice);
app.use('/columns', columns);
app.use('/activity', activity);
app.use('/', require('./routes/analytics'));
app.use('/', require('./routes/fieldValues'));
app.use('/', require('./routes/savedViews'));

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
const dbEnsureHandler = async (req, res) => {
  try {
    const ok = await ensureSchema();
    res.json({ ok, schema: schemaEnsured });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};
app.get('/api/db/ensure', dbEnsureHandler);
app.get('/db/ensure', dbEnsureHandler);

// ── Start: listen first, then ensure schema (with retry) ─
app.listen(PORT, () => {
  console.log(`\nTo-DO API running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
  runSchemaWithRetry();
});
