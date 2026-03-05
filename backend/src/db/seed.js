// src/db/seed.js — Load sample data
// Usage: npm run db:seed
const fs   = require('fs');
const path = require('path');
if (process.env.DATABASE_URL && (process.env.DATABASE_URL.includes('ondigitalocean.com') || /sslmode=/.test(process.env.DATABASE_URL) || process.env.DATABASE_URL.includes(':25060/'))) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}
const pool = require('./pool');

async function seed() {
  console.log('🌱 Running seed (no sample data by default)...');
  const sql = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
  const trimmed = sql.replace(/--.*$/gm, '').trim();
  try {
    if (trimmed) await pool.query(sql);
    console.log('✅ Seed complete. Create projects, sprints, and team from the app UI.');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
