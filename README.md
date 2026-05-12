# To-DO (Meridian) — RevOps Project Management

A full-stack, production-quality project management app built with React 18 + Vite + Node.js + PostgreSQL.

---

## ⚡ Quick Start

### Prerequisites
- **Node.js** v18+ — [nodejs.org](https://nodejs.org)
- **PostgreSQL** 14+ — `brew install postgresql@16` (Mac) or [postgresql.org](https://www.postgresql.org/download/)

### 1. Setup

```bash
# Run the one-time setup script (creates DB, installs deps, runs migrations)
bash setup.sh
```

### 2. Start

```bash
bash start.sh
# Frontend: http://localhost:5173
# Backend:  http://localhost:4000
```

Or run separately:
```bash
# Terminal 1
cd backend && npm start

# Terminal 2
cd Helm && npm run dev
```

---

## ✨ Features — All 20 + 3 Surprise Bonuses

### Bug Fixes
1. ✅ GlobalSearch uses real API data (not mock)
2. ✅ Kanban opens TaskDetailDrawer
3. ✅ KPI bar live-updates via WebSocket

### High Impact
4. ✅ Empty project state with quick-start actions
5. ✅ My Tasks — cross-project personal inbox
6. ✅ Recurring tasks (daily/weekly/monthly) in task drawer
7. ✅ Notifications bell with real-time @mention alerts
8. ✅ Due date banner (today + overdue tasks)

### UX Polish
9. ✅ Kanban card density (avatar, due date, priority, progress bar)
10. ✅ Sidebar tasks clickable (opens drawer)
11. ✅ Mobile-responsive layout with hamburger sidebar
12. ✅ Prominent "+ Add task" row in trackers
13. ✅ Drag-to-reorder tasks within sections
14. ✅ Analytics velocity chart fixed

### Differentiating Features
15. ✅ Time tracking — log hours per task with notes
16. ✅ Task dependencies — "blocked by" relationships
17. ✅ Project templates (3 built-in, apply to new project)
18. ✅ @mention notifications (stored + surfaced in bell)
19. ✅ Milestone diamonds on Gantt timeline
20. ✅ Dynamic document.title per view/project

### 🎁 Surprise Bonuses
- 🍅 **Pomodoro Focus Timer** — 25/5 min work-break cycles, logs time to tasks automatically
- 👥 **Team Workload View** — See who's overloaded, blocked counts, click to assign
- 📈 **Analytics Velocity Fix** — Status normalization so chart actually shows completions

---

## 🔑 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘K` | Global search |
| `?` | Show all shortcuts |
| `J / K` | Navigate tasks |
| `E` | Open task drawer |
| `Space` | Mark complete |
| `⌘⌫` | Delete task |
| `⌘A` | Select all |

---

## 🗂 Structure

```
agileops/
├── Helm/src/app/           # React frontend
│   ├── pages/Dashboard.tsx # Main page with all views
│   ├── components/         # 50+ components
│   ├── data/useMeridianData.ts
│   └── hooks/
├── backend/
│   ├── server.js           # Express + WebSocket
│   ├── routes/             # REST API
│   └── scripts/schema.sql  # Auto-migrating DB schema
├── setup.sh                # One-time setup
└── start.sh                # Launch everything
```

---

## 🔒 Auth

Session-based. Register at the login screen or via API:
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Raj","email":"raj@example.com","password":"password123"}'
```

---

## 🚀 Deploy (DigitalOcean App Platform)

The repo is ready for DigitalOcean App Platform using **`app.yaml`** (root) or **`.do/app.yaml`**.  
**External / existing Postgres:** use **`app-production.yaml`** (generic `api` / `web` names). **Live stingray-app** (`revops` / `revops-helm`): use **`app-stingray.yaml`**.  
**Full step-by-step (ingress, env vars, fixing Activity panel):** see **[docs/DEPLOY-DIGITALOCEAN.md](docs/DEPLOY-DIGITALOCEAN.md)**.

### Required environment variables

| Variable | Service | Description |
|----------|---------|-------------|
| `DATABASE_URL` | api | Provided by the linked database (e.g. `db.DATABASE_URL`) |
| `SESSION_SECRET` | api | **Required in production.** Use a long random string so session cookies are signed. |
| `VITE_API_URL` | web (build) | Set to your app’s public URL (e.g. `https://your-app-xxxx.ondigitalocean.app`) so the frontend can call the API. |

### Repo layout expected by the spec

- **API service**: `source_dir: /backend` — runs `npm start` (`node server.js`) on port 8080.
- **Web (static)**: `source_dir: /Helm` — runs `npm run build`, serves `dist/`.

Push a branch that has `backend/` and `Helm/` at the repo root. In App Spec, set the **web** component’s build env `VITE_API_URL` to your app URL (same URL you open in the browser). After deploy, the UI will call that URL for `/api/*`.
