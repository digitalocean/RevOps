# Deploy Meridian to DigitalOcean App Platform

## How to configure in DigitalOcean

### 1. Create the app from GitHub

1. In [DigitalOcean](https://cloud.digitalocean.com/) go to **Apps** → **Create App**.
2. Choose **GitHub** and select your repo and branch (e.g. `main` or `feature/create-sprint-ui`).
3. Either use **App Spec** (recommended) or configure components manually.

---

### 2. App structure (what DigitalOcean runs)

| Component | Type        | Source directory | Build / Run |
|-----------|-------------|------------------|------------|
| **db**    | Database    | —                | PostgreSQL 17 |
| **api**   | Service     | `/backend`       | `npm start` (Node, port 8080) |
| **web**   | Static Site | `/Helm` (Meridian UI) | `npm run build` → serve `dist` |

- **Ingress:** Requests to `/api/*` go to **api**; everything else (`/`) goes to **web** (React SPA).

---

### 3. Using the App Spec (`.do/app.yaml`)

If you use **Edit your App Spec** in the dashboard:

1. Paste or sync from the repo the contents of **`.do/app.yaml`**.
2. **Replace these** with your values:
   - **`github.repo`** – your GitHub repo (e.g. `your-username/agileops-full`).
   - **`github.branch`** – branch to deploy (e.g. `meridian` or `main`).
3. Set **`VITE_API_URL`** (BUILD_TIME) to your app URL (e.g. `https://revops-ntkll.ondigitalocean.app`) so the Meridian UI can reach the API. Or use same-origin: the UI uses `window.location.origin` when not set.
4. Save and deploy.

---

### 4. Environment variables (required)

#### API (backend) component

| Variable       | Scope    | Value / Notes |
|----------------|----------|----------------|
| `DATABASE_URL` | RUN_TIME | From linked DB: `${db.DATABASE_URL}` (or paste connection string) |
| `NODE_ENV`     | RUN_TIME | `production` |
| `PORT`         | RUN_TIME | `8080` |

Optional:

- **`FRONTEND_URL`** – Your app URL (e.g. `https://meridian-xxxxx.ondigitalocean.app`) if you want to restrict CORS to that origin.

#### Web (Meridian UI, built from /Helm) component

- **`NPM_CONFIG_PRODUCTION`** = `false` (BUILD_TIME) so devDependencies install during build.
- **Do not set `VITE_API_URL`** when using the default ingress (same app URL for web and `/api`). The app uses same-origin requests so `/api` is routed to the API. Only set `VITE_API_URL` (BUILD_TIME) if your API is on a **different** URL.

#### Database (db)

- Created by the spec; **api** gets `DATABASE_URL` via `${db.DATABASE_URL}`.

---

### 5. Static site (web) settings

- **Build command:** `npm install && npm run build`
- **Output directory:** `dist`
- **Index document:** `index.html`
- **Catchall document:** `index.html` (so SPA routes like `/board` work)

---

### 6. After first deploy

1. Open your app using its **main URL** (e.g. `https://meridian-xxxxx.ondigitalocean.app` from the app overview). The Meridian UI uses relative `/api` or `VITE_API_URL`, so it must be served from that same URL.
2. Check the API: open `https://your-app.ondigitalocean.app/api/health` — you should see `{"status":"ok","db":"connected","schema":true}`.

---

### 7. Quick checklist

- [ ] Repo and branch set correctly in app spec or UI.
- [ ] **api** `source_dir`: `/backend`.
- [ ] **web** `source_dir`: `/Helm`.
- [ ] **api** has `DATABASE_URL`, `NODE_ENV=production`, `PORT=8080`.
- [ ] **web** has `NPM_CONFIG_PRODUCTION=false` (BUILD_TIME). No need for `VITE_API_URL` — app uses relative `/api` URLs.
- [ ] **web** index and catchall document = `index.html`.
- [ ] Database (PostgreSQL) created and linked to **api**.

---

### 8. Troubleshooting

| Issue | Check |
|-------|--------|
| **Build failure** (non-zero exit / missing start) | **api**: `backend/package.json` must have a `"build"` script and `"start": "node server.js"`. **web**: `tailwindcss`, etc. in deps; `engines.node` set. |
| Blank page | Check browser console; ensure **web** build succeeded. |
| **“Cannot reach API”** | Open the app from its **main URL** (e.g. `https://your-app.ondigitalocean.app`), not a separate “web” or “static” link. The app uses relative `/api` URLs. **Redeploy the web component** after pulling the latest code, then open the main app URL. Verify API: open `https://your-app.ondigitalocean.app/api/health` — should return `{"status":"ok","db":"connected"}`. |
| “Failed to fetch” / API errors | **api** is running and has `DATABASE_URL`. Check `/api/health` in the browser. |
| 404 on refresh | Catchall document = `index.html` for the static site. |
| DB errors | **api** has `DATABASE_URL`; database is running and reachable. |

Health check URL: `https://your-app-url.ondigitalocean.app/api/health` — should return `{"status":"ok","db":"connected",...}`.

**If you still get a build or runtime error:** In the DigitalOcean dashboard go to your app → **Runtime Logs** or **Build Logs** for the failing component (api or web). Copy the **exact error message** (last 20–30 lines). Common causes: wrong **Source Directory** (must be `/backend` for api, `/Helm` for web), **Database** not linked to the api component, or wrong **Branch**.

---

### 9. Logs show old app (e.g. "helm-backend", "node src/index.js")

If Runtime Logs show **helm-backend** and **node src/index.js**, the component is **not** running Meridian. Meridian uses **meridian-backend** and **node server.js**.

**Fix:** See **[DO-DASHBOARD-CHECKLIST.md](DO-DASHBOARD-CHECKLIST.md)** for step-by-step DigitalOcean dashboard actions. In short: either **replace the entire App Spec** with the contents of `.do/app.yaml` (Option A), or fix the **revops** component’s **Branch** = `meridian`, **Source Directory** = `backend` or `/backend`, **Run Command** = `node server.js` (Option B), then **Force Build and Deploy** with **Clear Build Cache**.

---

### 10. "Deploy cluster proxy not ready" when viewing logs

This is a DigitalOcean platform message: the log viewer can’t connect to the deploy environment. It often happens when:

- **App structure doesn’t match the spec** — The spec defines two components: **api** (service) and **web** (static site). If the app was created manually and has a single component (e.g. named **revops**), the internal routing and proxy can be wrong and logs may never become available.

**What to do:**

1. **Use the app spec from the repo**  
   In the DO app: **Settings** → **App Spec** → **Edit**. Replace the spec with the contents of `.do/app.yaml` from the **meridian** branch (components must be named **api** and **web**). Save and deploy. Then try logs again after the new deployment finishes.

2. **Create a new app from the spec**  
   Create a new App → **Edit your App Spec** → paste the full contents of `.do/app.yaml` (from the meridian branch). Connect the same GitHub repo and **meridian** branch. This gives you the correct structure (api + web + db) and often fixes proxy/log issues.

3. **Check deployment status**  
   In **Activity** / **Deployments**, see if the latest deploy is **Failed** or **Live**. If it’s Failed, open that deployment and read the **build** or **deploy** error there (you don’t need runtime logs for that). If it’s Live, open the app URL to confirm it works.

4. **DigitalOcean status and support**  
   Check [status.digitalocean.com](https://status.digitalocean.com). If the problem continues, contact DigitalOcean support and mention “deploy cluster proxy not ready” when fetching logs for the app.
