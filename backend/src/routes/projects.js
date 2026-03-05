const express = require('express');
const pool = require('../db/pool');
const router = express.Router();

router.get('/:projectId/trackers', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { rows } = await pool.query('SELECT * FROM trackers WHERE project_id = $1 ORDER BY sort_order, name', [projectId]);
    res.json(rows);
  } catch (e) { next(e); }
});

router.post('/:projectId/trackers', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { name, icon, columns } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO trackers (project_id, name, icon, columns) VALUES ($1, $2, $3, $4) RETURNING *',
      [projectId, name || 'Tracker', icon || null, JSON.stringify(columns || [])]
    );
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
});

router.get('/:projectId/sprints', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { rows } = await pool.query('SELECT * FROM sprints WHERE project_id = $1 ORDER BY start_date DESC NULLS LAST', [projectId]);
    res.json(rows);
  } catch (e) { next(e); }
});

router.post('/:projectId/sprints', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { name, goal, status, start_date, end_date, capacity } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO sprints (project_id, name, goal, status, start_date, end_date, capacity) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [projectId, name || 'Sprint', goal || null, status || 'planning', start_date || null, end_date || null, capacity ?? 0]
    );
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
});

router.get('/', async (_req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM projects ORDER BY name');
    res.json(rows);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { workspace_id, name, description, color, status, owner_id } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO projects (workspace_id, name, description, color, status, owner_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [workspace_id || null, name || '', description || null, color || null, status || 'active', owner_id || null]
    );
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { workspace_id, name, description, color, status, owner_id } = req.body;
    const { rows } = await pool.query(
      `UPDATE projects SET workspace_id = COALESCE($1, workspace_id), name = COALESCE($2, name), description = COALESCE($3, description), color = COALESCE($4, color), status = COALESCE($5, status), owner_id = COALESCE($6, owner_id), updated_at = NOW() WHERE id = $7 RETURNING *`,
      [workspace_id, name, description, color, status, owner_id, id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

module.exports = router;
