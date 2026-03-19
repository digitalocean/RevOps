# Moving This App from One DigitalOcean App to Another

When you create a **new** App in DigitalOcean (or point the same repo at a different app), do the following so the new app works with the correct URL, database, and SSO.

---

## 1. Create / use the new App

- In DigitalOcean: **Apps** → **Create App** (or use an existing app).
- Connect the **same repo and branch** (or the repo that has your updated `app.yaml`).
- Point the app spec to **`app.yaml`** at the repo root (Settings → App Spec).

---

## 2. Update the app spec for the new URL

Before (or right after) the first deploy, set the **new app URL** everywhere. Your new URL will look like:

`https://YOUR-NEW-APP-NAME.ondigitalocean.app`

In **`app.yaml`** (in the repo), replace the old URL in these places:

| In `app.yaml` | Replace |
|---------------|--------|
| `FRONTEND_URL` (api envs) | `https://YOUR-NEW-APP-NAME.ondigitalocean.app` |
| `APP_URL` (api envs) | Same as above |
| `SAML_SP_ENTITY_ID` (api envs) | Same as above |
| `SAML_APP_BASE_URL` (api envs) | Same as above |
| `VITE_API_URL` (web envs) | Same as above (no `/api`) |

Commit and push so the next deploy uses the new URL.  
Or, if you prefer not to change the repo: in the DO dashboard, open **api** and **web** → **Environment Variables** and set/override these keys to the new URL.

---

## 3. Database: same DB or new DB

**Option A – Use the same database (e.g. keep existing data)**

- In the **new** app: **Settings** → **App-Level Resources** (or **Components**).
- **Add** the existing **Database** (from your old app or a shared DB) and link it to the **api** component.
- Ensure the api component has `DATABASE_URL` from that DB (DO usually injects it when you attach the DB).

**Option B – Use a new database**

- In the new app, add a **new** Postgres database (via the app spec or Resources).
- Link it to the **api** component.
- If you need data from the old app: export from the old DB and import into the new one (e.g. `pg_dump` / `psql` or DO backup/restore), then run migrations if your backend has any.

---

## 4. Environment variables on the new app

In the **new** app’s **api** component, set (or confirm):

- `DATABASE_URL` – from the linked database (Step 3).
- `SESSION_SECRET` – generate a new one, e.g. `openssl rand -base64 32`.
- `FRONTEND_URL`, `APP_URL` – new app URL (Step 2).
- `SAML_*` – see Step 5.
- `OKTA_*` – only if you use OIDC; use the same or new Okta app credentials.

For the **web** component, set:

- `VITE_API_URL` – new app URL (no trailing `/api`).  
Then trigger a **new build** of the web component (Redeploy or push a commit).

---

## 5. Okta / SAML (if you use SSO)

Update the Okta app that points at your **old** DO app so it points at the **new** one:

1. In Okta: open the app (SAML or OIDC) used for this product.
2. Set **Audience URI (SP Entity ID)** to:  
   `https://YOUR-NEW-APP-NAME.ondigitalocean.app`
3. Set **Single sign-on URL** to:  
   `https://YOUR-NEW-APP-NAME.ondigitalocean.app/api/auth/saml`
4. Set **Application redirect URI** (if used) to the new origin, e.g.  
   `https://YOUR-NEW-APP-NAME.ondigitalocean.app`
5. Save.

Ensure **`app.yaml`** (or the api env vars in DO) has:

- `SAML_SP_ENTITY_ID` = `https://YOUR-NEW-APP-NAME.ondigitalocean.app`
- `SAML_APP_BASE_URL` = same
- `SAML_IDP_METADATA_URL` = unchanged (still your Okta metadata URL)

---

## 6. Repo / source (if the new app uses a different repo)

If the **new** DO app pulls from a **different** repo (e.g. another org or fork):

- In the new app’s **api** and **web** components, set **Source** to that repo and branch.
- Ensure that repo has the same **`app.yaml`** (with the new URL from Step 2) and the same **backend** and **frontend** layout (see `docs/DEPLOY-DIGITALOCEAN.md`).

---

## 7. Deploy and verify

1. Save all settings and **Deploy** (or push a commit to trigger deploy).
2. Open the **new** app URL and sign in (SSO or dev login).
3. Check **Activity** panel and **Check API**; hit `/api/health` in the browser to confirm the API is reachable.
4. If anything still points at the old URL (browser cache, bookmarks, Okta), update or clear as needed.

---

## Quick checklist

| Step | Action |
|------|--------|
| 1 | New app created and connected to repo with `app.yaml`. |
| 2 | In repo or DO: set **FRONTEND_URL**, **APP_URL**, **SAML_SP_ENTITY_ID**, **SAML_APP_BASE_URL**, **VITE_API_URL** to the **new** app URL. |
| 3 | Attach **same** DB or **new** DB to the new app’s **api** component; set **SESSION_SECRET**. |
| 4 | In Okta: update **Audience URI** and **SSO URL** (and redirect URI if used) to the new app URL. |
| 5 | Redeploy; test login and Activity/API. |

After this, the app runs on the new DO App with the new URL; you can retire or keep the old app as needed.
