# Meridian — Peak Performance

Project and sprint management with Summit Board, Expeditions, Field Notes, and Captain's Log.

## Stack

- **Frontend**: React 18 + Vite
- **Backend**: Node.js + Express
- **Database**: PostgreSQL (schema applied on server startup)

## Quick start

```bash
# Backend
cd backend
npm install
cp .env.example .env   # set DATABASE_URL
npm start              # runs schema init then http://localhost:4000

# Frontend (new terminal)
cd frontend
npm install
npm run dev            # http://localhost:5173 (proxies /api to backend)
```

No seed data — create **teams** (workspaces), then **projects**, then **sprints** from the UI. On first run, one workspace "My Team" is created if the table is empty. If the UI shows "Cannot reach API", start the backend and set `DATABASE_URL` in `backend/.env` (copy from `backend/.env.example`).

## Scripts

| Location  | Scripts |
|----------|---------|
| **backend**  | `npm start`, `npm run dev`, `npm run db:init`, `npm run db:seed` |
| **frontend** | `npm run dev`, `npm run build`, `npm run preview` |

## Push to GitHub

See **`docs/PUSH-TO-GITHUB.md`** for steps to push Meridian code to GitHub (branch `meridian`).

## Deploy (DigitalOcean)

Use `.do/app.yaml`. Set `VITE_API_URL` to your app URL (BUILD_TIME) on the static site so the frontend can reach the API. See `docs/DEPLOY-DIGITALOCEAN.md` for details.
