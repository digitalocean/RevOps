# Database schema on production (DigitalOcean)

If SAML or login fails with **`relation "users" does not exist`**, the Postgres database has **no tables yet**.

## Automatic (recommended)

The API runs **`backend/scripts/schema.sql`** on startup **before** listening, with retries. After deploy, check **Runtime logs** for:

`To-DO schema ensured.`

If startup migration failed but the process is running, the **SAML** login path will **try to apply the schema again** when it detects `relation "users" does not exist` (`42P01`).

If you see **`Schema init failed`**, fix `DATABASE_URL` (reachable DB, SSL) and redeploy.

## Manual one-shot

From your laptop (or any machine with `node` and network access to the DB):

```bash
cd backend
export DATABASE_URL="postgresql://..."   # from DO: Database → Connection string
export NODE_ENV=production
node scripts/init-db.js
```

Or open in a browser (after at least one successful deploy so the route exists):

`https://YOUR-APP.ondigitalocean.app/api/db/ensure`

## New database

Every **new** DO Dev Database or Managed DB starts **empty**. The first API start (or `init-db.js`) creates tables.

---

## `permission denied for schema public`

This means the **Postgres role** in your **`DATABASE_URL`** is not allowed to **CREATE** tables in `public` (common on **PostgreSQL 15+**, or if you use a **limited** user).

### Fix A — Use the primary admin user in `DATABASE_URL`

In **DigitalOcean** → **Databases** → your cluster → **Connection details**:

- Use the **primary / admin** user (often **`doadmin`**) and the **full** connection string (with password).
- Paste that into the **api** component’s **`DATABASE_URL`** and redeploy.

Do **not** use a read-only or “pooler-only” user for migrations if that user cannot create tables.

### Fix B — Grant CREATE on `public` (run once as admin)

1. Open **DigitalOcean** → **Databases** → **Query** (or connect with `psql` as `doadmin`).
2. Find your **app** user name from `DATABASE_URL` (the username before `@` in the URI).
3. Run (replace `appuser` with that username):

```sql
GRANT USAGE ON SCHEMA public TO appuser;
GRANT CREATE ON SCHEMA public TO appuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO appuser;
```

For **`doadmin`**, you usually already have rights; if the app uses another role, grant to **that** role.

### Fix C — App Platform Dev DB

If the DB is the **small Dev Database** attached to the app, check **Users & Databases** in the DO UI and ensure the user in **`DATABASE_URL`** is the **owner** or has been granted DDL rights.

After fixing permissions, redeploy the API or hit **`/api/db/ensure`** once.
