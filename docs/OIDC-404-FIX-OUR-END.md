# OIDC 404 — Fix on Our End (DigitalOcean)

Okta is configured correctly (sign-in redirect URI = `https://revops-ntkll.ondigitalocean.app/api/auth/okta/callback`). The **404 happens because the request never reaches our API** — it hits the static site (web component) instead, which doesn’t have that route.

Fix everything below on **our** side (app and platform config).

---

## 1. Route `/api` to the API component (main fix)

On DigitalOcean, requests to `/api/auth/okta/callback` must go to the **api** component, not the web component.

1. In DigitalOcean: **Apps** → your app → **Networking** tab.
2. Under **Component routing rules**, ensure you have:
   - **Route path:** `/api`
   - **Target component:** **api**
   - This rule must be **above** any rule that matches `/` (so `/api` is handled first).
3. Save, then **redeploy** the app so the routing is applied.

**Check:** Open in a browser:

- `https://revops-ntkll.ondigitalocean.app/api/auth/ping`

If you see **JSON** (e.g. `{"ok":"auth","path":"/ping","okta":true}`), the API is reachable and the 404 should stop. If you see **HTML** or **404**, the request is still going to the web component — fix the routing rule and redeploy.

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

**Summary:** Ensure **path `/api` → api** in DigitalOcean Networking, use the shorter redirect URI `https://revops-ntkll.ondigitalocean.app/api/okta-cb` in Okta, and redeploy the API.
