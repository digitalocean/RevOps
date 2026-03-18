# Moving from OIDC to SAML — Process and Role-Based Access

This doc describes the **process** to switch from Okta OIDC to SAML and to use **role-based enablement and access levels** (including from SAML attributes).

---

## 1. OIDC vs SAML (brief)

| | OIDC (current) | SAML 2.0 |
|---|----------------|-----------|
| **Flow** | OAuth 2.0 + ID token (JWT); redirect with `code`, exchange for tokens. | XML assertions; IdP POSTs `<saml:Response>` to your SP (e.g. `/api/auth/saml/callback`). |
| **Data** | User info from userinfo endpoint or ID token claims. | User identity + **attributes** in `<saml:AttributeStatement>` (e.g. Role, Group, Department). |
| **Typical use** | Modern apps, mobile, APIs. | Enterprise SSO, legacy IdPs, when you need **attributes/roles in the assertion**. |
| **Okta** | Okta supports both; you can create an OIDC app or a **SAML 2.0** app. | In Okta: Applications → Create App → **SAML 2.0**. |

**Why consider SAML for role-based access:** Many enterprises already use SAML, and the IdP can send **roles, groups, or permissions** in the SAML assertion. Your app (Service Provider) reads those attributes and maps them to app roles and access levels.

---

## 2. High-level process (OIDC → SAML)

### Step 1: Create a SAML app in Okta (or your IdP)

1. In **Okta Admin** → **Applications** → **Create App Integration**.
2. Choose **SAML 2.0** (not OIDC).
3. Configure:
   - **Single sign-on URL (ACS):** `https://your-app.ondigitalocean.app/api/auth/saml/callback` (or your SP callback).
   - **Audience URI (SP Entity ID):** e.g. `https://your-app.ondigitalocean.app` or a dedicated SP entity ID.
   - **Name ID:** Email or persistent ID.
   - **Attribute statements (optional but important for roles):** Add attributes the IdP will send, e.g.:
     - `Role` or `http://schemas.okta.com/claims/role` → value from Okta group or app assignment.
     - `Group` or `memberOf` → group names for mapping to app roles.
4. Note **Identity Provider metadata URL** (or download metadata XML) and **IdP Issuer**. You’ll need these in the backend.

### Step 2: Backend — SAML (implemented)

The backend uses **`@node-saml/passport-saml`** with IdP metadata from Okta.

- **`GET /api/auth/saml`** — starts SSO (redirect to IdP).
- **`POST /api/auth/saml/callback`** — ACS; must match Okta **Single sign-on URL**.

**Environment variables** (set **one** way to supply metadata):

| Variable | Description |
|----------|-------------|
| **`SAML_IDP_METADATA_URL`** | Okta **Sign On** → metadata URL. Format: `https://org.okta.com/app/INSTANCE_ID/sso/saml/metadata`. If you see **404**, the URL must use `/app/exk…/` only — not `/app/AppName/exk…/`. |
| **`SAML_IDP_METADATA_FILE`** | Path to downloaded `metadata.xml` (relative to process cwd, e.g. backend). |
| **`SAML_IDP_METADATA_XML`** | Raw metadata XML (large; usually use URL or file instead). |
| **`SAML_SP_ENTITY_ID`** | **Audience URI** in Okta — must match exactly, e.g. `https://your-app.ondigitalocean.app`. |
| **`APP_URL`** | Same origin as the app (HTTPS in prod); used for ACS `https://.../api/auth/saml/callback`. |

Optional: `SAML_NAME_ID_FORMAT`, `SAML_VALIDATE_IN_RESPONSE_TO`, `SESSION_SAME_SITE` (defaults to **`none`** in production when SAML metadata is set so the session cookie is sent on the IdP’s **POST** to ACS).

### Okta: “Your request resulted in an error” / Bad SAML request (400)

Usually the **AuthnRequest** Issuer or **AssertionConsumerServiceURL** does not match what Okta expects.

1. **`SAML_SP_ENTITY_ID`** must equal Okta **Audience URI (SP Entity ID)** exactly (e.g. `https://your-app.ondigitalocean.app`, no trailing slash).
2. **`SAML_APP_BASE_URL`** or **`APP_URL`** must be that same public **https** origin so ACS is `https://your-app…/api/auth/saml/callback` — same as Okta **Single sign-on URL**. If the app runs in production without `APP_URL`, the library used to default to **localhost** in the SAML request; Okta then rejects it.
3. In Okta → **Sign On** → **SAML Signing Requests**: if **Assertion Signature** requires a signed AuthnRequest, you must configure an SP signing key (`SAML_PRIVATE_KEY` / `SAML_PUBLIC_CERT` in node-saml) or turn that requirement off in Okta for SP-initiated login.
4. Optional: `SAML_AUTHN_BINDING=POST` if Redirect binding fails; `SAML_REQUEST_AUTHN_CONTEXT=true` to restore default requested auth context if disabling it causes issues.

**Frontend:** If `saml` is true in `/api/auth/providers`, the sign-in button uses **`/api/auth/saml`** (“Sign in with SSO”). Remove or omit `OKTA_*` if you only use SAML.

**User identity:** Name ID (prefer email) + optional attributes → find/create **`users`** by email (same pattern as OIDC).

