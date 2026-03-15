# Fix “Couldn’t load activity” on DigitalOcean

**Do this first:** Apps → your app → **Networking** tab → **Add routing rule** → Route path: **`/api`** → Target component: **api** → Save → **Deploy**. Then reload the app and try the Activity panel again.

If you’ve set environment variables but the Activity panel still shows an error, follow the steps below.

---

## Step 1: Check if the API is reachable

In a **new browser tab**, open (replace with your app URL if different):

**https://revops-ntkll.ondigitalocean.app/api/health**

- **If you see JSON** like `{"status":"ok","db":"connected",...}`  
  → The request is reaching the API. Go to **Step 2**.

- **If you see an HTML page** (e.g. your app’s login or shell)  
  → The request is **not** reaching the API; it’s being served by the static site. Go to **Step 3**.

---

## Step 2: API is reachable but Activity still fails

Then the problem is likely **session/cookies** (e.g. not logged in on that domain) or the activity route.

- Make sure you’re **logged in** in the same tab where you use the app.
- Open: **https://revops-ntkll.ondigitalocean.app/api/activity?project_id=ANY_VALID_PROJECT_ID**
  - If you get `401` or a JSON error → API is working; the Activity panel may need a valid `project_id` or refresh after login.
  - If you get HTML again → try Step 3 (ingress) for this path as well.

---

## Step 3: Ingress — send `/api` to the API component

When `/api/health` returns HTML, the request is going to the **web** (static) component instead of the **api** component. Route `/api` to the API using one of the two methods below.

---

### Option A: In the DigitalOcean dashboard (do this first)

1. Go to **[cloud.digitalocean.com/apps](https://cloud.digitalocean.com/apps)** and open your app (e.g. **meridian** / **revops**).
2. Click the **Networking** tab (top of the app page).
3. In **Component routing rules**, click **Add routing rule** (or **Edit** if you already have rules).
4. Add a rule:
   - **Route path:** `/api` or `/api/` (this matches all URLs that start with `/api`).
   - **Target component:** choose your **api** (backend) component.
   - If there is a “Path handling” option, use **Forward** or default (do not rewrite the path).
5. If you have another rule that matches **all** paths (e.g. `/` or blank), make sure the **`/api`** rule is **above** it so `/api` is handled first.
6. Save the rule(s), then go to the **Overview** or **Components** tab and click **Deploy** (or trigger a redeploy) so the new routing is applied.

After redeploying, open **https://revops-ntkll.ondigitalocean.app/api/health** again. You should see JSON instead of the app’s HTML page.

---

### Option B: Using the app spec (YAML)

If your app is created/updated from the repo’s app spec, the ingress block should look like this. You can paste this into **Settings → App Spec** (or use the repo’s **`app.yaml`**), then save and redeploy:

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

The **`/api`** rule must be listed **before** the **`/`** rule so that API requests hit the backend and not the static site.

---

## Step 4: Rebuild the web component after changing env vars

**VITE_API_URL** is used at **build time**. Changing it in the dashboard does not change an already-built app until you rebuild.

1. **Web** component → **Environment Variables**: set **VITE_API_URL** = `https://revops-ntkll.ondigitalocean.app` (your app URL, **no** trailing slash, **no** `/api`).
2. Trigger a **new build/deploy** of the **web** component (e.g. “Deploy” or push a commit if deploy on push is on).
3. Wait for the build to finish and use the new URL.

---

## Step 5: Confirm the API component is running

1. In DO: **Apps** → your app → **api** component.
2. Check that it’s **Running** and that the last deploy succeeded.
3. If it’s stopped or failed, fix the cause (e.g. env vars, build errors) and redeploy the **api** component.

---

## Quick checklist

| Check | Action |
|-------|--------|
| `/api/health` returns JSON | Ingress is correct; if Activity still fails, check login and project ID. |
| `/api/health` returns HTML | Fix ingress so `/api` → **api** component (Step 3), then redeploy. |
| Changed `VITE_API_URL` | Rebuild the **web** component (Step 4). |
| Activity still broken after above | Confirm **api** is running (Step 5); try `/api/activity?project_id=...` in a tab. |

Use **Step 1** first; the result tells you whether the fix is ingress (Step 3), rebuild (Step 4), or something else (Steps 2 and 5).
