# 🏔 Meridian — Peak Performance

> A premium project management tool built for engineering teams. Nautical-meets-alpine aesthetic with full dark theme, custom fields, Admin Center, Captain's Log, and voice logging.

---

## What's Inside

```
meridian/
├── demo/
│   └── meridian-demo.html     ← Fully working standalone demo (no server needed)
├── frontend/                  ← React + Vite frontend
│   ├── src/
│   │   ├── App.jsx            ← Main application (all views + components)
│   │   ├── api.js             ← API helper utility
│   │   ├── index.css          ← Full Meridian design system
│   │   └── main.jsx           ← React entry point
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── .env.example
├── backend/                   ← Node.js + Express API
│   ├── server.js              ← Main server
│   ├── routes/
│   │   ├── items.js           ← Work items (full CRUD)
│   │   ├── sprints.js         ← Expeditions
│   │   ├── projects.js        ← Campaigns
│   │   ├── crew.js            ← Team members
│   │   ├── log.js             ← Captain's Log entries
│   │   ├── trackers.js        ← Field Notes trackers
│   │   ├── customFields.js    ← Admin custom fields
│   │   ├── columns.js         ← Board columns
│   │   └── voice.js           ← Voice transcription (Whisper + fallback)
│   ├── scripts/
│   │   ├── init-db.js         ← Create all database tables
│   │   └── seed-db.js         ← Seed with Sprint 14 sample data
│   ├── package.json
│   └── .env.example
└── README.md
```

---

## Features

| Feature | Description |
|---|---|
| **Summit Board** | Kanban with 5 columns, drag-friendly, confetti on done |
| **Manifest** | Table view with toggleable columns, inline status cycling |
| **Expedition Map** | Gantt chart with status-colored bars |
| **Field Notes** | Multi-tab tracker (Big Rocks, OKRs, Risk Radar + custom tabs) |
| **Observatory** | Burndown chart + crew workload + sprint metrics |
| **Base Camp (Admin)** | Custom fields on items/projects/sprints, board columns, crew management |
| **Captain's Log** | Persistent sidebar for notes, voice logs, AI summaries |
| **Voice Log** | Browser mic → OpenAI Whisper transcription → create item or log note |
| **localStorage Persistence** | Everything saves instantly — reopens exactly where you left off |
| **PostgreSQL Backend** | Full REST API, 10 DB tables, seed data included |

---

## Quick Start — Standalone Demo (No Server)

The fastest way to see Meridian running:

1. Open `demo/meridian-demo.html` in **Chrome, Firefox, or Safari**
2. Everything works immediately — no install, no server
3. All data persists via `localStorage` in your browser
4. Click cards, add items, toggle Admin, log notes, record voice

---

## Option A — Local Development (Full Stack)

### Prerequisites

- **Node.js** v18+ — https://nodejs.org
- **PostgreSQL** v14+ — https://postgresql.org/download
- **npm** v9+

### Step 1 — Clone / Extract

```bash
unzip meridian.zip
cd meridian
```

### Step 2 — Set Up PostgreSQL

```bash
# macOS (Homebrew)
brew install postgresql@16
brew services start postgresql@16

# Ubuntu / Debian
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql

# Windows — download installer from https://postgresql.org/download/windows/
```

Create the database and user:

```bash
# Open psql as superuser
psql -U postgres

# Inside psql:
CREATE DATABASE meridian_db;
CREATE USER meridian_user WITH ENCRYPTED PASSWORD 'your_password_here';
GRANT ALL PRIVILEGES ON DATABASE meridian_db TO meridian_user;
\q
```

### Step 3 — Configure Backend

```bash
cd backend
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL=postgresql://meridian_user:your_password_here@localhost:5432/meridian_db
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Optional — enables real Whisper voice transcription
# OPENAI_API_KEY=sk-...
```

### Step 4 — Install & Initialize Database

```bash
# Install dependencies
npm install

# Create all tables
npm run db:init

# Seed with sample Sprint 14 data (DigitalOcean RevOps)
npm run db:seed
```

