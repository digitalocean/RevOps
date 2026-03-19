# Production branch and DigitalOcean

Production app URL: **https://todoapp-jzfe4.ondigitalocean.app/**

This repo uses a dedicated **`production`** Git branch and **`app-production.yaml`** for DigitalOcean App Platform.

---

## 1. Create the `production` branch (GitHub)

From your default branch (e.g. `main`):

```bash
git checkout main
git pull
git checkout -b production
git push -u origin production
```

**Ongoing workflow:** merge or cherry-pick only what you want live into `production`, then push. DigitalOcean can deploy on every push to `production`.

---

## 2. App spec file

| File | Purpose |
|------|---------|
| **`app-production.yaml`** | Production DO spec: **todoapp-jzfe4** URLs, branch **`production`**, components **api** + **web**. |

Before deploying:

1. Open **`app-production.yaml`** and replace **`YOUR_GITHUB_ORG/YOUR_REPO`** with your real GitHub repository (same value in **both** the `api` and `web` `github.repo` fields).
2. Commit and push to **`production`**.

---

## 3. DigitalOcean settings

1. **App** → **Settings** → **Components** (or the GitHub integration).
2. Set the **branch** to **`production`** for both the API service and the Static Site (if not driven only by the spec).
3. **Settings** → **App Spec** → paste or sync from **`app-production.yaml`** in the repo (or upload the file from the `production` branch after push).

**Database:** This spec does **not** declare a `databases` block (avoids “create and delete database in one spec change” errors). Add or link Postgres in the DO UI and set **`DATABASE_URL`** on the **api** component (or use a linked DB resource if you add one named `db` and switch the env to `${db.DATABASE_URL}` in the dashboard only).

**Secrets:** Replace placeholders in the DO dashboard for **`SESSION_SECRET`**, **`OKTA_*`**, **`SAML_IDP_METADATA_URL`**, and **`DATABASE_URL`** as needed.

---

## 4. Production URLs and Okta

All redirect URLs, SAML ACS, and env var values for **todoapp-jzfe4** are listed in **`docs/PRODUCTION-URLS.md`**.

---

## 5. Other spec files (reference)

| File | Use |
|------|-----|
| **`app.yaml`** | Older / alternate deployment (e.g. component name **revops**, different branch). |
| **`app-new.yaml`** | Template for **new** apps (placeholders, not tied to todoapp-jzfe4). |

---

## 6. Optional: `.do` folder

Some teams copy the production spec to **`.do/app.yaml`** so the DO GitHub integration picks it up automatically. If you do that, keep it in sync with **`app-production.yaml`** or symlink only if your tooling supports it.
