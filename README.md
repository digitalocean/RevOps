
<<<<<<< HEAD
> **Written for non-technical users.** Every step is explained from scratch.  
> If you get stuck anywhere, the error message usually tells you exactly what to fix.

---

## What is AgileOps?

AgileOps is a sprint management tool — like a private version of Jira or Asana — built specifically for your team. It has:

- **Board view** — Kanban-style drag and drop cards across columns
- **List view** — Spreadsheet-style with inline editing
- **Gantt chart** — Visual timeline of your sprint
- **Metrics dashboard** — Burndown charts, team workload, velocity
- **Team Members** — Add/edit/deactivate people in the system
- **Projects & Sprints** — Organize work into projects and time-boxed sprints

The app has two parts:
1. **Frontend** — What you see in the browser (React app)
2. **Backend** — A server that talks to a database (Node.js + PostgreSQL)

---

## Part 1 — Run it on your Mac (Local Development)

### Step 1: Install the tools you need

You only do this once, ever.

**A. Install Homebrew** (Mac's app store for developers)

Open the **Terminal** app (press `⌘ Space`, type "Terminal", press Enter).

Paste this and press Enter:
```
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```
Follow the prompts. It will ask for your Mac password (you won't see it as you type — that's normal).

**B. Install Node.js** (runs the backend server)
```
brew install node
```
Verify it worked:
```
node --version
```
You should see something like `v20.12.0`. Any number above 18 is fine.

**C. Install PostgreSQL** (the database)
```
brew install postgresql@15
brew services start postgresql@15
```
Then add it to your path (copy the whole line):
```
echo 'export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc
```

**D. Install Git** (to manage code versions)
```
brew install git
```

---

### Step 2: Set up the database

In Terminal, create the database:
```
createdb agileops
```

That's it — PostgreSQL is running and an empty database called `agileops` is ready.

---

### Step 3: Set up the Backend (the server)

In Terminal, navigate into the backend folder:
```
cd /path/to/agileops-full/backend
```
> **Tip:** If you downloaded and unzipped the project to your Downloads folder, it would be:  
> `cd ~/Downloads/agileops-full/backend`

Install dependencies (packages the server needs):
```
npm install
```

Copy the environment settings file:
```
cp .env.example .env
```

Open `.env` in a text editor (TextEdit or any editor). Change this line:
```
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/agileops
```
to:
```
DATABASE_URL=postgresql://your-mac-username@localhost:5432/agileops
```
> **How to find your Mac username:** In Terminal, type `whoami` and press Enter. Use that.  
> On a Mac, local PostgreSQL usually doesn't need a password — just remove `:yourpassword`.

**Create the tables:**
```
npm run db:init
```
You should see: `✅ Schema created successfully!`

**Load the sample data (Sprint 14 with 7 items):**
```
npm run db:seed
```
You should see: `✅ Sample data loaded!`

**Start the backend server:**
```
npm run dev
```
You should see: `🚀 AgileOps API running on http://localhost:4000`

> Leave this Terminal window open. Open a new Terminal tab for the next step (`⌘ T`).

---

### Step 4: Set up the Frontend (the website)

In your new Terminal tab:
```
cd /path/to/agileops-full/frontend
npm install
npm run dev
```

You should see something like:
```
  VITE v5.x  ready in 300ms
  ➜  Local: http://localhost:5173/
```

**Open your browser and go to:** `http://localhost:5173`

🎉 AgileOps is running on your Mac!

---

### How to stop the servers

In each Terminal window, press `Control + C` to stop.

### How to start again next time

```
# Start PostgreSQL (if it's not already running)
brew services start postgresql@15

# Start backend (in one Terminal tab)
cd /path/to/agileops-full/backend && npm run dev

# Start frontend (in another Terminal tab)
cd /path/to/agileops-full/frontend && npm run dev
```

---

## Part 2 — Deploy to DigitalOcean App Platform (Full Setup)

This section walks you through setting up AgileOps on DigitalOcean App Platform with **PostgreSQL**, **API**, and **frontend** — the same pieces you use locally.

> **App spec and “ingress” errors:** For a concise explanation of the setup (one app, no custom ingress, why the “path / already in use” error happens and how to fix it), see **[docs/DEPLOY-DIGITALOCEAN.md](docs/DEPLOY-DIGITALOCEAN.md)**.

### What you need

- A [DigitalOcean account](https://cloud.digitalocean.com) (sign up with GitHub is fine)
- This project pushed to a **GitHub** repository (DigitalOcean will read from it)
- Approximate cost: **~\$12–24/month** (app components + managed PostgreSQL)

---

## Part 2a — Step-by-step in the DigitalOcean dashboard (recommended)

Follow these in order: one app with API + frontend + PostgreSQL, then run schema and seed once.

### Step 1: Open App Platform and create a new app

1. Go to [cloud.digitalocean.com](https://cloud.digitalocean.com) → **Apps** in the left sidebar.
2. Click **Create App**.
3. Choose **GitHAgileub** as the source.
4. If asked, **authorize DigitalOcean** to access your GitHub (or your organization). Ensure the repo that contains AgileOps is in the list.
5. Select the **repository** that has this code (e.g. `agileops` or `RevOps`).
6. Select the **branch** (e.g. `main`).
7. Click **Next**. Do **not** create resources yet — we will add the database and set source directories first.

---

### Step 2: Add the database (PostgreSQL)

1. On the **Resources** / **Components** screen, click **Add Resource** (or **Add Component**).
2. Choose **Database** → **Create and attach a new database** (or **Dev Database**).
3. Pick **PostgreSQL** (e.g. PostgreSQL 15).
4. Name it something like `db` (or leave default). This will be used for the connection variable name.
5. Choose a **region** (same as your app, e.g. New York).
6. Select the **plan** (e.g. Basic \$15/mo for production; Dev Database is cheaper for testing).
7. Click **Add** / **Create**.  
   DigitalOcean will create the database and, once you link it to the API (below), inject **`DATABASE_URL`** into your API service automatically.

---

### Step 3: Configure the API (backend) component

You should see at least one component (often a single “service” or “web” detected from the repo).

1. Click the **backend/API** component (or the one you want to use as the API). If you only have one component, we’ll turn it into the API and add the frontend next.
2. Open **Settings** or **Edit** for that component.
3. Set the **Source Directory** to **`backend`**.  
   (This is required so the build runs inside `backend/`, where `package.json` lives.)
4. Set **Build Command** to:  
   `npm install`  
   (or leave blank if the Node buildpack already does this.)
5. Set **Run Command** to:  
   `npm start`
6. **Environment variables** (Settings → Environment Variables):
   - **`NODE_ENV`** = `production`
   - **`FRONTEND_URL`** = your frontend URL. You won’t have it yet; use a placeholder first, e.g. `https://your-app-name.ondigitalocean.app`, and **update it after** the frontend is deployed (see Step 5).
   - **Database:** If you added a database in Step 2, **link it** to this component:
     - Add Resource / Edit component → **Database** (or “Bind database”).
     - Select the database you created (e.g. `db`).
     - App Platform will add **`DATABASE_URL`** automatically (you don’t type it by hand).
   - If you’re using an **existing** managed database instead, add **`DATABASE_URL`** manually and paste the connection string (including `?sslmode=require` for DO managed DBs).
7. Save the component.

---

### Step 4: Add the frontend (static site) component

1. Click **Add Resource** again.
2. Choose **Static Site** (or **Website** → Static).
3. Select the **same GitHub repo and branch**.
4. Open **Settings** for this new component.
5. Set **Source Directory** to **`frontend`**.
6. Set **Build Command** to:  
   `npm install && npm run build`
7. Set **Output Directory** to:  
   `dist`
8. **Environment variables:**
   - **`VITE_API_URL`** = your **API** URL. After the first deploy you’ll get something like `https://api-xxxxx.ondigitalocean.app`. Put that here (no trailing slash).  
   - If you don’t have the API URL yet, use a placeholder, deploy once, then come back and set **`VITE_API_URL`** and **rebuild** the frontend.
9. Save the component.

---

### Step 5: Deploy and get URLs

1. Click **Next** through any remaining screens (e.g. plan, region).
2. Click **Create Resources** (or **Deploy**).
3. Wait for the build and deploy to finish (a few minutes).
4. In the app’s **Overview** or **Live App** section, copy:
   - The **API** URL (e.g. `https://api-xxxxx.ondigitalocean.app`).
   - The **frontend** URL (e.g. `https://web-xxxxx.ondigitalocean.app` or `https://your-app-name.ondigitalocean.app`).

---

### Step 6: Point frontend to API and allow CORS

1. In your app, open the **frontend (static site)** component → **Settings** → **Environment Variables**.
2. Set **`VITE_API_URL`** to the **exact** API URL from Step 5 (e.g. `https://api-xxxxx.ondigitalocean.app`).
3. Save and **trigger a new deploy** for the frontend (e.g. “Deploy” or “Redeploy”), so the new value is baked into the build.
4. Open the **API** component → **Settings** → **Environment Variables**.
5. Set **`FRONTEND_URL`** to your **frontend** URL from Step 5 (e.g. `https://web-xxxxx.ondigitalocean.app`).  
   This lets the API accept requests from your frontend (CORS).
6. Save; the API will redeploy if needed.

---

### Step 7: Create tables and load sample data (like local `db:init` and `db:seed`)

Locally you run `npm run db:init` and `npm run db:seed` in `backend/`. On DigitalOcean you use the **same** schema and seed, but run them **against the cloud database**.

**Option A — From your computer (easiest)**

1. In DigitalOcean, open your **Database** (the one attached to the app) → **Connection details** (or **Users & Databases**).
2. Copy the **connection string** (e.g. `postgresql://doadmin:...@...ondigitalocean.com:25060/defaultdb?sslmode=require`).  
   If you use a **dev database** created with the app, its connection info is also under the database component.
3. On your Mac, in Terminal, go to the backend folder and run (replace `YOUR_CONNECTION_STRING` with the value you copied):

```bash
cd /path/to/agileops-full/backend
DATABASE_URL="YOUR_CONNECTION_STRING" npm run db:init
DATABASE_URL="YOUR_CONNECTION_STRING" npm run db:seed
```

You should see “Schema created successfully” and “Sample data loaded”.

**Option B — In the DigitalOcean database console**

1. In DigitalOcean, open your **Database** → **Connection Details**.
2. Use **“Open in Console”** or the **Web SQL console** (if available).
3. Create the schema: copy the entire contents of `backend/src/db/schema.sql` and run it in the console.
4. Then copy the contents of `backend/src/db/seed.sql` and run it to load sample data.

After this, your app platform database has the same structure and sample data as your local one.

---

### Step 8: Open the app

1. In a browser, open the **frontend** URL (from Step 5), not the API URL.
2. You should see AgileOps (e.g. Sprint 14 sample data if you ran the seed).
3. If the frontend shows “Network Error” or empty data, double-check:
   - **`VITE_API_URL`** is set to the API URL and the frontend was **redeployed** after setting it.
   - **`FRONTEND_URL`** on the API is set to the frontend URL (for CORS).

---

### Quick checklist (same as local, but on App Platform)

| Local                         | DigitalOcean App Platform                                      |
|------------------------------|-----------------------------------------------------------------|
| PostgreSQL (`createdb agileops`) | Add Database resource (PostgreSQL); link to API → `DATABASE_URL` |
| `backend/.env` → `DATABASE_URL` | Injected by DB link or set manually                             |
| `npm run db:init`             | Run once via `DATABASE_URL=... npm run db:init` or run schema.sql in DO console |
| `npm run db:seed`             | Run once via `DATABASE_URL=... npm run db:seed` or run seed.sql in DO console |
| `backend` runs on port 4000   | API component, Run: `npm start`; DO sets `PORT`                |
| `FRONTEND_URL` in backend    | Env var on API component = frontend URL                         |
| `frontend` → `VITE_API_URL`   | Env var on static site = API URL; rebuild after change          |
| Open `http://localhost:5173` | Open the **frontend** app URL in the browser                    |

---

## Part 2b — Put your code on GitHub (if not already)

1. Go to [github.com](https://github.com) and create a free account if you don't have one
2. Click **"New repository"** (green button, top right)
3. Name it `agileops`, set it to **Private**, click **Create repository**
4. In Terminal, inside your `agileops-full` folder:

```bash
git init
git add .
git commit -m "Initial AgileOps setup"
git branch -M main
git remote add origin https://github.com/YOUR-GITHUB-USERNAME/agileops.git
git push -u origin main
```
> Replace `YOUR-GITHUB-USERNAME` with your actual GitHub username.

---

### Alternative: Separate database + two apps (Steps B–E)

If you prefer to create a **standalone** PostgreSQL cluster in the Databases section and then create **two separate apps** (one for API, one for frontend), follow these steps.

### Step B: Create the PostgreSQL Database on DigitalOcean (standalone)

1. Log into [cloud.digitalocean.com](https://cloud.digitalocean.com)
2. Click **"Create"** (top right, green button) → **"Databases"**
3. Choose:
   - **Database engine:** PostgreSQL 15
   - **Plan:** Basic ($15/month) — the cheapest option
   - **Region:** New York (or whichever is closest to you)
   - **Name:** `agileops-db`
4. Click **Create Database Cluster**
5. Wait 2-3 minutes for it to finish

**Get your connection string:**

After it's created, click on your database → **"Connection Details"**. Look for the **"Connection string"** field — it looks like:
```
postgresql://doadmin:YOURPASSWORD@db-agileops-do-user-XXXXX-0.b.db.ondigitalocean.com:25060/defaultdb?sslmode=require
```
Copy this — you'll need it in Step C.

**Run the schema on DigitalOcean's database:**

Still on the Connection Details page, click **"Open in Console"** (it opens a terminal in your browser). Paste:
```sql
-- Copy and paste the entire contents of backend/src/db/schema.sql here
```
> **Easier way:** On the same page, click **"Download CA Certificate"**, then use the **"Connection Parameters"** to connect from your Terminal:
> ```
> psql "postgresql://doadmin:YOURPASSWORD@your-host:25060/defaultdb?sslmode=require" -f backend/src/db/schema.sql
> ```

To load the sample data too:
```
psql "postgresql://doadmin:YOURPASSWORD@your-host:25060/defaultdb?sslmode=require" -f backend/src/db/seed.sql
```

---

### Step C: Deploy the Backend to DigitalOcean App Platform

1. Click **"Create"** → **"App"**
2. Click **"GitHub"** → authorize DigitalOcean to access your GitHub
3. Select your `agileops` repository, branch `main`
4. DigitalOcean will detect it's a Node.js app. If it doesn't, set:
   - **Source directory:** `/backend`
   - **Build command:** `npm install`
   - **Run command:** `npm start`
5. Click **"Edit Plan"** → choose **Basic ($5/month)**
6. Click **"Next: Environment Variables"** and add:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | your connection string from Step B |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | `https://your-app-name.ondigitalocean.app` (you'll update this after) |

7. Click **"Create Resources"**
8. Wait ~3 minutes. You'll get a URL like `https://agileops-backend-xxxxx.ondigitalocean.app`

---

### Step D: Deploy the Frontend to DigitalOcean App Platform

1. Click **"Create"** → **"App"** again
2. Select the same `agileops` repository
3. Set:
   - **Source directory:** `/frontend`
   - **Build command:** `npm install && npm run build`
   - **Output directory:** `dist`
4. Add environment variable:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | your backend URL from Step C (e.g. `https://agileops-backend-xxxxx.ondigitalocean.app`) |

5. Click **"Create Resources"**

After ~5 minutes, you'll have a live URL for your frontend. Update the `FRONTEND_URL` in your backend settings to match.

---

### Step E: Update the frontend to point to your backend

Open `frontend/.env.production` and set:
```
VITE_API_URL=https://agileops-backend-xxxxx.ondigitalocean.app
```
Commit and push — DigitalOcean will auto-redeploy:
```bash
git add .
git commit -m "Set production API URL"
git push
```

---

## Part 3 — Database Schema (What tables exist and why)

Think of the database like a set of spreadsheets that are linked together.

```
team_members          — The people on your team (add/edit in the app UI)
│
├── projects          — Containers for your work (e.g., "RevOps Initiative")
│   │
│   └── sprints       — Time-boxed cycles inside a project (e.g., "Sprint 14")
│       │
│       └── work_items — Epics, stories, bugs, tasks
│           ├── criteria  — Acceptance checklist for each item
│           ├── comments  — Discussion thread
│           ├── approvers — Who needs to sign off
│           ├── blockers  — What's blocking this item
│           └── item_labels — Tags applied to this item
│
└── labels            — Reusable tags (e.g., "Salesforce", "P0 Bug")

activity_log          — Every change ever made (full audit trail)
```

### How items relate to each other

- One **project** has many **sprints**
- One **sprint** has many **work items**
- One **work item** can have one **assignee** (a team member)
- One **work item** can have many **labels**, **criteria**, **comments**, **approvers**
- One **work item** can be blocked by other **work items**

---

## Part 4 — How to Import Data

### Option A: Use the seed file (recommended for first time)

This loads all the Sprint 14 sample data automatically:
```bash
# Local
npm run db:seed

# DigitalOcean (replace with your actual connection string)
psql "postgresql://doadmin:YOURPASSWORD@your-host:25060/defaultdb?sslmode=require" \
  -f backend/src/db/seed.sql
```

### Option B: Import your own data via SQL

Open `backend/src/db/seed.sql` in any text editor. You'll see it's just regular English-like commands:

```sql
-- Add a team member
INSERT INTO team_members (name, email, role, avatar, color)
VALUES ('John Smith', 'john@company.com', 'Developer', 'JS', '#6366f1');

-- Add a project
INSERT INTO projects (name, description, color)
VALUES ('My Project', 'Description here', '#7c6af7');
```

Copy the format and fill in your real names. Then run the file the same way.

### Option C: Import via the App UI

- **Team members:** Go to the **Team** tab → click **+ Add Member** — fill in the form
- **Projects:** Click **Projects** → **+ New Project**
- **Work items:** In any view, click **+ Add item** or **+ Add a row**

### Option D: Import from a CSV file

If you have data in Excel or Google Sheets:

1. Export as CSV
2. Use this script to convert it (run from the `scripts` folder):

```bash
node scripts/import-csv.js your-file.csv
```

The CSV should have these columns:
```
title, type, status, priority, points, assignee_email, description
```

---

## Part 5 — Useful Commands Cheat Sheet

```bash
# ─── Local Development ────────────────────────────────────────
brew services start postgresql@15     # Start database
npm run dev                           # Start backend server (in /backend)
npm run dev                           # Start frontend (in /frontend)

# ─── Database ────────────────────────────────────────────────
npm run db:init                       # Create all tables (run once)
npm run db:seed                       # Load sample Sprint 14 data
psql agileops                         # Open database console (local)
\dt                                   # List all tables (inside psql)
\q                                    # Quit psql

# ─── Check if backend is working ─────────────────────────────
curl http://localhost:4000/health     # Should return {"status":"ok"}

# ─── Git (push code changes to GitHub) ───────────────────────
git add .
git commit -m "describe your change"
git push                              # DigitalOcean auto-deploys on push
```

---

## Part 6 — Troubleshooting

**"Cannot connect to database"**  
→ Run `brew services start postgresql@15`  
→ Check your `DATABASE_URL` in `.env`

**"Port 4000 already in use"**  
→ Run `lsof -i :4000` to see what's using it, then `kill -9 PID`

**"npm: command not found"**  
→ Node.js isn't installed. Go back to Step 1B.

**"relation does not exist" (PostgreSQL error)**  
→ You haven't run the schema yet. Run `npm run db:init`

**DigitalOcean deploy fails**  
→ Check the build logs in the App Platform dashboard. Most common cause is a missing environment variable.

**"Could not detect app files" / "Verify the repo contains supported file types"**  
→ The repo **does** contain supported files:
- **Root:** `package.json` at the repo root so DigitalOcean detects a Node app. If you deploy one component from root, it will build and run the **backend** (build/start scripts delegate to `backend/`).
- **Subfolders:** Use **Source Directory** when your app isn’t at root: set `backend` for the API service, or `frontend` for the static site. Or use the included `.do/app.yaml` (Import from app spec), which sets `source_dir` for you.
- **Repo access:** Under your GitHub (or GitLab/Bitbucket) app’s **Settings → Applications**, ensure DigitalOcean has access to this repository so the platform can read it.

**Frontend shows "Network Error"**  
→ Your `VITE_API_URL` is wrong or the backend isn't running

---

## Part 7 — Recommended Additional Features to Build Next

Here are features that would make this significantly more powerful:

1. **Email notifications** — when someone is assigned an item or leaves a comment, send them an email (use SendGrid, free tier)
2. **File attachments** — attach screenshots or documents to items (use DigitalOcean Spaces, similar to S3)
3. **Slack integration** — post to a Slack channel when items move to Done
4. **Export to CSV** — download sprint data as a spreadsheet
5. **Sprint retrospective view** — after a sprint ends, see what shipped vs. what didn't
6. **Time tracking** — log hours spent per item
7. **Velocity history** — chart your team's average story points across the last 5 sprints

---

*AgileOps — Built for DigitalOcean / Salesforce Engineering*  
*Questions? Check the troubleshooting section above or open the browser console (F12) for errors.*
=======
>>>>>>> e590d066f1eda2354508f2f7dc7b65d440a48ef5
