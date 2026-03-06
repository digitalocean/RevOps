# Meridian — Project Intelligence UI

This folder is the **Meridian** web app (UI). It uses the **Meridian API** (workspaces, projects, items) for real data when available.

## Build & run

```bash
npm install
npm run dev    # local dev
npm run build  # production build
```

Output: `dist/`

## Meridian API

- **API base URL**: Set `VITE_API_URL` at build time (e.g. your DigitalOcean app URL), or use `?api_url=https://your-app.ondigitalocean.app` in the browser.
- When the API is reachable, work items from Meridian (workspaces, projects, items) are shown as initiatives in the grid and Gantt views.
- When the API is not configured or fails, the app falls back to demo/mock data.

## Deploy (DigitalOcean)

The app spec (`.do/app.yaml`) builds **this folder** (`/Helm`) as the static site. The API component is the Meridian backend (`/backend`). Push to `main` to deploy.
