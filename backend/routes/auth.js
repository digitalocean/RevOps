const router = require('express').Router();
const passport = require('passport');
const bcrypt = require('bcrypt');
const { pool } = require('../server');

const GoogleStrategy = require('passport-google-oauth20').Strategy;
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

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${apiBase()}/api/auth/google/callback`,
        scope: ['profile', 'email'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value || profile.id + '@google';
          const name = profile.displayName || email.split('@')[0];
          const avatar = profile.photos?.[0]?.value || null;
          const googleId = profile.id;

          const existing = await pool.query({
            name: 'auth_google_find_user',
            text: 'SELECT id, email, name, avatar_url FROM users WHERE google_id = $1 OR email = $2 LIMIT 1',
            values: [googleId, email],
          });

          let user;
          if (existing.rows.length) {
            await pool.query({
              name: 'auth_google_update_user',
              text: 'UPDATE users SET name = $1, avatar_url = $2, google_id = $3 WHERE id = $4',
              values: [name, avatar, googleId, existing.rows[0].id],
            });
            user = { id: existing.rows[0].id, email, name, avatar_url: avatar };
          } else {
            const insert = await pool.query({
              name: 'auth_google_insert_user',
              text: 'INSERT INTO users (email, name, avatar_url, google_id) VALUES ($1, $2, $3, $4) RETURNING id, email, name, avatar_url',
              values: [email, name, avatar, googleId],
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
      return res.status(401).json({ error: 'Account uses Google sign-in. Use Log in with Google or set a password.' });
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

// Start Google OAuth
router.get(
  '/google',
  (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(503).json({ error: 'Google sign-in is not configured' });
    }
    next();
  },
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Google OAuth callback
router.get(
  '/google/callback',
  passport.authenticate('google', { session: true, failureRedirect: `${frontendUrl()}/?auth=failed` }),
  (req, res) => {
    res.redirect(`${frontendUrl()}/?auth=ok`);
  }
);

module.exports = router;
module.exports.passport = passport;
