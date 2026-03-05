# Helm — Navigate Your Work

Premium dark-themed sprint and work management for engineering and product teams.

## Stack

- **Frontend**: React 18 + Vite + Tailwind CSS v3
- **Backend**: Node.js + Express
- **Database**: PostgreSQL 15
- **State**: React Context + useReducer
- **Routing**: React Router v6

## Quick start

```bash
# Backend
cd backend && npm install && cp .env.example .env && npm run db:init && npm run dev

# Frontend (new terminal)
cd frontend && npm install && npm run dev
```

Set `DATABASE_URL` and optional `OPENAI_API_KEY` in `backend/.env`.

## Scripts

- **Backend**: `start`, `dev`, `db:init`, `db:seed`
- **Frontend**: `dev`, `build`, `preview`
