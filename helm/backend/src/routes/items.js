const express = require('express');
const pool = require('../db/pool');
const router = express.Router();

router.get('/sprints/:sprintId/items', async (req, res, next) => {
  try {
    const { sprintId } = req.params;
    const { rows } = await pool.query(
      'SELECT * FROM work_items WHERE sprint_id = $1 ORDER BY created_at',
      [sprintId]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

router.post('/items', async (req, res, next) => {
  try {
    const { project_id, sprint_id, parent_id, type, title, description, status, priority, points, assignee_id, start_date, end_date, created_by } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO work_items (project_id, sprint_id, parent_id, type, title, description, status, priority, points, assignee_id, start_date, end_date, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [project_id, sprint_id || null, parent_id || null, type || 'task', title || '', description || null, status || 'backlog', priority || 'medium', points ?? 1, assignee_id || null, start_date || null, end_date || null, created_by || null]
    );
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
});

router.patch('/items/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = req.body;
    const fields = [];
    const values = [];
    let i = 1;
    ['project_id', 'sprint_id', 'parent_id', 'type', 'title', 'description', 'status', 'priority', 'points', 'assignee_id', 'start_date', 'end_date'].forEach(k => {
      if (body[k] !== undefined) {
        fields.push(`${k} = $${i}`);
        values.push(body[k] === '' ? null : body[k]);
        i++;
      }
    });
    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
    values.push(id);
    const { rows } = await pool.query(
      `UPDATE work_items SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${i} RETURNING *`,
      values
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

router.patch('/items/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { rows } = await pool.query('UPDATE work_items SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *', [status, id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

router.delete('/items/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM work_items WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
