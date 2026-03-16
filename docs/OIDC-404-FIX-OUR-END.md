# OIDC 404 — Fix on Our End (DigitalOcean)

Okta is configured correctly (sign-in redirect URI = `https://revops-ntkll.ondigitalocean.app/api/auth/okta/callback`). The **404 happens because the request never reaches our API** — it hits the static site (web component) instead, which doesn’t have that route.

Fix everything below on **our** side (app and platform config).

---

## Why am I still getting 404? (check logs first)

After redeploying the API with the latest code:

1. **Open API Runtime Logs** in DigitalOcean (Apps → your app → **api** component → **Runtime Logs**).
2. **Reproduce the 404**: click "Sign in with Okta", log in at Okta, wait until you see the 404.
3. **Look for this line** in the logs:  
   `[Okta] request reached API { method: '...', path: '...', ... }`

**If you do NOT see that line** when the 404 happens:
- The callback request is **not** reaching the API. The request is going to the **web** component (or another component), which returns 404 for `/api/auth/okta/callback`.
- **Fix:** In **Networking**, add or reorder rules so that **path prefix `/api`** goes to the **api** component, and this rule is **above** the rule that sends `/` to the web component. Save and redeploy the **whole app** (not just the API). See section 1 below.

**If you DO see that line** but still get 404:
- The request reaches the API; something else is wrong (e.g. our handler runs but then an error or redirect returns 404). Check for the next line: `[Okta] callback route matched` and any error lines after it.

---

## 1. Route `/api` to the API component (main fix)

On DigitalOcean, requests to `/api/auth/okta` and `/api/auth/okta/callback` must go to the **api** component, not the web component. If **https://revops-ntkll.ondigitalocean.app/api/auth/okta** returns **404**, the `/api` rule is missing or wrong.

**If routing still doesn't work:** Use a **single-component** deploy so one service serves both API and frontend (no routing rules). See **[DO-FIX-API-ROUTING.md](DO-FIX-API-ROUTING.md)** → **Option A** and the spec **`.do/app-single-component.yaml`**.

**Step-by-step (Option B — fix routing):** See **[DO-FIX-API-ROUTING.md](DO-FIX-API-ROUTING.md)** for exact dashboard steps.

Summary:
1. In DigitalOcean: **Apps** → your app → **Networking** tab.
2. Under **Component routing rules**, click **Add routing rule** (or ensure you have a rule):
   - **Route path:** `/api` or `/api/`
   - **Target component:** **api** (your Node backend)
   - This rule must be **above** any rule that matches `/` (so `/api` is handled first).
3. Save, then **redeploy the app** (not just one component) so the routing is applied.

**Check:** Open in a browser:

- `https://revops-ntkll.ondigitalocean.app/api/auth/ping`
- `https://revops-ntkll.ondigitalocean.app/api/auth/okta/callback` (no query string)

If you see **JSON** (e.g. `{"ok":"auth",...}` or `{"ok":"callback-endpoint",...}`), the API is reachable. If you see **HTML** (your app’s login page) or **404**, requests to `/api` are going to the **web** component — fix the routing rule so **path prefix `/api`** targets the **api** component, then redeploy. In the dashboard, the rule is often under **Settings** → **Networking** or **Ingress**; the order of rules matters (more specific first).

---

## 2. API component env vars

On the **api** component, set (or confirm):

| Variable       | Value |
|----------------|--------|
| **APP_URL**    | `https://revops-ntkll.ondigitalocean.app` (no trailing slash) |
| **FRONTEND_URL** | Same as APP_URL (for post-login redirect) |
| **OKTA_ISSUER** | Your Okta issuer (e.g. `https://your-domain.okta.com/oauth2/default`) |
| **OKTA_CLIENT_ID** | From Okta |
| **OKTA_CLIENT_SECRET** | From Okta |

**APP_URL** is used to build the callback URL. The app now uses the **shorter callback URL** (see step 5 below) to avoid 404s.

---

## 3. API component is running

- In DO: **Apps** → your app → **api** component.
- Confirm status is **Running** and the last deploy **Succeeded**.
- If it’s stopped or failed, fix the cause and redeploy.

---

## 4. Quick verification

