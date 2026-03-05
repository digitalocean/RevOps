const fs = require('fs');
const path = require('path');
if (process.env.DATABASE_URL && (process.env.DATABASE_URL.includes('ondigitalocean.com') || /sslmode=/.test(process.env.DATABASE_URL) || process.env.DATABASE_URL.includes(':25060/'))) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}
const pool = require('./pool');

async function init() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  try {
    await pool.query(sql);
    console.log('Helm schema created.');
  } catch (err) {
    console.error('Schema failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}
init();
