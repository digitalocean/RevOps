
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

const { applySchema } = require('./lib/applySchema');

async function ensureSchema() {
  try {
    await applySchema(pool);
    schemaEnsured = true;
    console.log('To-DO schema ensured.');
    return true;
  } catch (err) {
    console.error('Schema init failed (server still running):', err.message);
    return false;
  }
}

/** Apply schema before accepting traffic (avoids SAML hitting DB before `users` exists). */
async function waitForSchemaBeforeListen() {
  const maxAttempts = 15;
  const delayMs = 2000;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (await ensureSchema()) {
      if (attempt > 1) console.log(`To-DO schema OK on attempt ${attempt}.`);
      return;
    }
    console.warn(`Schema attempt ${attempt}/${maxAttempts} failed; retry in ${delayMs}ms...`);
    await new Promise((r) => setTimeout(r, delayMs));
  }
  console.error(
    'CRITICAL: schema.sql did not apply. From backend/: DATABASE_URL=... NODE_ENV=production node scripts/init-db.js — or GET /api/db/ensure (see docs/DEPLOY-DB-SCHEMA.md).'
  );
}

// ── Middleware ───────────────────────────────────────────
// Trust first proxy (e.g. DigitalOcean App Platform) so req.secure and req.ip are correct; required for cookies.
app.set('trust proxy', 1);

// Log auth/okta requests so we can see if callback reaches this app (if 404 and no log, request went to wrong component)
app.use((req, res, next) => {
  const p = (req.path || req.url || '').split('?')[0];
  if (p.includes('auth') || p.includes('okta') || p.includes('saml')) {
    console.log('[Auth] request reached API', { method: req.method, path: req.path, url: req.url, originalUrl: req.originalUrl });
  }
  next();
});

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? true
    : (process.env.FRONTEND_URL || 'http://localhost:5173'),
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
// SAML ACS POST sends large base64 SAMLResponse; default 100kb is too small
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ── Session & Auth (must be before routes that use req.user) ─
const session = require('express-session');
const pgSession = require('connect-pg-simple');
const authRoutes = require('./routes/auth');

const PgStore = pgSession(session);
const sessionStore = new PgStore({ pool, createTableIfMissing: true, tableName: 'session' });

// SAML ACS is a cross-site POST from the IdP; SameSite=Lax would drop the session cookie. Use None+Secure when SAML metadata is configured.
const samlMetadataConfigured = !!(
  process.env.SAML_IDP_METADATA_URL ||
  process.env.SAML_IDP_METADATA_FILE ||
  (process.env.SAML_IDP_METADATA_XML && String(process.env.SAML_IDP_METADATA_XML).trim().length > 80)
);

// Session: long-lived so refresh doesn't log out; resave so activity extends session
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const sessionSecure = process.env.NODE_ENV === 'production';
const sessionSameSite =
  process.env.SESSION_SAME_SITE === 'none'
    ? 'none'
    : process.env.SESSION_SAME_SITE === 'lax'
      ? 'lax'
      : samlMetadataConfigured && sessionSecure
        ? 'none'
        : 'lax';
app.use(
  session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'todo-dev-secret-change-in-production',
    resave: true,
    saveUninitialized: false,
    name: 'todo.sid',
    cookie: {
      maxAge: SESSION_MAX_AGE_MS,
      sameSite: sessionSameSite,
      secure: sessionSameSite === 'none' ? true : sessionSecure,
      httpOnly: true,
      path: '/',
    },
  })
);
if (samlMetadataConfigured) {
  console.log('[SAML] Session cookie sameSite=%s (needed for IdP POST to ACS)', sessionSameSite);
}
app.use(authRoutes.passport.initialize());
app.use(authRoutes.passport.session());

// Okta callback — run for every request; match by path or by URL containing okta+callback (platform may trim or rewrite path)
if (authRoutes.oktaCallback) {
  app.use((req, res, next) => {
    const raw = req.path != null ? req.path : (req.url ? req.url.split('?')[0] : '');
    const pathname = (raw || '/').replace(/\/+$/, '').replace(/^\/+/, '') || '';
    const fullUrl = req.originalUrl || req.url || '';
    const isOktaCb = pathname === 'okta-cb' || pathname === 'api/okta-cb';
    const isOktaCallback = pathname.endsWith('okta/callback') || pathname === 'okta/callback';
    const urlHasOktaCallback = fullUrl.includes('okta') && fullUrl.split('?')[0].includes('callback');
    const looksLikeCallback = (isOktaCb || isOktaCallback || urlHasOktaCallback) && (req.method === 'GET' || req.method === 'POST');
    if (looksLikeCallback) {
      console.log('[Okta] callback route matched', { method: req.method, path: req.path, pathname, originalUrl: req.originalUrl });
      return authRoutes.oktaCallback(req, res, next);
    }
    next();
  });
}

