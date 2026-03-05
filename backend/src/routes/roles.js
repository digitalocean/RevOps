// src/routes/roles.js — Configurable roles for team members
const router = require('express').Router();
const pool = require('../db/pool');

// GET all roles
router.get('/', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, sort_order, created_at FROM roles ORDER BY sort_order ASC, name ASC'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST create role
router.post('/', async (req, res, next) => {
  const { name } = req.body;
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'name is required' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO roles (name) VALUES ($1) RETURNING id, name, sort_order, created_at',
      [String(name).trim()]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Role with this name already exists' });
    next(err);
  }
});

// DELETE role
router.delete('/:id', async (req, res, next) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM roles WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.status(204).send();
  } catch (err) { next(err); }
});

module.exports = router;