| Step | What to do |
|------|------------|
| 1 | Open `https://revops-ntkll.ondigitalocean.app/api/auth/ping` → expect JSON, not HTML. |
| 2 | Open `https://revops-ntkll.ondigitalocean.app/api/auth/providers` → expect `{"okta":true}`. |
| 3 | Open `https://revops-ntkll.ondigitalocean.app/api/auth/okta/callback-test` → expect JSON like `{"ok":"callback-test","path":"/okta/callback-test",...}`. If you see `path: "/auth/okta/callback-test"` or `baseUrl: "/auth"`, path trimming is on (callback is still handled). |
| 4 | Click “Sign in with Okta” in the app → you should go to Okta, then back to the app without 404. |

If step 1 or 2 returns HTML or 404, the problem is still **routing**: path `/api` is not going to the API. Fix the **Networking** rule (step 1) and redeploy.

**If ping works but callback still 404s:** Use the **shorter callback URL** (step 5) and redeploy.

---

## 5. Use the shorter callback URL in Okta (recommended if you still get 404)

The app supports a **shorter** callback path so routing is less likely to fail:

1. In **Okta Admin** → your application → **General** → **Sign-in redirect URIs**.
2. **Add** (or replace with):  
   `https://revops-ntkll.ondigitalocean.app/api/okta-cb`  
   (No trailing slash.)
3. Save the app in Okta.
4. **Redeploy the API** component so it uses the new callback path.
5. Try “Sign in with Okta” again. The browser will be sent to `/api/okta-cb` after login; the API handles both `/api/okta-cb` and `/api/auth/okta/callback`.

---

## 6. Check API logs (see what's happening)

The API logs `[Okta]` lines so you can see whether the callback is hit and why it might fail.

**Where to see logs (DigitalOcean):**

1. **Apps** → your app → **api** component.
2. Open the **Runtime Logs** (or **Logs**) tab.
3. Reproduce the flow: click "Sign in with Okta", sign in at Okta, wait for redirect.
4. Watch the logs during and right after the redirect.

**What to look for:**

| Log line | Meaning |
|----------|--------|
| `[Okta] callback route matched` | Request reached the API and was recognized as the Okta callback path. If you never see this when you get a 404, the request is not reaching the API (routing or platform issue). |
| `[Okta] callback handler entered` | The callback handler ran. Check method, queryKeys, bodyKeys, hasCodeInBody. |
| `[Okta] no code in request` | Handler ran but no code in query or body; platform may be stripping query/body, or form_post not used. |
| `[Okta] copied code/state from body to query` | form_post body was received and copied for Passport. |
| `[Okta] exchanging code for token...` | About to call Passport to exchange the code. |
| `[Okta] passport.authenticate error` | Token exchange or userinfo failed (wrong secret, network, etc.). |
| `[Okta] auth success, redirecting to app` | Login succeeded; user is redirected to the app. |

If you get 404 and do not see `[Okta] callback route matched`, the request is not hitting the API. Fix Networking so path /api goes to the api component, then redeploy.

If you see callback route matched but then no code in request, the request reaches the API but code is missing. Use the shorter callback URL and ensure Okta uses form_post (the app requests it).

**GET vs POST:** If you open the callback URL in the browser (e.g. `https://your-app.ondigitalocean.app/api/okta-cb`), you will see a log with `method: 'GET'`, `queryKeys: []`, `bodyKeys: []` — that is expected (no code when you open the URL manually). When you do the **real** Okta flow (click "Sign in with Okta" → log in at Okta), Okta should **POST** to the callback with `code` and `state` in the body. In that case you should see `method: 'POST'`, `bodyKeys: ['code', 'state']`, then `[Okta] copied code/state from body to query` and `[Okta] exchanging code for token...`. If the real flow still shows GET with no params, Okta may not be using form_post — ensure the app uses the updated code that sends `response_mode=form_post` and `redirect_uri=.../api/okta-cb`, and that this URI is allowed in Okta.

---

**Summary:** Ensure **path `/api` → api** in DigitalOcean Networking, use the shorter redirect URI `https://revops-ntkll.ondigitalocean.app/api/okta-cb` in Okta, and redeploy the API. Use Runtime Logs on the api component to confirm the callback is hit and to debug failures.
