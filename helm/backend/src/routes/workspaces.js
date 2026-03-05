const express = require('express');
const pool = require('../db/pool');
const router = express.Router();

router.get('/', async (_req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM workspaces ORDER BY name');
    res.json(rows);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, slug, color, icon } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO workspaces (name, slug, color, icon) VALUES ($1, $2, $3, $4) RETURNING *',
      [name || '', (slug || name || '').toLowerCase().replace(/\s+/g, '-'), color || null, icon || null]
    );
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
});

module.exports = router;
