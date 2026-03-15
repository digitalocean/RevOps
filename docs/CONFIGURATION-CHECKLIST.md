# Configuration checklist

Your app uses **one public URL** on DigitalOcean: the ingress sends `/api` to the API and `/` to the web app. So the same host is both frontend and backend (e.g. `https://revops-ntkll.ondigitalocean.app`).

**Copy-paste env blocks:** See **[docs/ENV-VARIABLES.md](ENV-VARIABLES.md)** for ready-to-paste environment variable blocks (API + Web).  
**If vars don’t show in DO:** Add them manually — see **[docs/DO-ADD-ENV-VARS.md](DO-ADD-ENV-VARS.md)** (key names + what to paste).

Use this list to set all required values. Replace `https://revops-ntkll.ondigitalocean.app` with your actual app URL if different.

---

## 1. DigitalOcean App Platform — API service (backend)

In the **api** component → **App-Level Environment Variables** (or component env vars):

| Variable | Required | Value / notes |
|----------|----------|----------------|
| **DATABASE_URL** | ✅ Yes | Usually auto-set from the linked database (`${db.DATABASE_URL}`). Ensure the `db` database is attached to the app. |
| **NODE_ENV** | ✅ Yes | `production` |
| **PORT** | ✅ Yes | `8080` (matches `http_port` in app spec) |
| **SESSION_SECRET** | ✅ Yes | **Change the default.** Use a long random string (e.g. 32+ chars). Example: run `openssl rand -base64 32` and paste the result. Without this, session cookies are not secure. |
| **FRONTEND_URL** | ✅ Recommended | Your app’s public URL, no trailing slash. Used for CORS and post-login redirects. Example: `https://revops-ntkll.ondigitalocean.app` |
| **APP_URL** or **API_BASE_URL** | ✅ For OAuth/Okta | Same as your app URL. Used to build OAuth callback URLs (e.g. `{APP_URL}/api/auth/google/callback`). Example: `https://revops-ntkll.ondigitalocean.app` |
| NODE_TLS_REJECT_UNAUTHORIZED | Optional | `0` only if your DB uses a self-signed cert (e.g. DO Managed Database); already in `.do/app.yaml` if needed. |
| GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET | Optional | Only if you enable Google sign-in. |
| OKTA_ISSUER | For Okta SSO | Okta issuer URL (e.g. `https://your-org.okta.com/oauth2/default`). Required with OKTA_CLIENT_ID and OKTA_CLIENT_SECRET for "Sign in with Okta" to work. |
| OKTA_CLIENT_ID | For Okta SSO | From Okta Admin → your OIDC app. |
| OKTA_CLIENT_SECRET | For Okta SSO | From Okta Admin → your OIDC app. |

**Important:** In `.do/app.yaml`, `SESSION_SECRET` is currently a placeholder. Set a real secret in the DO dashboard (or in the spec) so production sessions are secure.

---

## 2. DigitalOcean App Platform — Web (frontend) component

In the **web** (static site) component → **Build** environment variables:

| Variable | Required | Value / notes |
|----------|----------|----------------|
| **VITE_API_URL** | ✅ Yes | Your app’s public URL, no trailing slash. The frontend will call `{VITE_API_URL}/api/...`. Example: `https://revops-ntkll.ondigitalocean.app` |

So for your URL it should be: **`https://revops-ntkll.ondigitalocean.app`** (no `/api` at the end).

---

## 3. Okta (when you add SSO)

In **Okta Admin** → your OIDC application:

| Setting | Value / notes |
|---------|----------------|
| **Sign-in redirect URI** | `https://revops-ntkll.ondigitalocean.app/api/auth/okta/callback` (your app URL + `/api/auth/okta/callback`) |
| **Sign-out redirect URI** (optional) | e.g. `https://revops-ntkll.ondigitalocean.app` |
| **Client ID** | From Okta → copy into backend env as `OKTA_CLIENT_ID` |
| **Client secret** | From Okta → copy into backend env as `OKTA_CLIENT_SECRET` |
| **Issuer** | From Okta (e.g. `https://your-domain.okta.com/oauth2/default`) → backend env as `OKTA_ISSUER` |

Backend env vars to add when you implement Okta:

- `OKTA_ISSUER`
- `OKTA_CLIENT_ID`
- `OKTA_CLIENT_SECRET`

(Your code will build the callback URL from `APP_URL` or `API_BASE_URL` + `/api/auth/okta/callback`.)

---

## 4. Local development (backend)

Create `backend/.env` (copy from `backend/.env.example`):

| Variable | Example / notes |
|----------|------------------|
| **DATABASE_URL** | `postgresql://user:password@localhost:5432/meridian` |
| **SESSION_SECRET** | Any long random string for local dev |
| **FRONTEND_URL** | `http://localhost:5173` (Vite dev server) |
| **API_BASE_URL** or **APP_URL** | `http://localhost:4000` (for OAuth callbacks when testing Google/Okta locally) |

---

## 5. Quick reference — your current URL

If your app is at **https://revops-ntkll.ondigitalocean.app/**:

| Purpose | Value |
|---------|--------|
| App (browser) | `https://revops-ntkll.ondigitalocean.app` |
| API base (same host) | `https://revops-ntkll.ondigitalocean.app` |
| **VITE_API_URL** (web build) | `https://revops-ntkll.ondigitalocean.app` |
| **FRONTEND_URL** (api) | `https://revops-ntkll.ondigitalocean.app` |
| **APP_URL** or **API_BASE_URL** (api) | `https://revops-ntkll.ondigitalocean.app` |
| Okta Sign-in redirect URI | `https://revops-ntkll.ondigitalocean.app/api/auth/okta/callback` |

**Okta 404 when clicking “Sign in with Okta”:**
- **Redirect URL to give Okta Admin** (exactly): `https://revops-ntkll.ondigitalocean.app/api/auth/okta/callback` (no trailing slash).
- **Start URL** (where the app sends the user first): `https://revops-ntkll.ondigitalocean.app/api/auth/okta`.  
- If you get 404: (1) Redeploy the **api** component so it runs the latest code with Okta routes. (2) Set **APP_URL** = `https://revops-ntkll.ondigitalocean.app` on the api so the callback URL is correct. (3) In the browser, open `https://revops-ntkll.ondigitalocean.app/api/auth/providers` — you should see `{"okta":true}`; or open `https://revops-ntkll.ondigitalocean.app/api/auth/ping` — you should see `{"ok":"auth","path":"/ping","okta":true}`. If you get 404, the request is not reaching the API (check ingress and that the **api** component was redeployed).

---

## 6. What to do right now (no Okta yet)

1. **API component:** Set **SESSION_SECRET** to a real secret (not `CHANGE_ME_...`).  
2. **API component:** Set **FRONTEND_URL** and **APP_URL** (or **API_BASE_URL**) to `https://revops-ntkll.ondigitalocean.app`.  
3. **Web component:** Set **VITE_API_URL** to `https://revops-ntkll.ondigitalocean.app`, then **rebuild** the web component so the new value is baked in.  
4. Confirm the database is linked and **DATABASE_URL** is set for the API.

After that, login and session cookies should work correctly in production. When you add Okta, add the three Okta env vars and the redirect URI above.

**If the Activity panel shows “Couldn’t load activity”:**  
- **Local:** Run the API (`npm run dev` in the `backend` folder) and use the frontend dev server so `/api` is proxied to the backend; stay signed in.  
- **Deployed:** Set **VITE_API_URL** on the **web** component to your app URL (e.g. `https://revops-ntkll.ondigitalocean.app`), then **rebuild** the web app so the frontend can reach the API.