Expected output:
```
✅  All tables created successfully
✅  Database seeded successfully!
   Crew: 4 members
   Items: 7 work items in Sprint 14
   Trackers: 3 field note trackers
```

### Step 5 — Start Backend

```bash
npm run dev
# → 🏔 Meridian API running on port 4000
# → Health: http://localhost:4000/api/health
```

Verify it's working:
```bash
curl http://localhost:4000/api/health
# → {"status":"ok","db":"connected"}
```

### Step 6 — Configure & Start Frontend

Open a **new terminal**:

```bash
cd frontend
cp .env.example .env
# .env already has: VITE_API_URL=http://localhost:4000

npm install
npm run dev
# → Local: http://localhost:5173
```

Open **http://localhost:5173** — Meridian is running.

### Step 7 — Enable Voice (Optional)

To enable real AI voice transcription (OpenAI Whisper):

1. Get an API key at https://platform.openai.com
2. Add to `backend/.env`:
   ```env
   OPENAI_API_KEY=sk-your-key-here
   ```
3. Restart the backend: `npm run dev`

Without the key, voice uses demo mode (rotating sample transcripts).

---

## Option B — Deploy to DigitalOcean App Platform

App Platform handles infrastructure automatically — no servers to manage.

### Architecture on DO App Platform

```
App Platform
├── Frontend Service  (Static Site — Vite build)
├── Backend Service   (Web Service — Node.js)
└── Database          (Managed PostgreSQL — DO handles backups)
```

### Step 1 — Push to GitHub

```bash
# Initialize git
git init
git add .
git commit -m "Initial Meridian commit"

# Create a new repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/meridian.git
git push -u origin main
```

### Step 2 — Create App on DigitalOcean

1. Go to https://cloud.digitalocean.com/apps
2. Click **"Create App"**
3. Choose **GitHub** → authorize → select your `meridian` repo
4. Click **"Next"**

### Step 3 — Configure the Backend Service

DO will auto-detect the backend. Configure it:

| Setting | Value |
|---|---|
| **Name** | `meridian-backend` |
| **Source Directory** | `/backend` |
| **Run Command** | `node server.js` |
| **HTTP Port** | `4000` |
| **Plan** | Basic ($5/mo) |

Add **Environment Variables** (click Edit on the service):

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | *(set automatically when you add DB in Step 5)* |
| `FRONTEND_URL` | `https://your-app-name.ondigitalocean.app` *(fill after deploy)* |
| `OPENAI_API_KEY` | `sk-...` *(optional, for real voice transcription)* |

### Step 4 — Configure the Frontend Service

Click **"Add Component"** → **Static Site**:

| Setting | Value |
|---|---|
| **Name** | `meridian-frontend` |
| **Source Directory** | `/frontend` |
| **Build Command** | `npm install && npm run build` |
| **Output Directory** | `dist` |

Add **Build-Time Environment Variable**:

| Key | Value |
|---|---|
| `VITE_API_URL` | `https://meridian-backend.ondigitalocean.app` *(your backend URL)* |

### Step 5 — Add Managed PostgreSQL Database

1. In your App, click **"Add Component"** → **Database**
2. Choose **PostgreSQL**
3. Name it `meridian-db`
4. Plan: **Dev Database** ($7/mo) or **Basic** for production
5. DO automatically injects `DATABASE_URL` into your backend service

### Step 6 — Deploy

1. Click **"Next"** → Review the plan
2. Click **"Create Resources"**
3. Wait ~5 minutes for first deploy

### Step 7 — Initialize the Database

After deploy, open the **Console** tab of your backend service:

```bash
node scripts/init-db.js
node scripts/seed-db.js
```

Or use the DO CLI:
```bash
doctl apps console YOUR_APP_ID --component meridian-backend
node scripts/init-db.js && node scripts/seed-db.js
```

### Step 8 — Update FRONTEND_URL

1. Copy your backend URL from the DO dashboard (e.g. `https://meridian-backend-xxxxx.ondigitalocean.app`)
2. Go to backend service → Environment Variables
3. Update `FRONTEND_URL` to your frontend URL
4. Click **"Save"** → triggers a redeploy (2 min)

### Step 9 — Verify

