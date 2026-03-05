// src/db/reset.js — Delete all data (tables stay). Run before re-seeding.
// Usage: npm run db:reset
const fs   = require('fs');
const path = require('path');
// Allow self-signed certs when connecting to managed DB (e.g. DigitalOcean) from CLI
if (process.env.DATABASE_URL && (process.env.DATABASE_URL.includes('ondigitalocean.com') || /sslmode=/.test(process.env.DATABASE_URL) || process.env.DATABASE_URL.includes(':25060/'))) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}
const pool = require('./pool');

async function reset() {
  console.log('🔧 Connecting to database...');
  const sql = fs.readFileSync(path.join(__dirname, 'reset.sql'), 'utf8');
  try {
    await pool.query(sql);
    console.log('✅ All data deleted. Tables are empty. Run npm run db:seed to load sample data.');
  } catch (err) {
    console.error('❌ Reset failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

reset();
