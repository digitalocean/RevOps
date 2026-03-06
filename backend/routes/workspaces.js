const router = require('express').Router();
const { pool } = require('../server');

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM workspaces ORDER BY name ASC'
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, slug, color, icon } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Team name is required' });
    }
    const safeSlug = (slug || name).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'team';
    const { rows } = await pool.query(
      `INSERT INTO workspaces (name, slug, color, icon) VALUES ($1, $2, $3, $4) RETURNING *`,
      [name.trim(), safeSlug, color || '#6366f1', icon || '⚡']
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const allowed = ['name', 'slug', 'color', 'icon'];
    const fields = Object.keys(req.body).filter(k => allowed.includes(k));
    if (!fields.length) return res.status(400).json({ error: 'No valid fields' });
    const sets = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
    const vals = fields.map(f => req.body[f]);
    const { rows } = await pool.query(
      `UPDATE workspaces SET ${sets} WHERE id = $1 RETURNING *`,
      [req.params.id, ...vals]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
