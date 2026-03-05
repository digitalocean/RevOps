// src/db/pool.js — PostgreSQL connection pool
// This is shared across all routes. One pool, many connections.
const { Pool } = require('pg');
require('dotenv').config();

const connUrl = process.env.DATABASE_URL || '';
const useSSL = connUrl.includes('ondigitalocean.com') || /sslmode=/.test(connUrl) || /:25060\//.test(connUrl);
const pool = new Pool({
  connectionString: connUrl || undefined,
  // Managed DBs (e.g. DigitalOcean) use certs Node may reject; skip strict verify
  ssl: useSSL ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err.message);
});

module.exports = pool;
