// src/routes/sprints.js
const router = require('express').Router();
const pool   = require('../db/pool');

// GET all sprints (optionally filtered by project)
router.get('/', async (req, res, next) => {
  try {
    const { project_id } = req.query;
    const { rows } = await pool.query(
      `SELECT s.*,
         (SELECT SUM(points) FROM work_items w WHERE w.sprint_id = s.id) AS total_points,
         (SELECT SUM(points) FROM work_items w WHERE w.sprint_id = s.id AND w.status='done') AS done_points,
         (SELECT COUNT(*) FROM work_items w WHERE w.sprint_id = s.id) AS item_count
       FROM sprints s
       ${project_id ? 'WHERE s.project_id = $1' : ''}
       ORDER BY s.start_date DESC`,
      project_id ? [project_id] : []
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST create sprint
router.post('/', async (req, res, next) => {
  const { project_id, name, goal, start_date, end_date, capacity } = req.body;
  if (!project_id || !name) return res.status(400).json({ error: 'project_id and name required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO sprints (project_id, name, goal, start_date, end_date, capacity)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [project_id, name, goal||null, start_date||null, end_date||null, capacity||0]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// PATCH update sprint
router.patch('/:id', async (req, res, next) => {
  const fields = ['name','goal','status','start_date','end_date','capacity'];
  const updates = [], values = [];
  fields.forEach(f => {
    if (req.body[f] !== undefined) { updates.push(`${f} = $${updates.length+1}`); values.push(req.body[f]); }
  });
  if (!updates.length) return res.status(400).json({ error: 'No fields to update' });
  values.push(req.params.id);
  try {
    const { rows } = await pool.query(
      `UPDATE sprints SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`, values
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// DELETE sprint
router.delete('/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM sprints WHERE id = $1', [req.params.id]);
    res.json({ deleted: true });
  } catch (err) { next(err); }
});

module.exports = router;
