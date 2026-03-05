// src/routes/projects.js
const router = require('express').Router();
const pool   = require('../db/pool');

// GET all projects (with member count and sprint count)
router.get('/', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.*,
        tm.name AS owner_name,
        (SELECT COUNT(*) FROM sprints s WHERE s.project_id = p.id) AS sprint_count,
        (SELECT COUNT(*) FROM work_items w WHERE w.project_id = p.id) AS item_count,
        (SELECT COUNT(*) FROM work_items w WHERE w.project_id = p.id AND w.status = 'done') AS done_count
      FROM projects p
      LEFT JOIN team_members tm ON tm.id = p.owner_id
      ORDER BY p.created_at DESC
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

// GET single project
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, tm.name AS owner_name
       FROM projects p LEFT JOIN team_members tm ON tm.id = p.owner_id
       WHERE p.id = $1`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// POST create project
router.post('/', async (req, res, next) => {
  const { name, description, color, owner_id, board_column_order, custom_field_values } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO projects (name, description, color, owner_id, board_column_order, custom_field_values)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, description || null, color || '#7c6af7', owner_id || null,
        board_column_order ? JSON.stringify(board_column_order) : null,
        custom_field_values ? JSON.stringify(custom_field_values) : null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// PATCH update project
router.patch('/:id', async (req, res, next) => {
  const fields = ['name','description','color','status','owner_id','board_column_order','custom_field_values'];
  const updates = [], values = [];
  fields.forEach(f => {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = $${updates.length + 1}`);
      values.push((f === 'board_column_order' || f === 'custom_field_values') ? JSON.stringify(req.body[f]) : req.body[f]);
    }
  });
  if (!updates.length) return res.status(400).json({ error: 'No fields to update' });
  values.push(req.params.id);
  try {
    const { rows } = await pool.query(
      `UPDATE projects SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`, values
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// DELETE project
router.delete('/:id', async (req, res, next) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM projects WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (err) { next(err); }
});

module.exports = router;
