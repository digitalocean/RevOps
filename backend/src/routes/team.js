const express = require('express');
const pool = require('../db/pool');
const router = express.Router();

router.get('/', async (_req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM team_members WHERE active = true ORDER BY name');
    res.json(rows);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, email, role, avatar, color } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO team_members (name, email, role, avatar, color) VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name || '', email || '', role || null, avatar || null, color || '#6366f1']
    );
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, role, avatar, color } = req.body;
    const { rows } = await pool.query(
      `UPDATE team_members SET name = COALESCE($1, name), email = COALESCE($2, email), role = COALESCE($3, role), avatar = COALESCE($4, avatar), color = COALESCE($5, color), updated_at = NOW() WHERE id = $6 RETURNING *`,
      [name, email, role, avatar, color, id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.query('UPDATE team_members SET active = false, updated_at = NOW() WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
