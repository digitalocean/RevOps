# Fix 404 for /api (DigitalOcean)

If **https://revops-ntkll.ondigitalocean.app/api/auth/okta** returns **404**, requests to `/api` are going to the **web** (static) component instead of the **api** component.

You have two options:

- **Option A (recommended if routing keeps failing):** Use a **single-component** deploy so one Node service serves both the API and the frontend. No routing rules needed. See **Option A** below.
- **Option B:** Fix path-based routing so `/api` goes to the API component. See **Option B** below.

---

## Option A — Single component (no routing rules)

One service serves both the API (`/api/*`) and the frontend (everything else). The backend already supports this when `SERVE_STATIC=true` and the built frontend is in `backend/public/`.

**Steps:**

1. In DigitalOcean, open your app → **Settings** → **App Spec** (or create a new app from spec).
2. Replace the spec with the contents of **`.do/app-single-component.yaml`** in this repo (or copy it and remove the `static_sites` web component and the `ingress` section; use the single `api` service that builds both Helm and backend and sets `SERVE_STATIC=true`).
3. The single service uses **source_dir: /** (repo root), **build_command** that builds Helm then copies `Helm/dist` to `backend/public`, **run_command: cd backend && node server.js**, and env **SERVE_STATIC=true**.
4. Save and deploy. All traffic goes to that one component; `/api` is handled by Express, everything else by the SPA.

After deploy, **https://revops-ntkll.ondigitalocean.app/api/auth/okta** and the rest of the app will work without any routing rules.

---

## Option B — Route /api to the API component

---

## Steps in the DigitalOcean dashboard

1. Go to [Apps](https://cloud.digitalocean.com/apps) and open your app (e.g. **meridian** / **revops**).

2. Open the **Networking** tab (or **Settings** → **Networking**, depending on the UI).

3. Find **Component routing rules** (or **Routes**). You need a rule that sends **`/api`** to the **api** component.

4. **Add a routing rule** (click **Add routing rule** or **Add route**):
   - **Route path:** `/api` or `/api/`
   - **Target component:** select your **api** (backend) component — the one that runs `node server.js`, not the static site.
   - **Path handling:** if there is an option like **Preserve full path** or **Trim path prefix**, either is fine; your API already handles both `/api/auth/okta` and `/auth/okta`. If you choose **Trim prefix** so that the API receives `/auth/okta` instead of `/api/auth/okta`, that matches what your logs already show.
   - Save the rule.

5. **Rule order:** the **`/api`** rule must be **above** any rule that matches **`/`** or “all paths”. Otherwise the catch‑all for the web app will handle `/api` and you’ll still get 404. Move the `/api` rule to the top if needed.

6. **Redeploy the app** so the new routing is applied (e.g. **Deploy** or **Redeploy** from the app’s overview or **Actions**). Routing changes often require a full app deploy.

---

## Verify

- Open: **https://revops-ntkll.ondigitalocean.app/api/auth/okta**  
  You should be **redirected to Okta** (login page), not get 404 or your app’s HTML.

- Open: **https://revops-ntkll.ondigitalocean.app/api/auth/ping**  
  You should see JSON like `{"ok":"auth","path":"/ping","okta":true}`.

If both work, “Sign in with Okta” in your app should no longer 404.

---

## If your app uses an app spec (e.g. `.do/app.yaml`)

Your repo already has the correct ingress in **`.do/app.yaml`**:

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

If the app was **created from this spec** and you deploy from the same repo/branch, this routing should already be in effect. If you still get 404:

- Confirm the app in the dashboard was created from this spec (or that the spec is linked and used for deploys).
- Or add the **`/api` → api** rule manually in the **Networking** tab as above; the dashboard rule will override or merge with the spec.

---

## Reference

- [How to Rewrite or Redirect URL Paths](https://docs.digitalocean.com/products/app-platform/how-to/url-rewrites/) — **Networking** tab → **Component routing rules** → **Add routing rule**.
- Route path ` /api` (or `/api/`) → Target component: **api**.
