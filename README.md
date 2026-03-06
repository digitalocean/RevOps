# Meridian — Project Intelligence

Uses **Helm** as the only UI. Backend = Meridian API (Node + Express + PostgreSQL).

## Stack

- **Helm** (Meridian UI): React 18 + Vite + Tailwind 4 + Radix UI — **`/Helm`**
- **API**: Node.js + Express — **`/backend`**
- **Database**: PostgreSQL (schema applied on server startup)

## Quick start

```bash
# Backend (API + DB)
cd backend
npm install
cp .env.example .env   # set DATABASE_URL
npm start              # http://localhost:4000 (or PORT from env)

# Helm UI (new terminal)
cd Helm
npm install
npm run dev            # http://localhost:5173
```

Set `VITE_API_URL` to your API URL when building for production (e.g. your DigitalOcean app URL), or use `?api_url=...` in the browser.

## Scripts

| Location   | Scripts |
|------------|---------|
| **backend** | `npm start`, `npm run dev` |
| **Helm**  | `npm run dev`, `npm run build`, `npm run preview` |

## Deploy (DigitalOcean)

Use `.do/app.yaml`. The **web** component builds from **`/Helm`**. Set `VITE_API_URL` (BUILD_TIME) to your app URL. See `docs/DEPLOY-DIGITALOCEAN.md`.
