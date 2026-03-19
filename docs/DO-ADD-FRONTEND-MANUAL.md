# Add the frontend (Static Site) on DigitalOcean

If you only see an **api** (Service) component and **no** frontend, DigitalOcean often created the app from a single detected component (usually the Node backend). The frontend is a **separate** component: a **Static Site**.

---

## 1. Confirm what you have

In your app: **Overview** or **Components** (wording varies).

- You should see **two** components: **api** + **web** (or another name for the static site).
- If you only see **one** component (the API), add the Static Site using the steps below.

---

## 2. Add a Static Site (manual — recommended if the spec didn’t create it)

1. Open your app in DigitalOcean.
2. Go to **Settings** → **Components** (or **Resources** → **Add Resource**), or use **Create** → **Add Component** depending on the UI.
3. Choose **Static Site** (not “Web Service”).
4. **Connect the same GitHub repo and branch** you use for the API.
5. Configure:

| Field | Value |
|--------|--------|
| **Name** | `web` (must match your ingress rule for `/` — see §4) |
| **Source directory** | `Helm` |
| **Build command** | `npm install && npm run build` |
| **Output directory** | `dist` |
| **HTTP request routes** | Leave default or ensure the app routes `/` to this component (see §4) |

6. **Environment variables** (build-time):

| Key | Value (use your real app URL) |
|-----|--------------------------------|
| `NPM_CONFIG_PRODUCTION` | `false` |
| `VITE_API_URL` | `https://YOUR-APP-NAME.ondigitalocean.app` (no `/api`, no trailing slash) |

7. Save and **Deploy**.

---

## 3. Fix ingress so `/` goes to the frontend

The API must handle **`/api`** only; the SPA must handle **`/`**.

In **Settings** → **Networking** or **App Spec** → **Ingress**, you need **two** rules **in this order**:

1. **Path prefix:** `/api` → component **api**
2. **Path prefix:** `/` → component **web** (same name as your Static Site)

If the Static Site is named something else (e.g. `revops`), the second rule must use **that** name, not `web`.

**Wrong:** only one rule for `/` pointing at **api** — then the browser never gets the React app.

---

## 4. If you use App Spec from GitHub

1. **Settings** → **App Spec** → **Edit**.
2. Paste the **full** YAML from this repo, including the entire **`static_sites:`** block (see `app-new.yaml`).
3. Under **`static_sites`** and **`services`**, set **`github.repo`** and **`github.branch`** to **your** repo and branch (not a placeholder).
4. Save. DigitalOcean should show a new component after deploy.

If validation fails (e.g. database create/delete), use `app-new.yaml` from this repo (database section removed) or add the Static Site manually (§2) and only add the **ingress** rules in the spec if needed.

---

## 5. Name conflicts (`web` vs `revops`)

- **New app:** use **`web`** for the Static Site and ingress for `/`.
- **Existing app** that already has a component named **`revops`** with `/`: name the Static Site **`revops`** and point ingress `/` to **`revops`** — do **not** add a second component also claiming `/`.

See **`app.yaml`** in the repo (production) which uses **`revops`** for the static site when that name already exists.

---

## 6. Verify

- Open `https://YOUR-APP.ondigitalocean.app/` — you should see the **login / app UI** (HTML from the static build), not JSON from the API.
- Open `https://YOUR-APP.ondigitalocean.app/api/health` — you should see **JSON** from the API.

If `/` returns JSON or 404 from the API, ingress still routes `/` to **api** — fix ingress (§3).

---

## 7. Still stuck?

- **Support:** [App Platform — Static Sites](https://docs.digitalocean.com/products/app-platform/how-to/manage-static-sites/)
- **CLI:** `doctl apps spec get <app-id>` to see what DO actually has deployed; compare with `app-new.yaml`.
