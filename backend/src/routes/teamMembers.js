// src/routes/teamMembers.js
const router = require('express').Router();
const pool   = require('../db/pool');

// GET all team members
router.get('/', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM team_members ORDER BY created_at ASC'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET single member
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM team_members WHERE id = $1', [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// POST create member
router.post('/', async (req, res, next) => {
  const { name, email, role, avatar, color } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'name and email are required' });
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2);
  try {
    const { rows } = await pool.query(
      `INSERT INTO team_members (name, email, role, avatar, color)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name, email, role || null, avatar || initials, color || '#6366f1']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    next(err);
  }
});

// PATCH update member
router.patch('/:id', async (req, res, next) => {
  const fields = ['name','email','role','avatar','color','active'];
  const updates = [], values = [];
  fields.forEach(f => {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = $${updates.length + 1}`);
      values.push(req.body[f]);
    }
  });
  if (!updates.length) return res.status(400).json({ error: 'No fields to update' });
  values.push(req.params.id);
  try {
    const { rows } = await pool.query(
      `UPDATE team_members SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// DELETE member
router.delete('/:id', async (req, res, next) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM team_members WHERE id = $1', [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (err) { next(err); }
});

module.exports = router;
