const fs = require('fs');
const path = require('path');

const router = require('express').Router();
const passport = require('passport');
const bcrypt = require('bcrypt');
const { pool } = require('../server');
const { linkCrewRowsToUserByEmail } = require('../lib/access');

const OAuth2Strategy = require('passport-oauth2').Strategy;
const {
  snapshotSamlAttributes,
  deriveGlobalRoleFromProfile,
  getAccessDeniedMessage,
  isAppAccessGrantedForUser,
} = require('../lib/saml-claims');
const { ensureUsersTableForAuth } = require('../lib/applySchema');
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

/** Public HTTPS base for SAML Issuer + ACS — must match Okta Audience + SSO URL host. */
function samlPublicBase() {
  const candidates = [
    process.env.SAML_APP_BASE_URL,
    process.env.SAML_SP_ENTITY_ID,
    process.env.APP_URL,
    process.env.API_BASE_URL,
  ].filter(Boolean);
  for (const u of candidates) {
    const b = String(u).replace(/\/$/, '');
    if (b && !/^https?:\/\/localhost/i.test(b) && !/^https?:\/\/127\./i.test(b)) {
      return b;
    }
  }
  return apiBase();
}

function samlIssuerAndCallback() {
  const base = samlPublicBase().replace(/\/$/, '');
  const issuer = (process.env.SAML_SP_ENTITY_ID || base).replace(/\/$/, '');
  const callbackUrl = `${base}/api/auth/saml/callback`;
  return { issuer, callbackUrl, base };
}

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
          await linkCrewRowsToUserByEmail(pool, user.id, email);
          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
}

// ── SAML 2.0 (IdP metadata URL, file, or raw XML) ─────────────────────────
function parseIdpMetadata(xml) {
  const matches = [...String(xml).matchAll(/SingleSignOnService\s+([^>]+)>/gi)];
  let postUrl;
  let redirectUrl;
  for (const [, attrs] of matches) {
    const loc = attrs.match(/Location="([^"]+)"/i);
    const binding = attrs.match(/Binding="([^"]+)"/i);
    if (!loc) continue;
    const b = (binding && binding[1]) || '';
    if (b.includes('HTTP-POST')) postUrl = loc[1];
    else if (b.includes('HTTP-Redirect')) redirectUrl = loc[1];
  }
  // SP default is HTTP-Redirect AuthnRequest — prefer Redirect SSO URL (same as POST on Okta, but avoids edge cases)
  const entryPoint = redirectUrl || postUrl;
  const certRaw = [...String(xml).matchAll(/X509Certificate>\s*([^<]+?)\s*</gi)].map((m) =>
    m[1].replace(/\s/g, '')
  );
  const idpCerts = [...new Set(certRaw.filter(Boolean))];
  return { entryPoint, idpCerts, postUrl, redirectUrl };
}

function certToPem(b64) {
  const lines = b64.match(/.{1,64}/g) || [b64];
  return `-----BEGIN CERTIFICATE-----\n${lines.join('\n')}\n-----END CERTIFICATE-----`;
}

function samlMetadataEnvPresent() {
  return !!(
    process.env.SAML_IDP_METADATA_URL ||
    process.env.SAML_IDP_METADATA_FILE ||
    (process.env.SAML_IDP_METADATA_XML && String(process.env.SAML_IDP_METADATA_XML).trim().length > 80)
  );
}

let samlStrategyReady = false;
let samlInitPromise = null;