```bash
# Health check
curl https://your-backend.ondigitalocean.app/api/health
# → {"status":"ok","db":"connected"}
```

Open your frontend URL — Meridian is live. 🏔

---

## Database Schema Reference

| Table | Purpose |
|---|---|
| `workspaces` | RevOps / Platform / Infra workspaces |
| `crew` | Team members with avatars, roles, online status |
| `projects` | Campaigns with owner and color |
| `board_columns` | Kanban columns (customizable, ordered) |
| `sprints` | Expeditions with dates and capacity |
| `items` | All work items — type, priority, points, assignee, custom_vals JSONB |
| `custom_fields` | Admin-defined custom fields per target (item/project/sprint) |
| `column_prefs` | Per-user column visibility preferences |
| `log_entries` | Captain's Log entries (note/voice/ai) |
| `trackers` | Field Notes trackers (Big Rocks, OKRs, Risk Radar + custom) |
| `tracker_rows` | Rows within each tracker (stored as JSONB) |
| `voice_recordings` | Voice transcription history |

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health check + DB status |
| GET/POST | `/api/items` | List or create work items |
| PATCH/DELETE | `/api/items/:id` | Update or delete item |
| GET/POST | `/api/sprints` | List or create sprints |
| GET/POST | `/api/projects` | List or create campaigns |
| GET/POST | `/api/crew` | List or create crew members |
| GET/POST | `/api/log` | List or create Captain's Log entries |
| GET/POST | `/api/trackers` | List or create Field Note trackers |
| GET/POST | `/api/trackers/:id/rows` | Tracker rows |
| GET/POST | `/api/custom-fields` | List or create custom fields |
| DELETE | `/api/custom-fields/:id` | Remove custom field |
| GET/POST/PATCH/DELETE | `/api/columns` | Board columns CRUD |
| POST | `/api/voice/transcribe` | Transcribe audio (Whisper or demo) |
| POST | `/api/voice/create` | Create item/log from transcript (GPT-4o or demo) |

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `PORT` | ✅ | Server port (default: 4000) |
| `NODE_ENV` | ✅ | `development` or `production` |
| `FRONTEND_URL` | ✅ | Frontend URL for CORS |
| `OPENAI_API_KEY` | Optional | Enables real Whisper + GPT-4o voice |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | ✅ | Backend API URL |

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Cmd/Ctrl + L` | Toggle Captain's Log |
| `Escape` | Close any open modal |

---

## Troubleshooting

**"Cannot connect to database"**
```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432
# If not: brew services start postgresql@16 (macOS)
```

**"CORS error" in browser**
- Make sure `FRONTEND_URL` in `backend/.env` matches exactly what's in your browser URL bar
- Include the port: `http://localhost:5173`

**Frontend shows "API Error"**
- Make sure backend is running on port 4000
- Check `frontend/.env` has `VITE_API_URL=http://localhost:4000`
- Try: `curl http://localhost:4000/api/health`

**Voice doesn't work**
- Without `OPENAI_API_KEY`, voice uses demo mode (this is fine — click record then stop)
- Browser must be on `http://localhost` or `https://` for microphone access

**DO App Platform build fails**
- Check build logs in DO dashboard → Deployments tab
- Ensure `Source Directory` is set correctly (`/backend` and `/frontend`)
- Make sure `DATABASE_URL` is set in backend environment variables

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5 |
| Styling | Pure CSS with CSS custom properties |
| Fonts | Playfair Display, Plus Jakarta Sans, Fira Code |
| Icons | Font Awesome 6 |
| Backend | Node.js, Express 4 |
| Database | PostgreSQL 14+ (pg driver) |
| Voice AI | OpenAI Whisper + GPT-4o (optional) |
| Hosting | DigitalOcean App Platform |

---

## Standalone Demo Note

`demo/meridian-demo.html` is a completely self-contained version with:
- All 6 views working (Board, Manifest, Gantt, Field Notes, Observatory, Admin)
- localStorage persistence (survives page reloads)
- Voice simulation
- Confetti celebration
- Captain's Log
- Admin Center with custom fields
- Full design system

Use it for demos, pitches, or development reference — no dependencies required.
