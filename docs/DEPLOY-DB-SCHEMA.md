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