async function ensureSamlStrategy() {
  if (samlStrategyReady) return;
  if (!samlMetadataEnvPresent()) {
    throw new Error('SAML is not configured (set SAML_IDP_METADATA_URL, SAML_IDP_METADATA_FILE, or SAML_IDP_METADATA_XML)');
  }
  if (samlInitPromise) {
    await samlInitPromise;
    return;
  }
  samlInitPromise = (async () => {
    let xml;
    if (process.env.SAML_IDP_METADATA_FILE) {
      const fp = path.resolve(process.cwd(), process.env.SAML_IDP_METADATA_FILE);
      xml = fs.readFileSync(fp, 'utf8');
    } else if (process.env.SAML_IDP_METADATA_XML) {
      xml = process.env.SAML_IDP_METADATA_XML;
    } else {
      const metaUrl = process.env.SAML_IDP_METADATA_URL;
      const res = await fetch(metaUrl, {
        headers: { Accept: 'application/xml, text/xml, */*' },
      });
      if (!res.ok) {
        const hint =
          res.status === 404
            ? ' Okta IdP metadata is usually at https://YOUR_ORG.okta.com/app/APP_INSTANCE_ID/sso/saml/metadata (path /app/INSTANCE_ID/..., not /app/AppName/INSTANCE_ID/...).'
            : '';
        throw new Error(`SAML metadata fetch failed: ${res.status} ${res.statusText}.${hint}`);
      }
      xml = await res.text();
    }
    const { entryPoint, idpCerts, postUrl, redirectUrl } = parseIdpMetadata(xml);
    if (!entryPoint) throw new Error('IdP metadata: no SingleSignOnService URL found');
    if (!idpCerts.length) throw new Error('IdP metadata: no X509Certificate found');
    const { Strategy } = require('@node-saml/passport-saml');
    const { issuer, callbackUrl, base: samlBase } = samlIssuerAndCallback();
    if (process.env.NODE_ENV === 'production' && /localhost|127\.0\.0\.1/i.test(samlBase)) {
      console.error(
        '[SAML] Issuer/ACS base looks local — Okta will show "Bad SAML request". Set SAML_SP_ENTITY_ID and SAML_APP_BASE_URL (or APP_URL) to your public https URL.'
      );
    }
    const idpCert = idpCerts.length === 1 ? certToPem(idpCerts[0]) : idpCerts.map(certToPem);

    const authnBinding = process.env.SAML_AUTHN_BINDING === 'POST' ? 'HTTP-POST' : 'HTTP-Redirect';
    const entry =
      authnBinding === 'HTTP-POST' ? postUrl || redirectUrl : redirectUrl || postUrl;

    passport.use(
      'saml',
      new Strategy(
        {
          callbackUrl,
          entryPoint: entry,
          issuer,
          idpCert,
          identifierFormat: process.env.SAML_NAME_ID_FORMAT || undefined,
          wantAssertionsSigned: process.env.SAML_WANT_ASSERTIONS_SIGNED !== 'false',
          wantAuthnResponseSigned: process.env.SAML_WANT_RESPONSE_SIGNED === 'true',
          validateInResponseTo: process.env.SAML_VALIDATE_IN_RESPONSE_TO || 'never',
          disableRequestedAuthnContext: process.env.SAML_REQUEST_AUTHN_CONTEXT !== 'true',
          authnRequestBinding: authnBinding,
        },
        async (profile, done) => {
          try {
            const nid = profile.nameID;
            const nameIdStr =
              typeof nid === 'string' ? nid : nid && typeof nid === 'object' && nid.value ? String(nid.value) : String(nid || '');
            const attrEmail =
              profile.email ||
              profile.mail ||
              profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'];
            const emailRaw =
              (typeof attrEmail === 'string' ? attrEmail : Array.isArray(attrEmail) ? attrEmail[0] : attrEmail) ||
              (nameIdStr && nameIdStr.includes('@') ? nameIdStr : null);
            const email = (emailRaw || `${nameIdStr || 'user'}.saml@local`).toLowerCase().trim();
            const displayName =
              profile.displayName ||
              [profile.firstName, profile.lastName].filter(Boolean).join(' ') ||
              profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ||
              email.split('@')[0];

            const samlSnap = snapshotSamlAttributes(profile);
            const globalRole = deriveGlobalRoleFromProfile(profile);

            const attrKeys = Object.keys(samlSnap);
            console.log(
              `[SAML] login ${email} — IdP sent ${attrKeys.length} attribute(s): ${attrKeys.length ? attrKeys.join(', ') : '(none — add Attribute Statements in Okta)'}`
            );
            // What the IdP put on the SAML profile (values truncated in snapshotSamlAttributes)
            console.log('[SAML] assertion attributes:', JSON.stringify(samlSnap));
            console.log('[SAML] nameID:', nameIdStr, '| issuer:', profile.issuer || '(none)');
            const verboseSaml =
              process.env.SAML_LOG_LOGIN === 'true' || process.env.SAML_LOG_ASSERTION === 'true';
            if (verboseSaml) {
              console.log(
                '[SAML] verbose profile:',
                JSON.stringify(
                  {
                    nameID: nameIdStr,
                    nameIDFormat: profile.nameIDFormat,
                    issuer: profile.issuer,
                    sessionIndex: profile.sessionIndex,
                    inResponseTo: profile.inResponseTo,
                    attributes: samlSnap,
                    global_role_derived: globalRole,
                  },
                  null,
                  2
                )
              );
            }

            await ensureUsersTableForAuth(pool);

            const existing = await pool.query({
              text: 'SELECT id, email, name, avatar_url, global_role FROM public.users WHERE email = $1 LIMIT 1',
              values: [email],
            });

            let user;
            if (existing.rows.length) {
              const nm = displayName || existing.rows[0].name;
              await pool.query({
                text: `UPDATE public.users SET name = $1, global_role = $2, saml_attributes = $3::jsonb WHERE id = $4`,
                values: [nm, globalRole, JSON.stringify(samlSnap), existing.rows[0].id],
              });
              user = {
                id: existing.rows[0].id,
                email,
                name: nm,
                avatar_url: existing.rows[0].avatar_url,
                global_role: globalRole,
              };
            } else {
              const insert = await pool.query({
                text: `INSERT INTO public.users (email, name, global_role, saml_attributes) VALUES ($1, $2, $3, $4::jsonb) RETURNING id, email, name, avatar_url, global_role`,
                values: [
                  email,
                  displayName || email.split('@')[0],
                  globalRole,
                  JSON.stringify(samlSnap),
                ],
              });
              user = {
                id: insert.rows[0].id,
                email: insert.rows[0].email,
                name: insert.rows[0].name,
                avatar_url: insert.rows[0].avatar_url,
                global_role: insert.rows[0].global_role || globalRole,
              };
            }
            await linkCrewRowsToUserByEmail(pool, user.id, email);
            return done(null, user);
          } catch (err) {
            return done(err, null);
          }
        }
      )
    );
    samlStrategyReady = true;
    console.log('[SAML] Strategy registered', {
      callbackUrl,
      issuer,
      entryPoint: (entry || entryPoint).slice(0, 56) + '…',
    });
  })();
  try {
    await samlInitPromise;
  } catch (e) {
    samlInitPromise = null;
    throw e;
  }
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
    req.login({ id: user.id, email: user.email, name: user.name, avatar_url: null }, async (err) => {
      if (err) return res.status(500).json({ error: err.message });
      await linkCrewRowsToUserByEmail(pool, user.id, user.email);
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
      return res.status(401).json({ error: 'Account uses SSO. Use Sign in with SSO / Okta on the login page.' });
    }
    const ok = await bcrypt.compare(String(password), user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });
    req.login({ id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url }, async (err) => {
      if (err) return next(err);
      await linkCrewRowsToUserByEmail(pool, user.id, user.email);
      const initials = (user.name || user.email || '').slice(0, 2).toUpperCase();
      res.json({ user: { id: user.id, email: user.email, name: user.name, initials } });
    });
  } catch (e) {
    next(e);
  }
});

