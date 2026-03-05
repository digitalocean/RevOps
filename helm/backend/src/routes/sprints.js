const express = require('express');
const pool = require('../db/pool');
const router = express.Router();

router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, goal, status, start_date, end_date, capacity } = req.body;
    const { rows } = await pool.query(
      `UPDATE sprints SET name = COALESCE($1, name), goal = COALESCE($2, goal), status = COALESCE($3, status), start_date = COALESCE($4, start_date), end_date = COALESCE($5, end_date), capacity = COALESCE($6, capacity), updated_at = NOW() WHERE id = $7 RETURNING *`,
      [name, goal, status, start_date, end_date, capacity, id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

module.exports = router;
