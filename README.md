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
cd backend
npm install
cp .env.example .env   # set DATABASE_URL and optionally OPENAI_API_KEY
npm run db:init
npm run dev            # http://localhost:4000

# Frontend (new terminal)
cd frontend
npm install
npm run dev            # http://localhost:5173
```

## Scripts

| Location   | Scripts |
|-----------|---------|
| **backend**  | `npm start`, `npm run dev`, `npm run db:init`, `npm run db:seed` |
| **frontend** | `npm run dev`, `npm run build`, `npm run preview` |

## Deploy (DigitalOcean)

- Use `.do/app.yaml`. Set `VITE_API_URL` to your app URL (BUILD_TIME) on the static site.
- See `docs/DEPLOY-DIGITALOCEAN.md` for details.