if (authRoutes.samlCallback) {
  app.use((req, res, next) => {
    const raw = req.path != null ? req.path : (req.url ? req.url.split('?')[0] : '');
    const pathname = (raw || '/').replace(/\/+$/, '').replace(/^\/+/, '') || '';
    const fullUrl = req.originalUrl || req.url || '';
    const isSamlAcs =
      pathname.endsWith('saml/callback') ||
      pathname === 'saml/callback' ||
      (fullUrl.includes('saml') && fullUrl.includes('callback') && req.method === 'POST');
    if (isSamlAcs && req.method === 'POST') {
      console.log('[SAML] ACS route matched', { method: req.method, path: req.path, pathname, originalUrl: req.originalUrl });
      return authRoutes.samlCallback(req, res, next);
    }
    next();
  });
}

app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);

// ── Routes ───────────────────────────────────────────────
// Mount with /api prefix (local dev, or when platform does not trim path)
app.use('/api/workspaces',   require('./routes/workspaces'));
const itemsRouter = require('./routes/items');
require('./routes/comments').mountItemChildRoutes(itemsRouter);
app.use('/api/items',        itemsRouter);
app.use('/api/sprints',      require('./routes/sprints'));
app.use('/api/projects',     require('./routes/projects'));
app.use('/api/crew',         require('./routes/crew'));
app.use('/api/log',          require('./routes/log'));
app.use('/api/trackers',     require('./routes/trackers'));
app.use('/api/custom-fields',require('./routes/customFields'));
app.use('/api/standard-fields', require('./routes/standardFields'));
app.use('/api/voice',        require('./routes/voice'));
app.use('/api/columns',      require('./routes/columns'));
app.use('/api/activity',     require('./routes/activity'));
app.use('/api',              require('./routes/comments'));   // GET/POST /api/items/:id/comments, /api/comments/:id
app.use('/api/notifications', require('./routes/notifications'));  // GET/PATCH /api/notifications
app.use('/api',              require('./routes/timeLogs'));        // GET/POST /api/items/:id/time-logs
app.use('/api/templates',    require('./routes/templates'));       // GET /api/templates
app.use('/api',              require('./routes/templates'));       // POST /api/projects/:id/apply-template
app.use('/api',              require('./routes/analytics'));   // GET /api/projects/:id/analytics
app.use('/api',              require('./routes/audit'));       // GET /api/projects/:id/audit
app.use('/api',              require('./routes/fieldValues')); // GET/PATCH /api/tasks/:id/field-values
app.use('/api',              require('./routes/savedViews'));  // GET/POST /api/projects/:id/views, PATCH/DELETE /api/views/:id

// Mount without /api prefix (DigitalOcean App Platform trims /api before forwarding to the service)
const workspaces = require('./routes/workspaces');
const items = itemsRouter;
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
app.use('/standard-fields', require('./routes/standardFields'));
app.use('/voice', voice);
app.use('/columns', columns);
app.use('/activity', activity);
app.use('/templates', require('./routes/templates'));
app.use('/', require('./routes/comments'));
app.use('/notifications', require('./routes/notifications'));
app.use('/', require('./routes/timeLogs'));
app.use('/', require('./routes/analytics'));
app.use('/', require('./routes/audit'));
app.use('/', require('./routes/fieldValues'));
app.use('/', require('./routes/savedViews'));

// ── Health Check (both /api/health and /health for platform checks) ─
const healthHandler = async (req, res) => {
  try {
    await pool.query({ name: 'health_check', text: 'SELECT 1', values: [] });
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

// ── Optional: serve frontend from this process (single-component deploy; no /api routing needed)
const staticDir = path.join(__dirname, 'public');
if (process.env.SERVE_STATIC === 'true' && fs.existsSync(staticDir)) {
  app.use(express.static(staticDir, { index: false }));
  app.get('*', (req, res) => {
    res.sendFile(path.join(staticDir, 'index.html'));
  });
  console.log('Serving static frontend from public/ (SERVE_STATIC=true)');
}

// ── Global error handler (catches passport and other errors that would silently 404) ─
app.use((err, req, res, _next) => {
  console.error('Express error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    path: req.originalUrl,
    method: req.method,
  });
});

// ── WebSocket for real-time collaboration ─
const http = require('http');
const { WebSocketServer } = require('ws');
const httpServer = http.createServer(app);
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
const wsClients = new Set();
wss.on('connection', (ws) => {
  wsClients.add(ws);
  ws.on('close', () => wsClients.delete(ws));
  ws.on('error', () => wsClients.delete(ws));
});
app.locals.broadcast = (payload) => {
  const msg = JSON.stringify(payload);
  for (const client of wsClients) {
    try { if (client.readyState === 1) client.send(msg); } catch (_) {}
  }
};

// ── Start: ensure schema first, then listen (SAML/login need `users` table) ─
(async () => {
  await waitForSchemaBeforeListen();
  httpServer.listen(PORT, () => {
    console.log(`\nTo-DO API running on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health`);
    console.log(`   WS:     ws://localhost:${PORT}/ws\n`);
  });
})();
