# Project Documentation — To-DO (Meridian) 

This document describes the application architecture, authentication model, and how to integrate **Okta SSO**. Use it when planning or implementing Okta (or other SAML/OIDC) identity providers.

---

## 1. Project overview

**To-DO (Meridian)** is a full-stack RevOps project management application:

- **Frontend:** React 18, TypeScript, Vite 6, Tailwind 4, Radix UI (in `Helm/`)
- **Backend:** Node.js, Express, Passport (in `backend/`)
- **Database:** PostgreSQL
- **Auth:** Session-based; cookie (`todo.sid`); **Okta OIDC** as the SSO provider; email/password for register and login.

Users sign in, then see projects they own or that are shared with them. All API access is gated by the current session user.

---

## 2. Repository and run layout

| Path | Purpose |
|------|--------|
| `Helm/` | Frontend app (Vite, React). Build: `npm run build`; dev: `npm run dev` (e.g. port 5173). |
| `backend/` | API server. Run: `node server.js` (port 4000 or `PORT`). |
| `backend/scripts/schema.sql` | DB schema; applied on server startup or via `npm run db:init`. |
| `backend/routes/auth.js` | Auth routes: register, login, logout, `/me`, Okta OIDC. |
| `backend/lib/access.js` | Helpers: `requireUser`, `getAccessibleProjectIds`, `canManageProject`. |

Frontend calls the backend at **`VITE_API_URL`** (build-time) or a URL from query/localStorage (see `docs/API-CONNECTION.md`). All API requests use **`credentials: 'include'`** so the session cookie is sent.

---

## 3. Authentication (current)

### 3.1 Flow

1. User opens the app → **AuthGate** calls **`GET /api/auth/me`**.
2. If the response has `user: null` → show **AuthPage** (login/register).
3. Login/register **POST /api/auth/login** or **POST /api/auth/register** → server sets session and returns `{ user }`.
4. Frontend stores user in state and shows **Dashboard**. All subsequent API calls send the session cookie.
5. Logout: **POST /api/auth/logout** → session destroyed, cookie cleared.

### 3.2 Session and cookie

- **Library:** `express-session` with **`connect-pg-simple`** (PostgreSQL store).
- **Table:** `session` (created by the store if missing).
- **Cookie name:** `todo.sid` (configurable in `server.js`).
- **Cookie options:** `httpOnly: true`, `sameSite: 'lax'`, `secure` in production, long-lived (e.g. 30 days).
- **Secret:** `SESSION_SECRET` env var (required in production).

Session holds the **serialized user** (see Passport below). No JWT; identity is server-side only.

### 3.3 Passport

- **Strategies in use:**
  - **Local:** email + password (register + login in `auth.js`).
  - **Okta OIDC:** enabled when `OKTA_CLIENT_ID`, `OKTA_CLIENT_SECRET`, and `OKTA_ISSUER` are set.
- **Serialization:** Passport serializes/deserializes the **user object** (id, email, name, avatar_url) into the session. No DB lookup on each request if the session already has the user.

After a successful login (local or Okta), the server calls **`req.login(user, ...)`** so the same session shape is used regardless of strategy. All protected APIs then use **`req.user`**.

---

## 4. Identity and database (relevant to SSO)

### 4.1 Tables

| Table | Purpose |
|-------|--------|
| **users** | One row per human. `id` (UUID), `email` (unique), `name`, `avatar_url`, `password_hash`, `okta_id` (optional). Used as the canonical identity for auth. |
| **crew** | “Member” in a workspace; has `user_id` → `users.id`, plus `name`, `email`, `initials`, etc. A user can have multiple crew rows (e.g. different workspaces). |
| **session** | Express session store (session id, data, expiry). |
| **projects** | Has `created_by` → `users.id` (optional), `owner_id` → `crew.id`. |
| **project_members** | Links `crew_id` to `project_id` with a role (admin, moderator, editor, viewer). |

Access control is **user-centric**: APIs resolve **`req.user.id`** (from session) and use it to compute accessible workspaces/projects (see `backend/lib/access.js`). Crew is the link between a **user** and **workspace/project membership**.

### 4.2 User creation today

- **Register:** `POST /api/auth/register` → insert into `users` with `password_hash`, then `req.login(user)`.
- **Okta:** Passport callback finds or creates `users` by `okta_id` or `email`, then `req.login(user)`.

Same pattern for any OIDC provider: **find or create a `users` row** from Okta’s identity (e.g. `sub` + email), then **`req.login(user)`** so the rest of the app is unchanged.

---

## 5. API authentication (backend)

- **Middleware:** Session is applied in `server.js`; then `passport.initialize()` and `passport.session()` so **`req.user`** is set when a session exists.
- **Protection:** Routes that need a current user call **`requireUser(req, res)`** from `backend/lib/access.js`. It returns `req.user.id` or sends 401 and returns `null`.
- **No Bearer token:** All protected APIs rely on the session cookie. CORS is configured with `credentials: true` and an allowed frontend origin (`FRONTEND_URL`).

So for Okta: once the user is in the session (via a new Passport strategy + callback), no change is needed in other routes.

---

## 6. Frontend authentication

- **AuthGate** (`Helm/src/app/components/AuthGate.tsx`): On load, calls **`GET /api/auth/me`** with `credentials: 'include'`. If `user` is null, it renders **AuthPage**; otherwise **Dashboard**.
- **AuthPage**: Login form → **POST /api/auth/login**; Register → **POST /api/auth/register**. On success, parent sets user state and the app shows Dashboard.
- **API client** (`Helm/src/app/api/meridian.ts`): All requests use `credentials: 'include'`. Base URL from `VITE_API_URL` or query/localStorage.

