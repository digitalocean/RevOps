# DigitalOcean dashboard checklist — fix “still old app” (Meridian)

If logs still show **helm-backend** / **node src/index.js**, the app is not using the Meridian repo. Use **one** of the options below on the DigitalOcean side.

---

## Option A: Replace the entire App Spec (recommended)

This makes the live app match the repo and fixes wrong component names/source.

1. In DigitalOcean, open your app (the one that shows “revops”).
2. Go to **Settings** (left or top).
3. Find **App Spec** → click **Edit** (or **Download** then **Edit**).
4. **Select all** existing YAML and **delete** it.
5. Open the file **`.do/app.yaml`** from your repo (branch **main**) and **copy the entire contents**.
6. **Paste** into the App Spec editor in the dashboard.
7. **Important:** In the pasted spec, update the **web** component’s `VITE_API_URL` to your **actual** app URL (e.g. `https://your-app-xxxx.ondigitalocean.app`). Replace `https://revops-ntkll.ondigitalocean.app` if your URL is different.
8. Click **Save** (or **Update**). This will **recreate** components from the spec:
   - **api** (Web Service, source `/backend`)
   - **web** (Static Site, source `/Helm`)
   - **db** (Database)
   The old **revops** component may disappear and be replaced by **api**.
9. Go to **Activity** → **Force Build and Deploy** → enable **Clear Build Cache** → deploy.
10. After the new deployment finishes, open **Runtime Logs** for **api**. You should see **Meridian** messages, not helm-backend.

---

## Option B: Fix the existing “revops” component only

If you want to keep the current app structure and only fix the one component:

1. Open your app → click the **revops** (Web Service) component.
2. Open its **Settings** or **Source** section.
3. Set these **exactly**:

   | Field | Value |
   |-------|--------|
   | **Branch** | `meridian` |
   | **Source Directory** | `backend` (no leading slash) or `/backend` |
   | **Build Command** | `npm ci && npm run build` |
   | **Run Command** | `node server.js` |

4. If you see **Repository** or **Repo**, ensure it is: `praneethaitharaju/RevOps` (or your actual repo).
5. **Save** the component.
6. **Force Build and Deploy** for the app → optionally **Clear Build Cache**.
7. Wait for the new deployment, then check **Runtime Logs** for **revops**. You should see Meridian, not helm-backend.

If it still runs the old code, **Source Directory** is likely wrong (e.g. empty or `/`). Try:
- `backend` (relative)
- or `./backend`
- or `/backend`

Different DO UI versions use different labels; the value must point at the **backend** folder in the repo.

---

## Option C: Create a new app from the spec

Use this if Option A or B still deploys the old app.

1. In DigitalOcean go to **Apps** → **Create App**.
2. Choose **GitHub** → select repo **RevOps** (or your fork) → branch **meridian**.
3. When asked how to configure, choose **Edit your App Spec** (or **Use a spec file**).
4. Paste the **full** contents of **`.do/app.yaml`** from the **meridian** branch.
5. Set **VITE_API_URL** in the spec to your **new** app URL (you can set it after first deploy and redeploy the web component).
6. Save and create the app. DO will create **api**, **web**, and **db** from the spec.
7. After the first deploy, copy the app URL and set **VITE_API_URL** on the **web** component to that URL (BUILD_TIME), then redeploy the web component.

---

## Quick check after deploy

- **Runtime Logs** for the backend component should show:
  - `Meridian schema ensured.`
  - `Meridian API running on port 8080`
- They must **not** show:
  - `helm-backend`
  - `node src/index.js`

If they still show the old app, the component is **not** using the `backend` folder from the **meridian** branch. Re-check **Branch** and **Source Directory** (Option B) or use Option A / C so the app is driven entirely by the spec.

---

## "Sign in required" when creating a project (or after login)

Sessions are stored in PostgreSQL so they persist across requests and restarts. You must set a **session secret** in production:

1. In DigitalOcean, open your app → **api** (Web Service) component → **Settings** → **App-Level Environment Variables** (or **Environment Variables**).
2. Add or edit:
   - **Key:** `SESSION_SECRET`
   - **Value:** A long random string (e.g. generate with `openssl rand -base64 32`). Do not use the placeholder `CHANGE_ME_...` in production.
3. Save and **redeploy** the api component.

If `SESSION_SECRET` is missing or weak, session cookies may not be trusted. The backend also uses **trust proxy** and a **PostgreSQL session store** so that once you’re signed in, creating projects and loading data work correctly (same session on every request).