### Step 3: Map SAML attributes to app roles and access levels

Your app already has **project-level roles** (e.g. in `project_members`: admin, moderator, editor, viewer). You can add:

- **Global/tenant role** (e.g. “org admin”, “member”) from SAML:
  - In `users` table add a column, e.g. `global_role` or `saml_roles` (array/json).
  - In the SAML callback, read attribute(s) from the assertion (e.g. `Role`, `Group`) and set `user.global_role` or `user.saml_roles` when creating/updating the user.
- **Access levels / feature flags:** Use that role (and optionally group names) to:
  - Allow/deny access to certain routes or UI (e.g. only “admin” can open Admin Camp).
  - Default project membership (e.g. “viewer” vs “editor”) when sharing.

**Concrete flow:**

1. IdP (Okta) sends SAML response with, e.g.:
   - `NameID` = user email (or persistent ID).
   - Attribute `Role` = `Admin` or `Member`.
   - Attribute `Group` = `Engineering`, `RevOps`, etc.
2. In **SAML callback** (backend):
   - Parse `<saml:AttributeStatement>`.
   - Find or create `users` row (by email or Name ID).
   - Set `users.global_role` (or similar) from `Role`; optionally store groups in `users.groups` or a separate table.
3. In **API and UI**:
   - `req.user.global_role` (and groups) drive:
     - Visibility of “Admin Camp” or other areas.
     - Who can share projects, invite users, or set project roles (e.g. only org admin can set “admin” on a project).

### Step 4: Frontend

1. **Login entry point:** Change “Sign in with Okta” to “Sign in” (or “Sign in with SSO”) and point the button to `GET /api/auth/saml` instead of `GET /api/auth/okta`.
2. **Post-login:** Same as today — redirect to `/?auth=ok`, AuthGate calls `/api/auth/me`, session has user (now possibly with `global_role` / `saml_roles`). UI can show/hide sections based on role.
3. **Role-based UI:** Use `/api/auth/me` (or a small `/api/auth/me` extension) to return `user.role` or `user.roles` so the frontend can enable/disable features.

### Step 5: Environment and config

- Replace (or add) OIDC env vars with SAML-related ones, e.g.:
  - IdP metadata URL or path to metadata XML.
  - SP entity ID, ACS URL, audience.
  - Optional: attribute names for “role” and “group” (if not standard).
- Keep **SESSION_SECRET**, **FRONTEND_URL**, **APP_URL** (or equivalent) for session and redirects.

---

## 3. Role-based enablement and access levels (summary)

| Layer | What you have today | What SAML adds |
|-------|---------------------|----------------|
| **Project roles** | `project_members.role` (admin, moderator, editor, viewer) | Unchanged; can be **defaulted** from SAML role (e.g. SAML “Member” → default “viewer” when sharing). |
| **Global/org role** | Not in schema | Add `users.global_role` (or `users.saml_roles`) and set from SAML attributes. Use for “who can access Admin Camp”, “who can create projects”, etc. |
| **Attributes** | Only from OIDC userinfo (name, email) | SAML assertion can carry **Role**, **Group**, custom attributes. Map these in the SAML callback to DB and `req.user`. |
| **Access control** | `requireUser`, `getAccessibleProjectIds`, `canManageProject` in `backend/lib/access.js` | Extend with checks on `req.user.global_role` (and groups) before allowing admin-only or role-gated actions. |

**Suggested order:**

1. Implement SAML login (replace OIDC) and get a user into the session.
2. Add `global_role` (or similar) to `users` and set it from SAML attributes in the callback.
3. Add middleware or helpers that restrict certain routes by `req.user.global_role`.
4. In the UI, call an endpoint that returns the current user’s role(s) and show/hide Admin Camp and other features accordingly.
5. Optionally: default `project_members.role` when inviting based on `global_role` or group.

---

## 4. Libraries and references

- **Node SAML (SP):** e.g. `@node-saml/passport-saml` or `passport-saml` (Passport strategy for SAML 2.0).
- **Okta SAML:** [Okta: Build a SAML app](https://developer.okta.com/docs/guides/build-saml-apps/overview/) (create SAML 2.0 app, configure ACS, attributes).
- Your existing **access control** lives in `backend/lib/access.js`; extend it for global role checks.

---

## 5. Checklist (summary)

- [ ] Create SAML 2.0 app in Okta (or IdP); set ACS URL and optional attribute statements (Role, Group).
- [x] SAML Passport strategy and routes (`/api/auth/saml`, `POST /api/auth/saml/callback`).
- [ ] In callback: validate response, get Name ID + attributes, find/create user, set role/group fields, `req.login(user)`, redirect.
- [ ] Add `users.global_role` (or equivalent) and optional `users.groups`; fill from SAML attributes.
- [ ] Extend access control and API to enforce role-based access; return role in `/api/auth/me`.
- [ ] Frontend: “Sign in” → `/api/auth/saml`; show/hide features by role.
- [ ] Remove or disable OIDC routes and env vars when fully on SAML.
- [ ] Test with Okta SAML app (and optional attribute statements) and verify roles in app.

This is the process; implementation details (exact attribute names, schema changes, and route paths) can follow your existing patterns in `backend/routes/auth.js` and `backend/lib/access.js`.
