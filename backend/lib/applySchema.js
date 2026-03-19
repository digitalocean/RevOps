/**
 * Apply backend/scripts/schema.sql — shared by server startup and SAML login fallback.
 */
const fs = require('fs');
const path = require('path');

const SCHEMA_PATH = path.join(__dirname, '..', 'scripts', 'schema.sql');

/**
 * @param {import('pg').Pool} pool
 * @returns {Promise<boolean>}
 */
async function applySchema(pool) {
  const sql = fs.readFileSync(SCHEMA_PATH, 'utf8');
  await pool.query(sql);
  return true;
}

/**
 * If `users` is missing (empty DB / schema never ran), apply full schema once.
 * @param {import('pg').Pool} pool
 */
async function ensureUsersTableForAuth(pool) {
  try {
    await pool.query('SELECT 1 FROM users LIMIT 1');
    return;
  } catch (e) {
    if (e && e.code === '42P01') {
      console.warn('[schema] public.users missing — applying schema.sql...');
      try {
        await applySchema(pool);
        console.warn('[schema] schema.sql applied OK.');
      } catch (err) {
        console.error('[schema] applySchema failed:', err.message);
        if (/permission denied.*public/i.test(String(err.message))) {
          console.error(
            '[schema] Hint: DATABASE_URL user needs CREATE on schema public (use doadmin URI or GRANT … TO appuser). See docs/DEPLOY-DB-SCHEMA.md § permission denied'
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
