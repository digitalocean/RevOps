// src/db/init.js — Run this once to create all tables
// Usage: npm run db:init
const fs   = require('fs');
const path = require('path');
if (process.env.DATABASE_URL && (process.env.DATABASE_URL.includes('ondigitalocean.com') || /sslmode=/.test(process.env.DATABASE_URL) || process.env.DATABASE_URL.includes(':25060/'))) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}
const pool = require('./pool');

async function init() {
  console.log('🔧 Connecting to database...');
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  try {
    await pool.query(sql);
    console.log('✅ Schema created successfully!');
  } catch (err) {
    console.error('❌ Schema creation failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

init();
