const express = require('express');
const pool = require('../db/pool');
const router = express.Router();

router.get('/:id/rows', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT * FROM tracker_rows WHERE tracker_id = $1 ORDER BY sort_order, created_at', [id]);
    res.json(rows);
  } catch (e) { next(e); }
});

router.post('/:id/rows', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, sort_order } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO tracker_rows (tracker_id, data, sort_order) VALUES ($1, $2, $3) RETURNING *',
      [id, JSON.stringify(data || {}), sort_order ?? 0]
    );
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
});

router.patch('/:id/columns', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { columns } = req.body;
    const { rows } = await pool.query('UPDATE trackers SET columns = $1 WHERE id = $2 RETURNING *', [JSON.stringify(columns || []), id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

module.exports = router;
