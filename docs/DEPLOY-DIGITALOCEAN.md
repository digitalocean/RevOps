# Deploy to DigitalOcean App Platform (full setup in repo)

Everything you need is in this repo. Follow these steps so the Activity panel and API work correctly.

---

## 1. Use the app spec from this repo

The repo includes a full App Platform spec so **ingress** (routing) is correct:

- **Path:** `app.yaml` (root) or `.do/app.yaml`
- **Important:** The spec defines **ingress rules**: requests to `/api` go to the **api** component; everything else goes to the frontend (in `app.yaml` this is **revops** if DO already created that component; otherwise **web**). Without this, the Activity panel will show "Couldn't load activity."

**If you create a new app from this repo:**

1. In DigitalOcean: **Apps** → **Create App** → **GitHub** (or **GitLab**).
2. Select this repo and branch.
3. If DO asks for an app spec, point it to **`app.yaml`** at the repo root (or use **.do/app.yaml**).  
   Or after creation, go to **Settings** → **App Spec** and paste/load the contents of `app.yaml` so the **ingress** and both components (api + web) are defined.

**If the app already exists:**

1. Open your app → **Settings** (or **App Spec**).
2. Ensure the spec has an **ingress** section like this (order matters: `/api` first, then `/`):

```yaml
ingress:
  rules:
    - component:
        name: api
      match:
        path:
          prefix: /api
    - component:
        name: web
      match:
        path:
          prefix: /
```

3. Save and **redeploy** the app so the new routing is applied.

---

## 1b. “I don’t see a frontend component”

**Step-by-step (add Static Site manually + ingress):** see **[DO-ADD-FRONTEND-MANUAL.md](DO-ADD-FRONTEND-MANUAL.md)**.

The frontend is defined as a **Static Site** named **`web`** in the spec (not “frontend”). In the app’s **Components** (or **Resources**) you should see:

- **api** (Service)
- **revops** or **web** (Static Site) — this is the frontend

**If the frontend component is missing:**

1. **Replace the full App Spec**  
   In DO: **Settings** → **App Spec** → **Edit**. Paste the **entire** contents of `app.yaml` from this repo (including the `static_sites:` block). Save. The frontend component name in the spec (e.g. **revops**) must match any existing component that has the `/` route to avoid “path prefix already in use” errors.

2. **Fix repo/branch in the spec**  
   If you connected the app to your own GitHub repo, the spec’s `github.repo` and `github.branch` must match. In `app.yaml` (or in the spec editor), set under both **api** and **web**:
   - `repo: YOUR_ORG_OR_USER/YOUR_REPO`
   - `branch: YOUR_BRANCH`  
   Then save and redeploy.

3. **Add the Static Site manually**  
   In the app: **Components** → **Add Component** → **Static Site**. Set:
   - **Source:** same GitHub repo and branch as the app.
   - **Source Directory:** `Helm` (or `/Helm`).
   - **Build Command:** `npm install && npm run build`.
   - **Output Directory:** `dist`.
   - **Environment:** add `VITE_API_URL` = your app URL (e.g. `https://your-app.ondigitalocean.app`).
   - Name the component to match the ingress rule (e.g. **`revops`** or **`web`**).  
   Then in **Settings** → **App Spec**, ensure the **ingress** has a rule sending `/` to that component name.

---

## 2. Set environment variables

### API component (backend)

In the **api** service → **Environment Variables**, set (or confirm):

| Key | Value | Notes |
|-----|--------|--------|
| `DATABASE_URL` | (auto from linked DB) | Attach the database to the app if not already. |
| `NODE_ENV` | `production` | |
| `PORT` | `8080` | |
| `SESSION_SECRET` | (long random string) | e.g. run `openssl rand -base64 32` and paste. |
| `FRONTEND_URL` | `https://YOUR-APP-URL.ondigitalocean.app` | Your app’s public URL, no trailing slash. |
| `APP_URL` | Same as `FRONTEND_URL` | For auth redirects. |
| `OKTA_ISSUER` / `OKTA_CLIENT_ID` / `OKTA_CLIENT_SECRET` | (from Okta) | Only if you use **OIDC** (“Sign in with Okta”). Omit if you use **SAML only** (below). |

