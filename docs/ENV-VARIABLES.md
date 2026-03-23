# Environment variables — copy & paste

Use your app URL: **https://revops-ntkll.ondigitalocean.app** (no trailing slash). Replace with your own URL if different.

**DigitalOcean:** Env **keys** are defined in **`.do/app.yaml`**. Sync the app from the repo (or paste updated spec), then open **api** → **Environment Variables**. You should see keys like `SAML_IDP_METADATA_URL` — **if an older app predates SAML**, click **Edit** on the spec or **Add variable** and add any missing keys from the list below.

---

## API (backend) — DigitalOcean or local `.env`

Copy the block below. Replace placeholder values (especially `SESSION_SECRET`, `OKTA_*`, and `DATABASE_URL` if not auto-set).

```env
# Required
DATABASE_URL=postgresql://user:password@host:5432/dbname
NODE_ENV=production
PORT=8080
SESSION_SECRET=paste-a-long-random-string-here-at-least-32-chars

# Required for production (CORS + OAuth redirects)
FRONTEND_URL=https://revops-ntkll.ondigitalocean.app
APP_URL=https://revops-ntkll.ondigitalocean.app

# Okta OIDC (optional — omit if using SAML only)
OKTA_ISSUER=https://your-org.okta.com/oauth2/default
OKTA_CLIENT_ID=paste-your-okta-client-id
OKTA_CLIENT_SECRET=paste-your-okta-client-secret

# Okta SAML (optional — omit if using OIDC only). Frontend shows "Sign in with SSO" when SAML_IDP_METADATA_URL is set.
SAML_IDP_METADATA_URL=https://your-org.okta.com/app/xxxxx/sso/saml/metadata
SAML_SP_ENTITY_ID=https://revops-ntkll.ondigitalocean.app
SAML_APP_BASE_URL=https://revops-ntkll.ondigitalocean.app

# Optional: DB with self-signed cert (e.g. DO Managed DB)
NODE_TLS_REJECT_UNAUTHORIZED=0

# Optional: Okta groups → app role (SAML). See docs/OIDC-TO-SAML-PROCESS.md
# SAML_REQUIRE_TODO_GROUP=true
# SAML_ACCESS_DENIED_MESSAGE=You do not have access. Please contact IT to request the To-Do application.
# SAML_TODO_GROUP_PRIORITY_JSON=[{"group":"ToDo-SuperAdmins","role":"superadmin"},{"group":"ToDo-Admins","role":"workspace_admin"},…]
# SAML_GROUP_CLAIM_KEYS=groups,http://schemas.okta.com/claims/groups
# SAML_ALLOW_LOCAL_PASSWORD_USERS=false
# SAML_TODO_ROLES_DISABLED=true

# Optional: Voice / AI
# OPENAI_API_KEY=sk-...
# GRADIENT_MODEL_ACCESS_KEY=do-...
# GRADIENT_CHAT_MODEL=gpt-4o
```

**DigitalOcean:** In the **api** component, add each variable (key + value). `DATABASE_URL` is usually provided by the linked database (`${db.DATABASE_URL}`).

**Local:** Save as `backend/.env` and fill in real values.

---

## Okta groups → app roles (all configurable API variables)

Okta should send **group membership** in the SAML assertion (commonly attribute name **`groups`**). The API maps **Okta group name → internal `global_role` slug** (highest privilege wins). **RBAC in routes/UI is still evolving**; today these slugs are stored and returned on `GET /api/auth/me`.

### Recommended Okta groups and meaning

| Okta group | App role (`global_role`) | Intended capability |
|------------|--------------------------|---------------------|
| **ToDo-SuperAdmins** | `superadmin` | Full system access: create/delete workspaces, all projects, tasks, crew, analytics, audit, app settings. |
| **ToDo-Admins** | `workspace_admin` | Workspace-level admin: full CRUD on projects, tasks, sprints, crew **in their workspaces**; analytics + audit; **no** app-wide settings. |
| **ToDo-ProjectManagers** | `member` | **Same app access as ToDo-Members** (`global_role` = `member`). Use **project Share** roles (admin/editor/…) to grant extra powers on specific projects. |
| **ToDo-Members** | `member` | Same as above — shared Okta tier; per-project access still comes from workspace + **Share**. |
| **ToDo-Viewers** | `viewer` | Read-only: view projects, tasks, analytics; **no** create/edit. |

### Variables to add (API / backend)

