# Deploying AgileOps to DigitalOcean App Platform

This doc explains how the app is structured on App Platform and how to deploy it without running into the **ingress duplicate rule** error.

---

## 1. How the setup works

AgileOps is a **monorepo**: the repo root has no runnable app, only two subfolders:

```
agileops-full/
├── backend/          ← Node.js API (Express + PostgreSQL)
│   ├── package.json
│   └── src/
├── frontend/         ← React (Vite) static site
│   ├── package.json
│   └── src/
├── .do/
│   └── app.yaml      ← App Platform spec (use this)
└── package.json      ← Root; only for local “run from root” deploy
```

On DigitalOcean you deploy **one app** with **three components**:

| Component   | Type         | Source directory | Purpose                          |
|------------|--------------|------------------|----------------------------------|
| **db**     | Database     | —                | PostgreSQL (schema + seed run once) |
| **revops** | Service      | `/backend`       | API: `/health`, `/api/*`         |
| **web**    | Static Site  | `/frontend`      | React UI (build output in `dist`)   |

- **With the ingress in the spec:** one app URL (e.g. `https://revops-xxxxx.ondigitalocean.app`). Path `/` → **web** (frontend), `/api` and `/health` → **revops** (API). No duplicate “path /” rule for revops. Set **VITE_API_URL** and **FRONTEND_URL** to this same app URL.
- **Without custom ingress:** each component gets its own default URL (revops-xxx, web-xxx). Use the web URL in the browser and set VITE_API_URL to the revops URL.

---

## 2. Why you see “path prefix / already in use”

App Platform can create a **default route** for the first service (e.g. “route `/` to revops”). If that already exists and the spec (or a previous version) also defines an ingress rule for path `/` → revops, validation fails with:

`rule matching path prefix "/" already in use by rule with component: "revops"`

So:

- The **spec in this repo** is written with **no** `ingress` section, so it does not add any route.
- If the app was created earlier **with** an ingress rule, that rule is stored in the app’s config. The UI doesn’t always show where to delete it, so the error can persist even after you paste a spec that has no ingress.

**Practical fix:** Create a **new** app using the clean spec below (which has no ingress at all). Then use the new app’s URLs and env vars.

---

## 3. Deploy steps (recommended: new app)

### 3.1 Create a new app from the spec

1. **Apps** → **Create App** → **Edit your app spec** (or **Import from app spec**).
2. Delete any existing YAML and paste the **full** contents of [.do/app.yaml](../.do/app.yaml) from this repo.
3. Confirm the pasted spec **does not** contain the word `ingress` (no `ingress:` block).
4. Set **Source**: same GitHub repo and branch as in the spec (e.g. `digitalocean/RevOps`, `feature/create-sprint-ui`).
5. Save and deploy. Wait for **revops** and **web** to build and deploy.

### 3.2 Get the URLs

After deploy:

- **Revops (API):** e.g. `https://revops-xxxxx.ondigitalocean.app`
- **Web (UI):** e.g. `https://web-xxxxx.ondigitalocean.app`

Use the **web** URL in the browser; use the **revops** URL only for API/health checks.

### 3.3 Set environment variables (after first deploy)

**Web (static site)**  
- **VITE_API_URL** = your **revops** URL (e.g. `https://revops-xxxxx.ondigitalocean.app`)  
- Save and **redeploy the web component** so the frontend is rebuilt with this value.

**Revops (service)**  
- **FRONTEND_URL** = your **web** URL (e.g. `https://web-xxxxx.ondigitalocean.app`)  
- Saves CORS; redeploy revops if needed.

### 3.4 Database: tables and data

The **db** component gives you PostgreSQL and injects **DATABASE_URL** into **revops**. The backend **creates all tables on startup** (no manual `db:init` needed). If you saw `relation "projects" does not exist` or data not persisting after refresh, **redeploy the revops service** so it runs the schema on start; then creates will persist.

**Optional seed data:** Run `DATABASE_URL="<connection-string>" npm run db:seed` from `backend/`, or run `backend/src/db/seed.sql` in the database Console.



---

## 4. Summary

| What                    | Where / How |
|-------------------------|-------------|
| App spec (no ingress)   | `.do/app.yaml` in this repo |
| API                     | **revops** service, `source_dir: /backend` |
| UI                      | **web** static site, `source_dir: /frontend` |
| DB                      | **db** PostgreSQL; link to revops for `DATABASE_URL` |
| Open in browser         | **Web** component URL only |
| Ingress / “path / in use” | Omit `ingress` entirely; if error persists, create a **new** app with the clean spec |

---

## 5. If you must fix the existing app (no new app)

1. In the app’s **App Spec** tab, **Download** or **Copy** the current spec.
2. Open it in an editor and search for `ingress`. Delete the entire `ingress:` block (including all `rules:` and nested content).
3. Save and paste the modified spec back into the editor in the dashboard, then save again.
4. If the validation error still appears, the duplicate rule is likely stored outside the visible spec; in that case creating a **new** app with the clean `.do/app.yaml` (no ingress) is the reliable fix.
