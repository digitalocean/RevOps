# Meridian — Project Intelligence

Project and initiative management with Dashboard, Gantt, Analytics, and Meridian API.

## Stack

- **Web (Meridian UI)**: React 18 + Vite + Tailwind 4 + Radix UI — lives in **`/Helm`**
- **API**: Node.js + Express — **`/backend`**
- **Database**: PostgreSQL (schema applied on server startup)

## Quick start

```bash
# Backend
cd backend
npm install
cp .env.example .env   # set DATABASE_URL
npm start              # http://localhost:4000 (or PORT from env)

# Meridian UI (new terminal)
cd Helm
npm install
npm run dev            # http://localhost:5173
```

Set `VITE_API_URL` to your API URL when building for production, or use `?api_url=...` in the browser. No seed data — create workspaces, projects, and items from the UI.

## Scripts

| Location   | Scripts |
|-----------|---------|
| **backend** | `npm start`, `npm run dev` |
| **Helm** (Meridian UI) | `npm run dev`, `npm run build`, `npm run preview` |

## Deploy (DigitalOcean)

Use `.do/app.yaml`. The **web** component builds from **`/Helm`** (Meridian UI). Set `VITE_API_URL` to your app URL (BUILD_TIME). See `docs/DEPLOY-DIGITALOCEAN.md` for details.
