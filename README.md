
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

## Part 2 — Deploy to DigitalOcean (Live on the Internet)

This makes AgileOps accessible from any browser, anywhere in the world.

### What you need

- A DigitalOcean account: [cloud.digitalocean.com](https://cloud.digitalocean.com) (you can sign up with GitHub)
- Your project code on GitHub (we'll set this up below)
- A credit card (DigitalOcean charges ~$12/month for the database + $5/month for the app)

---

### Step A: Put your code on GitHub

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

### Step B: Create the PostgreSQL Database on DigitalOcean

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