| Variable | Required? | Description |
|----------|-------------|-------------|
| **`SAML_REQUIRE_TODO_GROUP`** | **Recommended `true` in prod** | If `true`, users **without** a matching Okta group get **no app UI** (IT / request-access message). If unset/false, legacy role mapping can still apply. |
| **`SAML_TODO_GROUP_PRIORITY_JSON`** | Optional | JSON array, **highest privilege first**. Each entry: `{ "group": "<Okta group name>", "role": "<slug>" }`. **If omitted**, the table above is the built-in default (same names and slugs). **Set this** if you rename Okta groups or role slugs. |
| **`SAML_GROUP_CLAIM_KEYS`** | Optional | Comma-separated **extra** SAML attribute names to scan for group strings (merged with defaults: `groups`, `Groups`, `group`, `Group`, etc.). Use if Okta uses a custom claim name. |
| **`SAML_ACCESS_DENIED_MESSAGE`** | Optional | Full text shown when access is denied (IT ticket / request access). Default is a generic “contact IT” message. |
| **`SAML_ALLOW_LOCAL_PASSWORD_USERS`** | Optional | Default **`true`**: users with a **database password** can sign in without a ToDo group (dev / break-glass). Set **`false`** to require a group for everyone. |
| **`SAML_TODO_ROLES_DISABLED`** | Optional | **`true`** = do **not** use ToDo group mapping; use legacy **`SAML_ROLE_MAP_JSON`** / attribute logic instead. Rare; conflicts with the ToDo group model if you rely on `SAML_REQUIRE_TODO_GROUP`. |
| **`SAML_ROLE_ATTRIBUTE_NAMES`** | Optional (legacy) | Only used when **`SAML_REQUIRE_TODO_GROUP`** is **not** `true`. Comma-separated attribute names for old Role/Groups string mapping. |
| **`SAML_ROLE_MAP_JSON`** | Optional (legacy) | Only used when **`SAML_REQUIRE_TODO_GROUP`** is **not** `true`. JSON map from IdP string → app role. |

**SAML sign-in (still required for SSO):** `SAML_IDP_METADATA_URL` (or file/XML), `SAML_SP_ENTITY_ID`, `SAML_APP_BASE_URL` — see the main block above.

**Optional debugging:** `SAML_LOG_LOGIN=true`, `SAML_DEBUG_ATTRIBUTES_ENDPOINT=true`, `SAML_EXPOSE_ATTRIBUTES_IN_ME=true` — see `docs/OIDC-TO-SAML-PROCESS.md`.

### Copy-paste: production-style values (DigitalOcean / `.env`)

Use your real app URL where needed. For **`SAML_TODO_GROUP_PRIORITY_JSON`**, use a **single line** in the dashboard (no line breaks).

```env
# Gate: no matching ToDo group → request-access screen only
SAML_REQUIRE_TODO_GROUP=true

# Optional: omit entirely to use built-in defaults (same as this JSON)
SAML_TODO_GROUP_PRIORITY_JSON=[{"group":"ToDo-SuperAdmins","role":"superadmin"},{"group":"ToDo-Admins","role":"workspace_admin"},{"group":"ToDo-ProjectManagers","role":"member"},{"group":"ToDo-Members","role":"member"},{"group":"ToDo-Viewers","role":"viewer"}]

# Optional: only if your IdP uses extra claim names for groups
# SAML_GROUP_CLAIM_KEYS=groups

# Optional: custom message for users without access
# SAML_ACCESS_DENIED_MESSAGE=You do not have access to the To-Do app. Open an IT ticket to request membership in ToDo-Members, ToDo-Viewers, or another ToDo-* group.

# Optional: set to false if no local/password users should bypass the group check
# SAML_ALLOW_LOCAL_PASSWORD_USERS=false
```

---

## Web (frontend) — build-time only

Single variable. Rebuild the web app after setting it.

```env
VITE_API_URL=https://revops-ntkll.ondigitalocean.app
```

**DigitalOcean:** In the **web** (static site) component → Build environment variables, add:

| Key | Value |
|-----|--------|
| `VITE_API_URL` | `https://revops-ntkll.ondigitalocean.app` |

---

## Quick reference — API keys only (paste your values)

Use this list when you only need to paste **your** values (e.g. from Okta or a secret generator).

| Variable | Where to get it | Example |
|----------|------------------|--------|
| `SESSION_SECRET` | Generate: `openssl rand -base64 32` | long random string |
| `OKTA_ISSUER` | Okta Admin → your OIDC app / Authorization Server | `https://dev-12345.okta.com/oauth2/default` |
| `OKTA_CLIENT_ID` | Okta Admin → Application → Client ID | `0oa...` |
| `OKTA_CLIENT_SECRET` | Okta Admin → Application → Client secret | `xxx...` |
| `SAML_IDP_METADATA_URL` | Okta SAML app → **Sign On** → metadata URL | `https://….okta.com/app/…/sso/saml/metadata` |
| `SAML_SP_ENTITY_ID` | Same as Okta **Audience URI** | `https://your-app.ondigitalocean.app` |
| `SAML_APP_BASE_URL` | Same public `https` origin as app | same as `APP_URL` |
| `DATABASE_URL` | DigitalOcean: from linked DB; local: your Postgres connection string | `postgresql://...` |

---

## Local development — minimal `.env` for backend

```env
DATABASE_URL=postgresql://user:password@localhost:5432/meridian
SESSION_SECRET=any-long-random-string-for-local
FRONTEND_URL=http://localhost:5173
APP_URL=http://localhost:4000
```

Add `OKTA_*` when testing Okta locally. Use redirect URI `http://localhost:4000/api/auth/okta/callback` in Okta for local testing.
