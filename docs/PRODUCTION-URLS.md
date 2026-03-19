# Production URLs and settings — todoapp-jzfe4

Use this as the single reference for the **production** app:

**Base URL:** `https://todoapp-jzfe4.ondigitalocean.app` (no trailing slash in config)

**Deploy:** Git branch **`production`** · App Platform spec: **`app-production.yaml`** (see **`docs/PRODUCTION-BRANCH.md`**).

---

## 1. App and login URLs

| Purpose | URL |
|--------|-----|
| **App / login page** | https://todoapp-jzfe4.ondigitalocean.app/ |
| **Post-login redirect (frontend)** | https://todoapp-jzfe4.ondigitalocean.app/?auth=ok |
| **API base** | https://todoapp-jzfe4.ondigitalocean.app/api |
| **Health check** | https://todoapp-jzfe4.ondigitalocean.app/api/health |
| **Auth “me”** | https://todoapp-jzfe4.ondigitalocean.app/api/auth/me |

---

## 2. OIDC (Okta) — redirect and callback URLs

| Purpose | URL |
|--------|-----|
| **Start SSO (user clicks “Sign in with Okta”)** | https://todoapp-jzfe4.ondigitalocean.app/api/auth/okta |
| **Sign-in redirect URI** (set in Okta Admin) | https://todoapp-jzfe4.ondigitalocean.app/api/auth/okta/callback |
| **Sign-out redirect URI** (optional) | https://todoapp-jzfe4.ondigitalocean.app/ |

---

## 3. SAML (Okta SAML 2.0 app)

| Purpose | URL or value |
|--------|---------------|
| **Start SSO (user clicks “Sign in with SSO”)** | https://todoapp-jzfe4.ondigitalocean.app/api/auth/saml |
| **Single sign-on URL (ACS)** (set in Okta) | https://todoapp-jzfe4.ondigitalocean.app/api/auth/saml/callback |
| **Audience URI (SP Entity ID)** (set in Okta) | https://todoapp-jzfe4.ondigitalocean.app |
| **Application redirect URI** (if used in Okta) | https://todoapp-jzfe4.ondigitalocean.app/ |

---

## 4. Environment variables (production)

Set these in the **api** component (DigitalOcean → App → api → Environment Variables):

| Key | Production value |
|-----|-------------------|
| `FRONTEND_URL` | `https://todoapp-jzfe4.ondigitalocean.app` |
| `APP_URL` | `https://todoapp-jzfe4.ondigitalocean.app` |
| `SAML_SP_ENTITY_ID` | `https://todoapp-jzfe4.ondigitalocean.app` |
| `SAML_APP_BASE_URL` | `https://todoapp-jzfe4.ondigitalocean.app` |

Set in the **web** (frontend) component (build-time):

| Key | Production value |
|-----|-------------------|
| `VITE_API_URL` | `https://todoapp-jzfe4.ondigitalocean.app` |

---

## 5. Okta app configuration checklist

**For OIDC (Okta “Web Application”):**

- **Sign-in redirect URI:** `https://todoapp-jzfe4.ondigitalocean.app/api/auth/okta/callback`
- **Sign-out redirect URI (optional):** `https://todoapp-jzfe4.ondigitalocean.app`
- **Trusted Origins:** add `https://todoapp-jzfe4.ondigitalocean.app` if required

**For SAML 2.0 app:**

- **Single sign-on URL:** `https://todoapp-jzfe4.ondigitalocean.app/api/auth/saml/callback`
- **Audience URI (SP Entity ID):** `https://todoapp-jzfe4.ondigitalocean.app`
- **Application redirect URI (if used):** `https://todoapp-jzfe4.ondigitalocean.app/`

---

## 6. Quick copy-paste (no trailing slash)

```
https://todoapp-jzfe4.ondigitalocean.app
```

Use this value for `FRONTEND_URL`, `APP_URL`, `SAML_SP_ENTITY_ID`, `SAML_APP_BASE_URL`, and `VITE_API_URL`.