// Ping to verify auth routes are reachable (GET /api/auth/ping or /auth/ping)
router.get('/ping', (req, res) => {
  res.json({
    ok: 'auth',
    path: req.path,
    okta: !!(process.env.OKTA_CLIENT_ID && process.env.OKTA_CLIENT_SECRET && process.env.OKTA_ISSUER),
    saml: samlMetadataEnvPresent(),
  });
});

// Auth providers: SAML preferred when configured (SSO button); else Okta OIDC.
// `dev` exposes the email/password form only outside production (for local development / review).
router.get('/providers', (req, res) => {
  res.json({
    okta: !!(process.env.OKTA_CLIENT_ID && process.env.OKTA_CLIENT_SECRET && process.env.OKTA_ISSUER),
    saml: samlMetadataEnvPresent(),
    dev: process.env.NODE_ENV !== 'production',
  });
});

/** After SAML login: JSON of stored attributes (set SAML_DEBUG_ATTRIBUTES_ENDPOINT=true). */
router.get('/saml/debug-attributes', async (req, res) => {
  if (!req.user?.id) {
    return res.status(401).json({ error: 'Sign in first, then open this URL again (same browser).' });
  }
  if (process.env.SAML_DEBUG_ATTRIBUTES_ENDPOINT !== 'true') {
    return res.status(404).json({
      error: 'Disabled. Set SAML_DEBUG_ATTRIBUTES_ENDPOINT=true on the API, redeploy, sign in via SAML, then refresh.',
    });
  }
  try {
    const { rows } = await pool.query({
      name: 'auth_saml_debug_attrs',
      text: 'SELECT email, global_role, saml_attributes FROM users WHERE id = $1',
      values: [req.user.id],
    });
    res.json({
      ok: 'saml-debug',
      email: rows[0]?.email,
      global_role: rows[0]?.global_role ?? null,
      saml_attributes: rows[0]?.saml_attributes ?? {},
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Current user (session + DB fields: global_role, saml_attributes from last SAML login)
router.get('/me', async (req, res) => {
  if (!req.user) {
    return res.json({ user: null });
  }
  const u = req.user;
  const initials = u.name
    ? u.name.split(/\s+/).map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : (u.email || '').slice(0, 2).toUpperCase();
  let globalRole = u.global_role ?? null;
  let samlAttributes = null;
  let hasPasswordHash = false;
  try {
    const { rows } = await pool.query({
      name: 'auth_me_saml_fields',
      text: 'SELECT global_role, saml_attributes, password_hash FROM users WHERE id = $1',
      values: [u.id],
    });
    if (rows[0]) {
      globalRole = rows[0].global_role ?? globalRole;
      samlAttributes = rows[0].saml_attributes;
      hasPasswordHash = !!rows[0].password_hash;
    }
  } catch (_) {
    /* columns may be missing before migration */
  }
  const showSamlAttrs = process.env.SAML_EXPOSE_ATTRIBUTES_IN_ME === 'true';
  const appAccessGranted = isAppAccessGrantedForUser({
    global_role: globalRole,
    has_password_hash: hasPasswordHash,
  });
  return res.json({
    user: {
      id: u.id,
      email: u.email,
      name: u.name,
      avatar_url: u.avatar_url,
      initials: initials || 'U',
      global_role: globalRole || null,
      ...(showSamlAttrs && samlAttributes && typeof samlAttributes === 'object'
        ? { saml_attributes: samlAttributes }
        : {}),
    },
    app_access: appAccessGranted ? 'granted' : 'denied',
    ...(appAccessGranted ? {} : { access_denied_message: getAccessDeniedMessage() }),
  });
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
  const callbackURL = `${appUrl}/api/auth/okta/callback`;
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
  console.log('[Okta] start: redirecting to Okta (GET callback with code in query)');
  passport.authenticate('okta', { scope: ['openid', 'profile', 'email'] })(req, res, (err) => {
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
  const contentType = (req.headers && req.headers['content-type']) || '(none)';
  console.log('[Okta] callback handler entered', {
    method: req.method,
    path: req.path,
    queryKeys: Object.keys(req.query || {}),
    bodyKeys,
    hasCodeInBody,
    hasStateInBody,
    contentType,
  });
  // form_post: Okta POSTs code/state in body; Passport reads from req.query so copy over
  if (req.method === 'POST' && req.body && (req.body.code || req.body.state)) {
    req.query = req.query || {};
    if (req.body.code) req.query.code = req.body.code;
    if (req.body.state) req.query.state = req.body.state;
    console.log('[Okta] copied code/state from body to query');
  }
  // Okta error redirect (e.g. invalid_grant, redirect_uri_mismatch, access_denied)
  const oktaError = req.query && req.query.error;
  const oktaErrorDesc = req.query && req.query.error_description;
  if (oktaError) {
    console.error('[Okta] Okta returned error', oktaError, oktaErrorDesc);
    const reason = encodeURIComponent(oktaErrorDesc || oktaError);
    return res.redirect(`${frontendUrl()}/?auth=failed&reason=okta&error=${encodeURIComponent(oktaError)}&error_description=${reason}`);
  }
  const code = req.query && req.query.code;
  if (!code) {
    const queryKeys = Object.keys(req.query || {});
    const err = req.query && req.query.error;
    const errDesc = req.query && req.query.error_description;
    if (err) console.error('[Okta] Okta returned error', err, errDesc);
    return res.json({
      ok: 'callback-endpoint',
      path: req.path,
      method: req.method,
      message: err ? 'Okta returned an error (see error and error_description below).' : 'Okta redirects here with code (query or form_post body). If you just logged in via Okta and see this, the code may not have been sent.',
      hint: err ? 'Fix the Okta app or env config per the error below.' : (queryKeys.length ? 'Query params present but no "code" key' : 'No query params received — if this was the redirect from Okta, the platform may be stripping the query string; form_post (POST) should fix it.'),
      queryKeys,
      ...(err && { error: err, error_description: errDesc }),
    });
  }
  console.log('[Okta] exchanging code for token...');
  passport.authenticate('okta', { session: true }, (err, user, info) => {
    if (err) {
      console.error('[Okta] passport.authenticate error', err.message, err.stack);
      return res.redirect(`${frontendUrl()}/?auth=failed&reason=error`);
    }
    if (!user) {
      console.error('[Okta] token exchange or user creation failed', info || 'no user returned');
      return res.redirect(`${frontendUrl()}/?auth=failed&reason=no_user`);
    }
    req.login(user, (loginErr) => {
      if (loginErr) {
        console.error('[Okta] req.login error', loginErr.message);
        return res.redirect(`${frontendUrl()}/?auth=failed&reason=session`);
      }
      console.log('[Okta] auth success, redirecting to app');
      res.redirect(`${frontendUrl()}/?auth=ok`);
    });
  })(req, res, next);
}
router.get(['/okta/callback', '/okta/callback/'], oktaCallback);
router.post(['/okta/callback', '/okta/callback/'], oktaCallback);

async function samlCallback(req, res, next) {
  try {
    await ensureSamlStrategy();
  } catch (e) {
    console.error('[SAML] init failed on ACS', e.message);
    return res.status(503).send('SAML is not configured.');
  }
  passport.authenticate('saml', { session: true }, (err, user) => {
    if (err) {
      console.error('[SAML] passport.authenticate error', err.message, err.stack);
      return res.redirect(`${frontendUrl()}/?auth=failed&reason=saml_error`);
    }
    if (!user) {
      console.error('[SAML] no user from assertion');
      return res.redirect(`${frontendUrl()}/?auth=failed&reason=saml_no_user`);
    }
    req.login(user, (loginErr) => {
      if (loginErr) {
        console.error('[SAML] req.login error', loginErr.message);
        return res.redirect(`${frontendUrl()}/?auth=failed&reason=session`);
      }
      console.log('[SAML] auth success, redirecting to app');
      res.redirect(`${frontendUrl()}/?auth=ok`);
    });
  })(req, res, next);
}

router.get(['/saml', '/saml/'], async (req, res, next) => {
  try {
    await ensureSamlStrategy();
  } catch (e) {
    return res.status(503).json({ error: 'SAML sign-in is not configured', message: e.message });
  }
  if (!passport._strategies || !passport._strategies.saml) {
    return res.status(500).json({ error: 'SAML strategy not registered' });
  }
  const { base } = samlIssuerAndCallback();
  if (process.env.NODE_ENV === 'production' && /localhost|127\.0\.0\.1/i.test(base)) {
    return res.status(503).json({
      error: 'SAML misconfigured',
      message:
        'Public app URL is not set. Okta returns "Bad SAML request" if Issuer/ACS use localhost. Set SAML_SP_ENTITY_ID and SAML_APP_BASE_URL (or APP_URL) to https://your-app.ondigitalocean.app',
    });
  }
  passport.authenticate('saml')(req, res, next);
});

router.post(['/saml/callback', '/saml/callback/'], samlCallback);

module.exports = router;
module.exports.passport = passport;
module.exports.oktaCallback = oktaCallback;
module.exports.samlCallback = samlMetadataEnvPresent() ? samlCallback : null;