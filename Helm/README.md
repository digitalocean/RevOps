# Helm — Project Intelligence UI

Helm is the frontend for the **helm-deploy** branch. It uses the **Meridian API** (workspaces, projects, items) for real data when available.

## Build

```bash
npm install
npm run build
```

Output: `dist/`

## Meridian integration

- **API base URL**: Set `VITE_API_URL` at build time (e.g. your DigitalOcean app URL), or use `?api_url=https://your-app.ondigitalocean.app` in the browser.
- When the API is reachable, work items from Meridian (workspaces, projects, items) are shown as initiatives in the grid and Gantt views.
- When the API is not configured or fails, the app falls back to demo/mock data.

## Deploy (DigitalOcean)

On the **helm-deploy** branch, the app spec (`.do/app.yaml`) builds this folder as the static site (`source_dir: /Helm`). The API component remains the Meridian backend (`/backend`). Push to `helm-deploy` to deploy.
