const { Pool } = require('pg');
require('dotenv').config();

const connUrl = process.env.DATABASE_URL || '';
const useSSL = connUrl.includes('ondigitalocean.com') || /sslmode=/.test(connUrl) || /:25060\//.test(connUrl);

const pool = new Pool({
  connectionString: connUrl || undefined,
  ssl: useSSL ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => console.error('DB error:', err.message));
module.exports = pool;
