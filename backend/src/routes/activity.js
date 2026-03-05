// src/routes/activity.js
const router = require('express').Router();
const pool   = require('../db/pool');

router.get('/', async (req, res, next) => {
  try {
    const { project_id, item_id, limit=50 } = req.query;
    const conds = [], vals = [];
    if (project_id) { conds.push(`a.project_id=$${vals.length+1}`); vals.push(project_id); }
    if (item_id)    { conds.push(`a.item_id=$${vals.length+1}`);    vals.push(item_id); }
    vals.push(Math.min(Number(limit),200));
    const { rows } = await pool.query(`
      SELECT a.*, tm.name AS actor_name, tm.avatar AS actor_avatar, tm.color AS actor_color,
             w.title AS item_title
      FROM activity_log a
      LEFT JOIN team_members tm ON tm.id=a.actor_id
      LEFT JOIN work_items w ON w.id=a.item_id
      ${conds.length ? 'WHERE '+conds.join(' AND ') : ''}
      ORDER BY a.created_at DESC
      LIMIT $${vals.length}
    `, vals);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  const { item_id, project_id, sprint_id, actor_id, action, payload } = req.body;
  if (!action) return res.status(400).json({ error: 'action required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO activity_log (item_id,project_id,sprint_id,actor_id,action,payload)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [item_id||null, project_id||null, sprint_id||null, actor_id||null,
       action, payload ? JSON.stringify(payload) : null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
