# Deploy Helm to DigitalOcean App Platform

## Structure

This repo is **Helm** (sprint/work management). One app, two components:

| Component | Type        | Source directory | Purpose                    |
|-----------|-------------|------------------|----------------------------|
| **db**    | Database    | —                | PostgreSQL                 |
| **api**   | Service     | `/backend`       | Node.js API (`/api`, `/health`) |
| **web**   | Static Site | `/frontend`      | React UI (build → `dist`)  |

Use `.do/app.yaml` as the app spec. Ingress: `/api` and `/health` → **api**; `/` → **web**.

## Required: VITE_API_URL (build time)

On the **static site (web)** component, add an env var:

- **Name:** `VITE_API_URL`
- **Value:** Your app URL, no trailing slash (e.g. `https://your-app-xxxxx.ondigitalocean.app`)
- **Scope:** **BUILD_TIME**

If this is missing or wrong, the UI can be blank or API calls can fail.

## Steps

1. Create an App (or use existing), connect GitHub repo and branch.
2. Use the spec from `.do/app.yaml`. Set your repo/branch and app URL.
3. Ensure **web** has `VITE_API_URL` at BUILD_TIME and **Index / Catchall document** = `index.html`.
4. Ensure **api** has `DATABASE_URL` (from managed DB), `NODE_ENV=production`, `PORT=8080`.
5. Deploy. Open your app URL — you should see the Helm UI (dark theme, anchor logo, sidebar).

## Blank page

- Confirm **Source directory** for the static site is **`/frontend`** (not e.g. `helm/frontend`).
- Confirm **VITE_API_URL** is set at **BUILD_TIME** for the static site.
- Check browser DevTools (F12) → Console and Network for errors or 404s.
