# Add environment variables in DigitalOcean

Use **"Add from .env"** so all variables appear at once; then you only edit the **values**.

---

## 1. API (backend) — add all variables in one go

1. Open your app in DigitalOcean → **api** service → **Environment Variables**.
2. You already have `DATABASE_URL`, `NODE_ENV`, `PORT`. Click **"Add from .env"** and either upload **`docs/do-api-env-extra.env`** or paste the block below. That adds only the missing keys (no duplicates).
4. Replace only the **values** for:
   - `SESSION_SECRET` → your long random string
   - `OKTA_ISSUER` → your Okta issuer URL
   - `OKTA_CLIENT_ID` → your Okta Client ID
   - `OKTA_CLIENT_SECRET` → your Okta Client secret  
   Keep `FRONTEND_URL` and `APP_URL` as `https://revops-ntkll.ondigitalocean.app` (or your app URL).
5. Save.

**Block to paste into "Add from .env":**

```
NODE_TLS_REJECT_UNAUTHORIZED=0
SESSION_SECRET=PASTE_LONG_RANDOM_STRING
FRONTEND_URL=https://revops-ntkll.ondigitalocean.app
APP_URL=https://revops-ntkll.ondigitalocean.app
OKTA_ISSUER=PASTE_OKTA_ISSUER
OKTA_CLIENT_ID=PASTE_OKTA_CLIENT_ID
OKTA_CLIENT_SECRET=PASTE_OKTA_CLIENT_SECRET
```

(Do **not** replace `DATABASE_URL` if it’s already set to `${db.DATABASE_URL}` — leave that as is. Only add the lines above so the new keys appear.)

If **"Add from .env"** asks for a file, use **`docs/do-api-env-extra.env`** (only the extra keys, so you won’t get duplicate rows for DATABASE_URL, NODE_ENV, PORT).

---

## 2. Web (frontend) component

1. Open the **web** (static site) component.
2. Go to **Settings** → **Environment Variables** (build-time).
3. Add or edit:

| Key (name) | Paste this value |
|------------|-------------------|
| `VITE_API_URL` | `https://revops-ntkll.ondigitalocean.app` |

Save, then **trigger a new build** of the web component so the value is used.

---

## 3. After adding

- **API:** Redeploy or let the next deploy use the new vars.
- **Web:** Start a new build so `VITE_API_URL` is baked into the frontend.

You should then see these variables in the dashboard and your app will use the values you pasted.
