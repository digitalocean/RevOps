# Environment variables — copy & paste

Use your app URL: **https://revops-ntkll.ondigitalocean.app** (no trailing slash). Replace with your own URL if different.

**DigitalOcean:** All env **keys** are already defined in **`.do/app.yaml`**. In the DO dashboard you only **edit the values** (no need to add or create variable names). Deploy or sync the app from the repo so the spec is applied, then open API/Web component → Environment Variables and paste your values into the existing keys.

---

## API (backend) — DigitalOcean or local `.env`

Copy the block below. Replace placeholder values (especially `SESSION_SECRET`, `OKTA_*`, and `DATABASE_URL` if not auto-set).

```env
# Required
DATABASE_URL=postgresql://user:password@host:5432/dbname
NODE_ENV=production
PORT=8080
SESSION_SECRET=paste-a-long-random-string-here-at-least-32-chars

# Required for production (CORS + OAuth redirects)
FRONTEND_URL=https://revops-ntkll.ondigitalocean.app
APP_URL=https://revops-ntkll.ondigitalocean.app

# Okta SSO (optional — omit if not using Okta)
OKTA_ISSUER=https://your-org.okta.com/oauth2/default
OKTA_CLIENT_ID=paste-your-okta-client-id
OKTA_CLIENT_SECRET=paste-your-okta-client-secret

# Optional: DB with self-signed cert (e.g. DO Managed DB)
NODE_TLS_REJECT_UNAUTHORIZED=0

# Optional: Google Sign-In
# GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
# GOOGLE_CLIENT_SECRET=xxx

# Optional: Voice / AI
# OPENAI_API_KEY=sk-...
# GRADIENT_MODEL_ACCESS_KEY=do-...
# GRADIENT_CHAT_MODEL=gpt-4o
```

**DigitalOcean:** In the **api** component, add each variable (key + value). `DATABASE_URL` is usually provided by the linked database (`${db.DATABASE_URL}`).

**Local:** Save as `backend/.env` and fill in real values.

---

## Web (frontend) — build-time only

Single variable. Rebuild the web app after setting it.

```env
VITE_API_URL=https://revops-ntkll.ondigitalocean.app
```

**DigitalOcean:** In the **web** (static site) component → Build environment variables, add:

| Key | Value |
|-----|--------|
| `VITE_API_URL` | `https://revops-ntkll.ondigitalocean.app` |

---

## Quick reference — API keys only (paste your values)

Use this list when you only need to paste **your** values (e.g. from Okta or a secret generator).

| Variable | Where to get it | Example |
|----------|------------------|--------|
| `SESSION_SECRET` | Generate: `openssl rand -base64 32` | long random string |
| `OKTA_ISSUER` | Okta Admin → your OIDC app / Authorization Server | `https://dev-12345.okta.com/oauth2/default` |
| `OKTA_CLIENT_ID` | Okta Admin → Application → Client ID | `0oa...` |
| `OKTA_CLIENT_SECRET` | Okta Admin → Application → Client secret | `xxx...` |
| `DATABASE_URL` | DigitalOcean: from linked DB; local: your Postgres connection string | `postgresql://...` |

---

## Local development — minimal `.env` for backend

```env
DATABASE_URL=postgresql://user:password@localhost:5432/meridian
SESSION_SECRET=any-long-random-string-for-local
FRONTEND_URL=http://localhost:5173
APP_URL=http://localhost:4000
```

Add `OKTA_*` and/or `GOOGLE_*` when testing SSO locally. Use redirect URI `http://localhost:4000/api/auth/okta/callback` in Okta for local testing.