Replace `YOUR-APP-URL` with your actual app host (e.g. `revops-ntkll`).

### SAML sign-in (Okta SAML app) — API component only

Okta is configured with **Audience** and **Single sign-on URL**. On DigitalOcean, set these on the **api** component (same place as `DATABASE_URL`):

| Key | Value | Notes |
|-----|--------|--------|
| **`SAML_IDP_METADATA_URL`** | Okta metadata URL | App → **Sign On** → **Metadata URL** (or download XML and use `SAML_IDP_METADATA_FILE`). |
| **`SAML_SP_ENTITY_ID`** | `https://YOUR-APP.ondigitalocean.app` | Must match Okta **Audience URI (SP Entity ID)** exactly. |
| **`SAML_APP_BASE_URL`** | Same `https://…` origin | Same host as above (no path). Ensures SAML **ACS** is `https://…/api/auth/saml/callback`. If unsure, duplicate `APP_URL` here. |
| **`APP_URL`** | Same public `https://…` | Should match; used for API base + redirects. |
| **`FRONTEND_URL`** | Same public `https://…` | Where users land after login (`/?auth=ok`). |

**Optional:** Remove `OKTA_*` if you only use SAML so the UI shows **Sign in with SSO** only.

**Routing:** `/api/auth/saml` and **`POST /api/auth/saml/callback`** must hit the **api** component — the ingress rule **`/api` → api** covers that. No extra Okta callback URL in DO beyond your normal app URL.

### Web component (frontend)

In the **web** (static site) component → **Environment Variables** (build-time):

| Key | Value |
|-----|--------|
| `VITE_API_URL` | `https://YOUR-APP-URL.ondigitalocean.app` |

Same URL as above, **no** `/api` at the end. After changing this, **trigger a new build** of the web component (Redeploy or push a commit).

---

## 3. Repo layout (so DO finds backend and frontend)

The spec expects:

- **API:** `source_dir: /backend` (or `backend` at repo root).
- **Web:** `source_dir: /Helm` (or `Helm` at repo root).

If your repo has a different layout, edit the `source_dir` values in `app.yaml` / `.do/app.yaml` to match (e.g. `source_dir: backend`, `source_dir: Helm`).

---

## 4. Verify after deploy

1. Open your app URL and log in.
2. Open a project and expand the **Activity** panel (right side).
3. If you see "Couldn't load activity", click **Check API** in the panel.
   - **"API is reachable"** → Try **Retry** or sign in again; the API is working.
   - **"Request returned a page instead of JSON"** → Ingress is wrong: add the `/api` → **api** rule (Step 1) and redeploy.

You can also open in a new tab:

`https://YOUR-APP-URL.ondigitalocean.app/api/health`

- **JSON** (e.g. `{"status":"ok",...}`) → API is reachable.
- **HTML** → Ingress is not sending `/api` to the API; fix the app spec and redeploy.

---

## 5. Copy-paste env blocks

See **`docs/ENV-VARIABLES.md`** and **`docs/do-api-env-paste.env`** for ready-to-paste values. Use **Add from .env** in the DO dashboard for the API component so all keys appear at once.

---

## Quick checklist

| Step | Action |
|------|--------|
| 1 | App spec has **ingress** with `/api` → **api** and `/` → **web**. |
| 2 | **api** component: set `SESSION_SECRET`, `FRONTEND_URL`, `APP_URL`, and DB linked. |
| 3 | Frontend (revops/web) component: set `VITE_API_URL` to app URL, then **rebuild**. |
| 4 | Redeploy the whole app after changing the spec or ingress. |
| 5 | In the app, use **Check API** in the Activity panel to confirm the API is reachable. |

All of this is driven by the **app spec** in the repo (`app.yaml` / `.do/app.yaml`). Once the spec is loaded and env vars are set, deploy from the repo and the Activity panel should work.
