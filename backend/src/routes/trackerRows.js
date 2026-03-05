const express = require('express');
const pool = require('../db/pool');
const router = express.Router();

router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, sort_order } = req.body;
    const updates = [];
    const values = [];
    let i = 1;
    if (data !== undefined) { updates.push(`data = $${i}`); values.push(JSON.stringify(data)); i++; }
    if (sort_order !== undefined) { updates.push(`sort_order = $${i}`); values.push(sort_order); i++; }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields' });
    values.push(id);
    const { rows } = await pool.query(`UPDATE tracker_rows SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${i} RETURNING *`, values);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM tracker_rows WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
