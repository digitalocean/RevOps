# Add environment variables in DigitalOcean (manual)

If the variables from `app.yaml` don’t show up in your app, add them manually so you only paste **values**.

---

## 1. API (backend) component

1. In DigitalOcean: **Apps** → your app (**meridian** / RevOps) → open the **api** service (not the database, not the static site).
2. Go to **Settings** → **App-Level Environment Variables** (or **Component** → **Environment Variables**).
3. Click **Edit** or **Add Variable** and add these **keys** one by one. For each key, paste your **value** in the value field.

| Key (name) | Paste this value |
|------------|-------------------|
| `SESSION_SECRET` | A long random string (e.g. from `openssl rand -base64 32`) |
| `FRONTEND_URL` | `https://revops-ntkll.ondigitalocean.app` |
| `APP_URL` | `https://revops-ntkll.ondigitalocean.app` |
| `OKTA_ISSUER` | Your Okta issuer URL (e.g. `https://your-org.okta.com/oauth2/default`) |
| `OKTA_CLIENT_ID` | Your Okta app Client ID |
| `OKTA_CLIENT_SECRET` | Your Okta app Client secret |

**Note:** `DATABASE_URL`, `NODE_ENV`, `PORT` are usually already set. If not, add them (e.g. `DATABASE_URL` from the linked database).

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
