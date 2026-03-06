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

In a new tab, open:

`https://YOUR-APP-URL/api/health`

You should see something like: `{"status":"ok","db":"connected","schema":true}`.

- If that URL doesn’t load or returns an error, the **api** component or database is the problem (not the frontend).
- If `/api/health` works but the UI still shows "Cannot reach API", repeat Steps 2–3 and open the app from the main app URL.
