// src/db/seed.js — Load sample data
// Usage: npm run db:seed
const fs   = require('fs');
const path = require('path');
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
