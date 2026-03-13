const router = require('express').Router();
const passport = require('passport');
const bcrypt = require('bcrypt');
const { pool } = require('../server');

const OAuth2Strategy = require('passport-oauth2').Strategy;
const SALT_ROUNDS = 10;

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
    new OAuth2Strategy(
      {
        authorizationURL: `${oktaIssuer}/v1/authorize`,
        tokenURL: `${oktaIssuer}/v1/token`,
        clientID: process.env.OKTA_CLIENT_ID,
        clientSecret: process.env.OKTA_CLIENT_SECRET,
        callbackURL: `${apiBase()}/api/auth/okta/callback`,
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

// Start Okta OIDC
router.get(
  '/okta',
  (req, res, next) => {
    if (!process.env.OKTA_CLIENT_ID || !process.env.OKTA_CLIENT_SECRET || !process.env.OKTA_ISSUER) {
      return res.status(503).json({ error: 'Okta sign-in is not configured' });
    }
    next();
  },
  passport.authenticate('okta', { scope: ['openid', 'profile', 'email'] })
);

// Okta OAuth callback
router.get(
  '/okta/callback',
  passport.authenticate('okta', { session: true, failureRedirect: `${frontendUrl()}/?auth=failed` }),
  (req, res) => {
    res.redirect(`${frontendUrl()}/?auth=ok`);
  }
);

module.exports = router;
module.exports.passport = passport;
