
const router = require('express').Router();
const passport = require('passport');
const bcrypt = require('bcrypt');
const { pool } = require('../server');

const OAuth2Strategy = require('passport-oauth2').Strategy;
const SALT_ROUNDS = 10;

// Subclass so Okta authorize URL includes response_mode=form_post (Okta POSTs to callback; avoids query-string 404s)
class OktaOAuth2Strategy extends OAuth2Strategy {
  authorizationParams(options) {
    const params = typeof super.authorizationParams === 'function' ? super.authorizationParams(options) : {};
    return Object.assign({}, params, { response_mode: 'form_post' });
  }
}

const frontendUrl = () => {
  const u = process.env.FRONTEND_URL || process.env.VITE_API_URL || 'http://localhost:5173';
  return String(u).replace(/\/$/, '');
};

const apiBase = () => {
  if (process.env.NODE_ENV === 'production' && process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, '');
  }
  return process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 4000}`;
};

// Okta OIDC (OAuth2 authorization code + userinfo) — only SSO provider
if (process.env.OKTA_CLIENT_ID && process.env.OKTA_CLIENT_SECRET && process.env.OKTA_ISSUER) {
  const oktaIssuer = process.env.OKTA_ISSUER.replace(/\/$/, '');
  passport.use(
    'okta',
    new OktaOAuth2Strategy(
      {
        authorizationURL: `${oktaIssuer}/v1/authorize`,
        tokenURL: `${oktaIssuer}/v1/token`,
        clientID: process.env.OKTA_CLIENT_ID,
        clientSecret: process.env.OKTA_CLIENT_SECRET,
        callbackURL: `${apiBase()}/api/okta-cb`,
        scope: ['openid', 'profile', 'email'],
        state: true,
        customHeaders: {},
      },
      async (accessToken, refreshToken, params, profile, done) => {
        try {
          const res = await fetch(`${oktaIssuer}/v1/userinfo`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (!res.ok) {
            return done(new Error('Okta userinfo failed'), null);
          }
          const userinfo = await res.json();
          const oktaSub = userinfo.sub;
          const email = (userinfo.email || userinfo.preferred_username || `${oktaSub}@okta`).toLowerCase().trim();
          const name = userinfo.name || [userinfo.given_name, userinfo.family_name].filter(Boolean).join(' ') || email.split('@')[0];

          const existing = await pool.query({
            name: 'auth_okta_find_user',
            text: 'SELECT id, email, name, avatar_url FROM users WHERE okta_id = $1 OR email = $2 LIMIT 1',
            values: [oktaSub, email],
          });

          let user;
          if (existing.rows.length) {
            await pool.query({
              name: 'auth_okta_update_user',
              text: 'UPDATE users SET name = $1, okta_id = $2 WHERE id = $3',
              values: [name, oktaSub, existing.rows[0].id],
            });
            user = { id: existing.rows[0].id, email, name, avatar_url: existing.rows[0].avatar_url };
          } else {
            const insert = await pool.query({
              name: 'auth_okta_insert_user',
              text: 'INSERT INTO users (email, name, okta_id) VALUES ($1, $2, $3) RETURNING id, email, name, avatar_url',
              values: [email, name, oktaSub],
            });
            user = insert.rows[0];
          }
          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
}

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// Register (email + password)
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body || {};
    if (!email || !password || !String(email).trim()) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const emailTrim = String(email).trim().toLowerCase();
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const hash = await bcrypt.hash(String(password), SALT_ROUNDS);
    const { rows } = await pool.query({
      name: 'auth_register_insert',
      text: 'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id, email, name',
      values: [emailTrim, (name && String(name).trim()) || emailTrim.split('@')[0], hash],
    });
    const user = rows[0];
    req.login({ id: user.id, email: user.email, name: user.name, avatar_url: null }, (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ user: { id: user.id, email: user.email, name: user.name, initials: (user.name || user.email).slice(0, 2).toUpperCase() } });
    });
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ error: 'Email already registered' });
    res.status(500).json({ error: e.message });
  }
});

// Login (email + password)
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const emailTrim = String(email).trim().toLowerCase();
    const { rows } = await pool.query({
      name: 'auth_login_find',
      text: 'SELECT id, email, name, avatar_url, password_hash FROM users WHERE email = $1',
      values: [emailTrim],
    });
    if (!rows.length) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const user = rows[0];
    if (!user.password_hash) {
      return res.status(401).json({ error: 'Account uses Okta SSO. Use Sign in with Okta.' });
    }
    const ok = await bcrypt.compare(String(password), user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });
    req.login({ id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url }, (err) => {
      if (err) return next(err);
      const initials = (user.name || user.email || '').slice(0, 2).toUpperCase();
      res.json({ user: { id: user.id, email: user.email, name: user.name, initials } });
    });
  } catch (e) {
    next(e);
  }
});

// Ping to verify auth routes are reachable (GET /api/auth/ping or /auth/ping)
router.get('/ping', (req, res) => {
  res.json({ ok: 'auth', path: req.path, okta: !!(process.env.OKTA_CLIENT_ID && process.env.OKTA_CLIENT_SECRET && process.env.OKTA_ISSUER) });
});

// Auth providers (Okta OIDC only; frontend shows "Sign in with Okta" when okta is true)
router.get('/providers', (req, res) => {
  res.json({
    okta: !!(process.env.OKTA_CLIENT_ID && process.env.OKTA_CLIENT_SECRET && process.env.OKTA_ISSUER),
  });
});

// Current user (from session)
router.get('/me', (req, res) => {
  if (req.user) {
    const u = req.user;
    const initials = u.name
      ? u.name.split(/\s+/).map((n) => n[0]).join('').slice(0, 2).toUpperCase()
      : (u.email || '').slice(0, 2).toUpperCase();
    return res.json({
      user: {
        id: u.id,
        email: u.email,
        name: u.name,
        avatar_url: u.avatar_url,
        initials: initials || 'U',
      },
    });
  }
  res.json({ user: null });
});

// Logout
router.post('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.json({ ok: true });
    });
  });
});

// ── Diagnostic: shows exactly what passport would do without actually redirecting ──
router.get('/okta/debug', (req, res) => {
  const hasStrategy = !!(passport._strategies && passport._strategies.okta);
  const issuer = process.env.OKTA_ISSUER || '(not set)';
  const clientId = process.env.OKTA_CLIENT_ID ? `${process.env.OKTA_CLIENT_ID.slice(0, 6)}...` : '(not set)';
  const appUrl = apiBase();
  const callbackURL = `${appUrl}/api/okta-cb`;
  const authorizationURL = `${issuer.replace(/\/$/, '')}/v1/authorize`;
  res.json({
    ok: 'okta-debug',
    hasStrategy,
    issuer,
    clientId,
    appUrl,
    callbackURL,
    authorizationURL,
    sessionID: req.sessionID || '(none)',
    sessionExists: !!req.session,
    env: process.env.NODE_ENV || '(not set)',
  });
});

// Start Okta OIDC — use form_post so Okta POSTs to callback (no query string), avoiding 404 on some hosts
function oktaStart(req, res, next) {
  if (!process.env.OKTA_CLIENT_ID || !process.env.OKTA_CLIENT_SECRET || !process.env.OKTA_ISSUER) {
    return res.status(503).json({ error: 'Okta sign-in is not configured' });
  }
  // Verify strategy is actually registered
  if (!passport._strategies || !passport._strategies.okta) {
    return res.status(500).json({ error: 'Okta strategy not registered despite env vars being set. Restart the API.' });
  }
  next();
}
router.get(['/okta', '/okta/'], oktaStart, (req, res, next) => {
  console.log('[Okta] start: redirecting to Okta with response_mode=form_post, callback=/api/okta-cb');
  // customParams may be merged into authorize URL by passport-oauth2 so form_post is used
  passport.authenticate('okta', {
    scope: ['openid', 'profile', 'email'],
    customParams: { response_mode: 'form_post' },
  })(req, res, (err) => {
    if (err) {
      console.error('Okta authenticate error:', err);
      return res.status(500).json({ error: 'Okta redirect failed', message: err.message, stack: err.stack });
    }
    next();
  });
});

// Debug: see what path the server receives (when path is trimmed, you may see /auth/okta/callback-test)
router.get('/okta/callback-test', (req, res) => {
  res.json({ ok: 'callback-test', path: req.path, originalUrl: req.originalUrl, baseUrl: req.baseUrl, method: req.method });
});

// Okta OAuth callback — supports both query (GET) and form_post (POST body); exported for app-level registration
function oktaCallback(req, res, next) {
  const bodyKeys = req.body ? Object.keys(req.body) : [];
  const hasCodeInBody = req.body && !!req.body.code;
  const hasStateInBody = req.body && !!req.body.state;
  console.log('[Okta] callback handler entered', {
    method: req.method,
    path: req.path,
    queryKeys: Object.keys(req.query || {}),
    bodyKeys,
    hasCodeInBody,
    hasStateInBody,
  });
  // form_post: Okta POSTs code/state in body; Passport reads from req.query so copy over
  if (req.method === 'POST' && req.body && (req.body.code || req.body.state)) {
    req.query = req.query || {};
    if (req.body.code) req.query.code = req.body.code;
    if (req.body.state) req.query.state = req.body.state;
    console.log('[Okta] copied code/state from body to query');
  }
  const code = req.query && req.query.code;
  if (!code) {
    const queryKeys = Object.keys(req.query || {});
    console.log('[Okta] no code in request — returning diagnostic', { queryKeys });
    return res.json({
      ok: 'callback-endpoint',
      path: req.path,
      method: req.method,
      message: 'Okta redirects here with code (query or form_post body). If you just logged in via Okta and see this, the code may not have been sent.',
      hint: queryKeys.length ? 'Query params present but no "code" key' : 'No query params received — if this was the redirect from Okta, the platform may be stripping the query string; form_post (POST) should fix it.',
      queryKeys,
    });
  }
  console.log('[Okta] exchanging code for token...');
  passport.authenticate('okta', { session: true, failureRedirect: `${frontendUrl()}/?auth=failed` })(req, res, (err) => {
    if (err) {
      console.error('[Okta] passport.authenticate error', err.message, err.stack);
      return next(err);
    }
    console.log('[Okta] auth success, redirecting to app');
    res.redirect(`${frontendUrl()}/?auth=ok`);
  });
}
router.get(['/okta/callback', '/okta/callback/'], oktaCallback);
router.post(['/okta/callback', '/okta/callback/'], oktaCallback);

module.exports = router;
module.exports.passport = passport;
module.exports.oktaCallback = oktaCallback;