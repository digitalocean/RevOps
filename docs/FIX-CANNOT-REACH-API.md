# Fix: "Cannot reach API" on DigitalOcean

If the Meridian UI shows **"Cannot reach API"** after deployment, set the API URL and redeploy the frontend.

## Step 1: Get your app URL

1. Open [DigitalOcean](https://cloud.digitalocean.com/) → **Apps** → your Meridian app.
2. At the top you’ll see the **App URL**, e.g. `https://meridian-abc12.ondigitalocean.app`.
3. Copy that URL **with no trailing slash**. Example: `https://meridian-abc12.ondigitalocean.app`

## Step 2: Set VITE_API_URL for the web component

1. In the same app, open the **web** (static site) component.
2. Go to **Settings** or **Environment Variables**.
3. Add or edit:
   - **Key:** `VITE_API_URL`
   - **Value:** the URL you copied (e.g. `https://meridian-abc12.ondigitalocean.app`)
   - **Scope:** **BUILD_TIME** (so it’s used during the frontend build).
4. Save.

## Step 3: Redeploy the web component

1. Trigger a new deploy for the **web** component (e.g. **Deploy** or **Redeploy**).
2. If available, enable **Clear build cache** so the new env var is used.
3. Wait for the build to finish.

## Step 4: Open the app from that URL

Open the app using the **same** URL you set (e.g. `https://meridian-abc12.ondigitalocean.app`). The "Cannot reach API" banner should go away.

## Quick fix without redeploy (runtime)

If you already see the banner and don’t want to redeploy yet:

1. In the red banner, type your **main app URL** in the input (e.g. `https://revops-ntkll.ondigitalocean.app`).
2. Click **Save & retry**. The app will store the URL and retry; the banner should disappear if the API is reachable at that URL.

Or open the app with the API URL in the address bar:

`https://your-static-site-url.ondigitalocean.app/?api_url=https://revops-ntkll.ondigitalocean.app`

Use your **main app URL** (the one that shows in the Apps overview) as the `api_url` value. The app will remember it for next time.

## Check the API

In the red banner, use **"Test in new tab"** (or open in a new tab):

`https://YOUR-APP-URL/api/health`

You should see JSON like: `{"status":"ok","db":"connected","schema":true}`.

- **If you see JSON** → The API is up. Try a hard refresh (Ctrl+Shift+R) or clear site data; then paste the URL again and click Save & retry.
- **If you see an HTML page or "Error"** → The request is hitting the wrong component. On DigitalOcean, `/api` must be routed to the **api** service, not the static site. See below.

## Why you see 404 on /api/workspaces or /api/crew

If the browser is requesting `https://your-app.ondigitalocean.app/api/workspaces` and you get **404**, the request is reaching the app, but DigitalOcean **trims the `/api` prefix** before forwarding to the API service. So the API receives `/workspaces` instead of `/api/workspaces`. The backend is now set up to accept **both** paths (with and without `/api`), so after you **redeploy the api component**, those 404s should stop and the "Cannot reach API" banner should go away.

## If pasting the URL still doesn’t work

1. **Confirm routing**  
   In DigitalOcean → your app → **Settings** or **App Spec**, ensure you have:
   - Two components: **api** (service) and **web** (static site).
   - **Ingress rules**: path prefix `/api` → **api**; path prefix `/` → **web**.  
   The `/api` rule must be listed **before** the `/` rule so that `https://your-app.ondigitalocean.app/api/health` goes to the API, not the static site.

2. **Confirm the API is running**  
   In the app, open the **api** component. Check that the last deploy succeeded and that the **api** (not only the web) component is running. If the API failed to start (e.g. missing `DATABASE_URL`), fix that and redeploy the api component.

3. **Use the exact app URL**  
   Use the **single** URL shown at the top of your app in the Apps list (e.g. `https://revops-ntkll.ondigitalocean.app`). Don’t use a component-specific or preview URL. Paste that exact URL in the banner and click Save & retry.
