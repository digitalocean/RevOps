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
| **web**   | Static Site | `/frontend`       | `npm run build` → serve `dist` |

- **Ingress:** Requests to `/api/*` go to **api**; everything else (`/`) goes to **web** (React SPA).

---

### 3. Using the App Spec (`.do/app.yaml`)

If you use **Edit your App Spec** in the dashboard:

1. Paste or sync from the repo the contents of **`.do/app.yaml`**.
2. **Replace these** with your values:
   - **`github.repo`** – your GitHub repo (e.g. `your-username/agileops-full`).
   - **`github.branch`** – branch to deploy (e.g. `main`).
   - **`VITE_API_URL`** (under `static_sites.web.envs`) – your app’s public URL with **no trailing slash**, e.g.  
     `https://meridian-xxxxx.ondigitalocean.app`  
     (You can set this after the first deploy; use the URL DigitalOcean gives the app.)

3. Save and deploy.

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

#### Web (frontend) component

| Variable        | Scope     | Value / Notes |
|-----------------|-----------|----------------|
| **`VITE_API_URL`** | **BUILD_TIME** | Your app URL, **no trailing slash**, e.g. `https://meridian-xxxxx.ondigitalocean.app` |

- **BUILD_TIME** is required so the frontend is built with the correct API base URL.
- If this is wrong or missing, the UI may load but API calls will fail or go to the wrong host.

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

1. Copy the app URL (e.g. `https://meridian-xxxxx.ondigitalocean.app`).
2. In the **web** component, set **`VITE_API_URL`** to that URL (BUILD_TIME).
3. Redeploy the **web** component so the frontend is rebuilt with the correct API URL.

---

### 7. Quick checklist

- [ ] Repo and branch set correctly in app spec or UI.
- [ ] **api** `source_dir`: `/backend`.
- [ ] **web** `source_dir`: `/frontend`.
- [ ] **api** has `DATABASE_URL`, `NODE_ENV=production`, `PORT=8080`.
- [ ] **web** has `VITE_API_URL` = app URL (no trailing slash), scope **BUILD_TIME**.
- [ ] **web** index and catchall document = `index.html`.
- [ ] Database (PostgreSQL) created and linked to **api**.

---

### 8. Troubleshooting

| Issue | Check |
|-------|--------|
| **Build failure** (non-zero exit / missing start) | **api**: `backend/package.json` must have a `"build"` script (e.g. `"build": "echo 'No build step'"`) and `"start": "node server.js"`. Node in `engines` (e.g. `"node": "20.x"`). **web**: `tailwindcss`, `postcss`, `autoprefixer` in devDependencies; `engines.node` set. |
| Blank page | `VITE_API_URL` set at **BUILD_TIME** for web; correct app URL. |
| “Failed to fetch” / API errors | App URL in `VITE_API_URL` matches the app domain; **api** is healthy (e.g. `/api/health`). |
| 404 on refresh | Catchall document = `index.html` for the static site. |
| DB errors | **api** has `DATABASE_URL`; database is running and reachable. |

Health check URL: `https://your-app-url.ondigitalocean.app/api/health` — should return `{"status":"ok","db":"connected",...}`.
