/**
 * Apply backend/scripts/schema.sql — shared by server startup and SAML login fallback.
 *
 * Optional: set SCHEMA_DATABASE_URL to an admin user (e.g. doadmin) when DATABASE_URL
 * uses a limited user (e.g. db) that cannot CREATE in schema public. After applying SQL,
 * we GRANT table/sequence access to the app user when the two URLs differ.
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const SCHEMA_PATH = path.join(__dirname, '..', 'scripts', 'schema.sql');

function stripSslModeFromUrl(url) {
  if (!url || typeof url !== 'string') return url;
  return url
    .replace(/[?&]sslmode=[^&]+/gi, '')
    .replace(/[?&]sslrootcert=[^&]+/gi, '')
    .replace(/[?&]ssl=[^&]+/gi, '')
    .replace(/\?&/, '?')
    .replace(/\?$/, '');
}

function parseUserFromDatabaseUrl(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const normalized = url.replace(/^postgresql:/i, 'http:').replace(/^postgres:/i, 'http:');
    const u = new URL(normalized);
    const user = u.username ? decodeURIComponent(u.username) : '';
    return user || null;
  } catch {
    return null;
  }
}

/** Database name from path segment (e.g. ...com:25060/db? → "db"). */
function parseDatabaseNameFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const normalized = url.replace(/^postgresql:/i, 'http:').replace(/^postgres:/i, 'http:');
    const u = new URL(normalized);
    let path = u.pathname || '';
    if (path.startsWith('/')) path = path.slice(1);
    const name = path.split('/')[0];
    return name ? decodeURIComponent(name) : null;
  } catch {
    return null;
  }
}

/** Safe PostgreSQL identifier quoting for simple role names (doadmin, db, app_user). */
function quoteIdent(name) {
  if (!name || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`[schema] Refusing unsafe PostgreSQL role name: ${name}`);
  }
  return `"${name.replace(/"/g, '""')}"`;
}

/**
 * @param {import('pg').Pool} adminPool pool connected as admin (ran CREATE TABLE)
 * @param {string} adminRole e.g. doadmin
 * @param {string} appRole e.g. db
 */
async function grantPrivilegesToAppUser(adminPool, adminRole, appRole) {
  const a = quoteIdent(adminRole);
  const u = quoteIdent(appRole);
  // connect-pg-simple creates table "session" at login — app user must CREATE in public
  await adminPool.query(`GRANT USAGE ON SCHEMA public TO ${u}`);
  await adminPool.query(`GRANT CREATE ON SCHEMA public TO ${u}`);
  await adminPool.query(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${u}`);
  await adminPool.query(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${u}`);
  await adminPool.query(
    `ALTER DEFAULT PRIVILEGES FOR ROLE ${a} IN SCHEMA public GRANT ALL ON TABLES TO ${u}`
  );
  await adminPool.query(
    `ALTER DEFAULT PRIVILEGES FOR ROLE ${a} IN SCHEMA public GRANT ALL ON SEQUENCES TO ${u}`
  );
}

/**
 * Pool used only for migrations when SCHEMA_DATABASE_URL is set.
 * @param {import('pg').Pool} mainPool app runtime pool (DATABASE_URL)
 */
function createMigrationPool(mainPool) {
  const schemaUrl = process.env.SCHEMA_DATABASE_URL;
  if (!schemaUrl || !String(schemaUrl).trim()) {
    return { pool: mainPool, end: async () => {} };
  }
  const dbUrl = schemaUrl;
  const isLocalDb = /@(localhost|127\.0\.0\.1)(:\d+)?\//.test(dbUrl);
  const connectionString = stripSslModeFromUrl(dbUrl);
  const poolConfig = { connectionString };
  if (!isLocalDb && dbUrl.trim()) {
    poolConfig.ssl = { rejectUnauthorized: false };
  }
  const p = new Pool(poolConfig);
  return {
    pool: p,
    end: () => p.end(),
  };
}

/**
 * @param {import('pg').Pool} mainPool runtime pool
 */
async function applySchema(mainPool) {
  const schemaUrl = process.env.SCHEMA_DATABASE_URL;
  const appUrl = process.env.DATABASE_URL;
  if (schemaUrl && appUrl && String(schemaUrl).trim() && String(appUrl).trim()) {
    const dbSchema = parseDatabaseNameFromUrl(schemaUrl);
    const dbApp = parseDatabaseNameFromUrl(appUrl);
    if (dbSchema && dbApp && dbSchema !== dbApp) {
      throw new Error(
        `[schema] DATABASE_URL database "${dbApp}" !== SCHEMA_DATABASE_URL database "${dbSchema}". ` +
          'Use the same database name in both URLs (e.g. both end with /db?sslmode=require).'
      );
    }
  }

  const sql = fs.readFileSync(SCHEMA_PATH, 'utf8');
  const { pool: migratePool, end } = createMigrationPool(mainPool);
  const ownsSeparatePool = migratePool !== mainPool;

  try {
    await migratePool.query(sql);

    if (schemaUrl && appUrl && String(schemaUrl).trim()) {
      const adminUser = parseUserFromDatabaseUrl(schemaUrl);
      const appUser = parseUserFromDatabaseUrl(appUrl);
      if (adminUser && appUser && adminUser !== appUser) {
        console.warn(
          `[schema] Applied DDL as "${adminUser}"; granting access to app user "${appUser}"`
        );
        await grantPrivilegesToAppUser(migratePool, adminUser, appUser);
      }
    }

    return true;
  } finally {
    if (ownsSeparatePool) {
      await end();
    }
  }
}

/**
 * If `users` is missing (empty DB / schema never ran), apply full schema once.
 * @param {import('pg').Pool} pool
 */
async function ensureUsersTableForAuth(pool) {
  try {
    await pool.query('SELECT 1 FROM public.users LIMIT 1');
    return;
  } catch (e) {
    if (e && e.code === '42P01') {
      console.warn('[schema] public.users missing — applying schema.sql...');
      try {
        await applySchema(pool);
        console.warn('[schema] schema.sql applied OK.');
        await pool.query('SELECT 1 FROM public.users LIMIT 1');
        console.warn('[schema] Verified app user can read public.users.');
      } catch (err) {
        console.error('[schema] applySchema failed:', err.message);
        if (/permission denied.*public/i.test(String(err.message))) {
          console.error(
            '[schema] Hint: set SCHEMA_DATABASE_URL to the doadmin connection string (same DB as DATABASE_URL), or GRANT CREATE ON SCHEMA public. See docs/DEPLOY-DB-SCHEMA.md'
          );
        }
        throw err;
      }
      return;
    }
    throw e;
  }
}

module.exports = { applySchema, ensureUsersTableForAuth, SCHEMA_PATH };
