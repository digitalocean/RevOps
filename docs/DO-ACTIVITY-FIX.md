# Fix “Couldn’t load activity” on DigitalOcean

If you’ve set environment variables but the Activity panel still shows an error on your deployed app, follow these steps.

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

When `/api/health` returns HTML, the ingress is sending `/api` traffic to the **web** (static) component instead of the **api** component.

1. In DigitalOcean: **Apps** → your app → **Settings** (or **Components**).
2. Find **Ingress** or **Routing** (path-based routing).
3. Ensure you have a rule like:
   - **Path:** prefix **`/api`**
   - **Component:** **api**
   - This rule must be **above** or **before** any rule that uses path **`/`** (catch-all).
4. If you use an **app spec** (e.g. `.do/app.yaml`), the ingress section should look like:

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

5. Save and **redeploy** the app so the new routing is applied.

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
