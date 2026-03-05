// src/db/seed.js — Load sample data
// Usage: npm run db:seed
const fs   = require('fs');
const path = require('path');
if (process.env.DATABASE_URL && (process.env.DATABASE_URL.includes('ondigitalocean.com') || process.env.DATABASE_URL.includes('sslmode=require'))) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}
const pool = require('./pool');

async function seed() {
  console.log('🌱 Seeding sample data...');
  const sql = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
  try {
    await pool.query(sql);
    console.log('✅ Sample data loaded!');
    console.log('   You should now see Sprint 14 items in the app.');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
