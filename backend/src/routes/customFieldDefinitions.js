// src/routes/customFieldDefinitions.js — Define custom fields per entity type (project, sprint, work_item)
const router = require('express').Router();
const pool   = require('../db/pool');

const ENTITY_TYPES = ['project', 'sprint', 'work_item'];
const FIELD_TYPES  = ['text', 'number', 'date', 'select', 'checkbox'];

// GET list (optional: entity_type, project_id for work_item scoping)
router.get('/', async (req, res, next) => {
  try {
    const { entity_type, project_id } = req.query;
    const conds = [], vals = [];
    if (entity_type) {
      if (!ENTITY_TYPES.includes(entity_type)) return res.status(400).json({ error: 'Invalid entity_type' });
      conds.push(`entity_type = $${vals.length + 1}`);
      vals.push(entity_type);
    }
    if (project_id) {
      conds.push(`(project_id IS NULL OR project_id = $${vals.length + 1})`);
      vals.push(project_id);
    }
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
    const { rows } = await pool.query(
      `SELECT * FROM custom_field_definitions ${where} ORDER BY entity_type, COALESCE(project_id::text, ''), sort_order, name`,
      vals
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST create
router.post('/', async (req, res, next) => {
  const { entity_type, project_id, name, field_type, options, sort_order } = req.body;
  if (!entity_type || !name) return res.status(400).json({ error: 'entity_type and name required' });
  if (!ENTITY_TYPES.includes(entity_type)) return res.status(400).json({ error: 'Invalid entity_type' });
  const ft = (field_type && FIELD_TYPES.includes(field_type)) ? field_type : 'text';
  try {
    const { rows } = await pool.query(
      `INSERT INTO custom_field_definitions (entity_type, project_id, name, field_type, options, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [entity_type, project_id || null, name.trim(), ft, options ? JSON.stringify(options) : null, sort_order ?? 0]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// PATCH update
router.patch('/:id', async (req, res, next) => {
  const { name, field_type, options, sort_order } = req.body;
  const updates = [], values = [];
  if (name !== undefined) { updates.push(`name = $${values.length + 1}`); values.push(name.trim()); }
  if (field_type !== undefined && FIELD_TYPES.includes(field_type)) { updates.push(`field_type = $${values.length + 1}`); values.push(field_type); }
  if (options !== undefined) { updates.push(`options = $${values.length + 1}`); values.push(JSON.stringify(options)); }
  if (sort_order !== undefined) { updates.push(`sort_order = $${values.length + 1}`); values.push(sort_order); }
  if (!updates.length) return res.status(400).json({ error: 'No fields to update' });
  values.push(req.params.id);
  try {
    const { rows } = await pool.query(
      `UPDATE custom_field_definitions SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// DELETE
router.delete('/:id', async (req, res, next) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM custom_field_definitions WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (err) { next(err); }
});

module.exports = router;
