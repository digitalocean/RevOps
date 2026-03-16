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

**APP_URL** is used to build the callback URL our app sends to Okta; it must match the redirect URI in Okta exactly: `https://revops-ntkll.ondigitalocean.app/api/auth/okta/callback`.

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
| 3 | Click “Sign in with Okta” in the app → you should go to Okta, then back to the app without 404. |

If step 1 or 2 returns HTML or 404, the problem is still **routing**: path `/api` is not going to the API. Fix the **Networking** rule (step 1) and redeploy.

---

**Summary:** Okta is sending users to the correct URL. We must ensure that URL is served by our **api** component by routing **path `/api` → api** in DigitalOcean and redeploying.
