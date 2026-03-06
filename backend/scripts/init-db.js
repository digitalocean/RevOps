require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function initDB() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set. Create backend/.env from .env.example');
    process.exit(1);
  }
  const client = await pool.connect();
  console.log('🏔  Meridian DB init — applying schema.sql ...\n');
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await client.query(sql);
    console.log('✅  Schema applied. No seed data — create workspaces from the app.\n');
  } catch (e) {
    console.error('❌  DB init failed:', e.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

initDB();