For Okta you can either:

- Add an “Sign in with Okta” button that redirects to the backend Okta route or  
- Use Okta’s hosted login page and then have the backend validate the Okta token and create a session (e.g. token verification endpoint that calls `req.login(user)`).

---

## 7. Environment variables (auth-related)

| Variable | Where | Purpose |
|----------|--------|---------|
| `DATABASE_URL` | backend | PostgreSQL connection string. |
| `SESSION_SECRET` | backend | **Required in production.** Secret for signing session cookies. |
| `FRONTEND_URL` | backend | Allowed CORS origin and redirect base (e.g. `https://app.example.com`). |
| `VITE_API_URL` | frontend (build) | Backend base URL (e.g. `https://api.example.com`). No trailing slash. |
| `OKTA_ISSUER`, `OKTA_CLIENT_ID`, `OKTA_CLIENT_SECRET` | backend | Required for Okta OIDC sign-in. |
| `API_BASE_URL` or `APP_URL` | backend | Used in auth for OAuth callback URL (e.g. `https://api.example.com`). |

---

## 8. Okta SSO integration (planning guide)

### 8.1 Options

1. **Okta as OAuth 2.0 / OpenID Connect provider**  
   Use Passport with an OIDC strategy (e.g. `passport-openidconnect` or Okta’s `@okta/oidc-middleware` / Okta’s Passport strategy). User clicks “Sign in with Okta” → redirect to Okta → callback to your backend → find/create `users` → `req.login(user)`.

2. **SAML 2.0**  
   Okta can act as IdP with SAML. You would add a SAML strategy (e.g. `passport-saml`) and map SAML attributes to your `users` table (e.g. email, name), then create session the same way.

3. **Hybrid**  
   Keep email/password and add Okta as an additional sign-in option. The session and `req.user` contract stay the same. (This app uses Okta OIDC only; no Google.)

### 8.2 Recommended: OIDC with Passport

- In **Okta Admin**: Create an OIDC “Web Application,” set redirect URI to your backend, e.g. `https://<api-host>/api/auth/okta/callback`. Note **Client ID**, **Client Secret**, and **Issuer** (e.g. `https://<your-domain>.okta.com/oauth2/default`).
- In **backend**:
  - Add dependency: e.g. `passport-openidconnect` or `@okta/passport-okta-oauth`.
  - New strategy that:
    - Redirects to Okta for login.
    - On callback, receives profile (sub, email, name, etc.).
    - Finds or creates a row in `users` (e.g. by `email` or a new column `okta_id` / `sub`).
    - Calls `req.login(user, ...)` with the same user shape as today (`id`, `email`, `name`, `avatar_url`).
  - Mount routes, e.g. `GET /api/auth/okta`, `GET /api/auth/okta/callback` (and optionally a “Sign in with Okta” link that hits `/api/auth/okta`).
- **Database:** Add column `okta_id` (or `oidc_sub`) to `users` if you want to link by Okta subject id; otherwise match by email (simpler but less strict).
- **Frontend:** Add a button that redirects to `GET /api/auth/okta`. After callback, redirect to `FRONTEND_URL` (e.g. `/?auth=ok`); AuthGate will then call `/api/auth/me` and get the session user.

### 8.3 User provisioning from Okta

- **Just-in-time (JIT):** In the Passport callback, if no user exists for the Okta identity, insert one into `users` (and optionally create a default crew/workspace).
- **Optional sync:** For stricter control, you could periodically sync users from Okta (e.g. SCIM or Okta API) and only allow sign-in for users that already exist in `users`; the callback would then only “find” and login.

### 8.4 Security and config checklist

- Use **HTTPS** in production; set **cookie `secure: true`** (already conditional on `NODE_ENV === 'production'` in this app).
- Store **Okta client secret** and **SESSION_SECRET** in env (or a secrets manager), not in code.
- Validate **state** in the OIDC callback to prevent CSRF (most Passport OIDC plugins do this).
- Restrict **redirect URIs** in Okta to your real callback URL(s) only.
- If you add **SAML**, validate signatures and use a secure session store (you already use PostgreSQL).

### 8.5 Where to change code (summary)

| Area | Change |
|------|--------|
| **backend/routes/auth.js** | Add Okta Passport strategy and routes (e.g. `/okta`, `/okta/callback`). In callback: find/create `users`, then `req.login(user)`. |
| **backend/server.js** | No change if you only add routes in `auth.js`. |
| **backend/scripts/schema.sql** | Optional: add `okta_id` (or similar) to `users` for stable linking. |
| **Helm (AuthPage or similar)** | Add “Sign in with Okta” that redirects to `GET /api/auth/okta` (or your chosen path). |
| **Environment** | Set `OKTA_ISSUER`, `OKTA_CLIENT_ID`, `OKTA_CLIENT_SECRET`; ensure `FRONTEND_URL` and callback URL are correct. |

---

## 9. Related docs

- **API connection and CORS:** `docs/API-CONNECTION.md`
- **Database schema and bootstrap:** `docs/DATABASE-SCHEMA.md`
- **Root README:** `README.md` (quick start, deploy, env vars)

Once Okta is wired, the rest of the app (projects, crew, project members, Field Audit, etc.) continues to use `req.user.id` and does not need to know that the user came from Okta.
