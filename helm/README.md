# Helm — Navigate Your Work

Premium dark-themed sprint and work management for engineering and product teams.

## Stack

- **Frontend**: React 18 + Vite + Tailwind CSS v3
- **Backend**: Node.js + Express
- **Database**: PostgreSQL 15
- **State**: React Context + useReducer
- **Routing**: React Router v6

## Quick start

**Important:** Run these commands from the `helm/` directory (or use full paths). The Helm app is in `helm/`, not the repo root.

```bash
# 1. Backend (from repo root: helm/backend)
cd helm/backend
npm install
cp .env.example .env
# Edit .env: set DATABASE_URL (PostgreSQL) and optionally OPENAI_API_KEY
npm run db:init
npm run dev
# API runs at http://localhost:4000

# 2. Frontend (new terminal; from repo root: helm/frontend)
cd helm/frontend
npm install
npm run dev
# Open http://localhost:5173 in your browser — you should see the Helm UI (dark theme, anchor logo, sidebar)
```

If you see a blank page: ensure you are visiting **http://localhost:5173** after starting `helm/frontend`, not the AgileOps app on another port. Check the browser console (F12) for errors.

## Scripts

- **Backend**: `start`, `dev`, `db:init`, `db:seed`
- **Frontend**: `dev`, `build`, `preview`
