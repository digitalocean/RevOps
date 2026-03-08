const router = require('express').Router();
const { pool } = require('../server');
const { getAccessibleWorkspaceIds, requireUser } = require('../lib/access');

router.get('/', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const allowedIds = await getAccessibleWorkspaceIds(pool, userId);
    if (allowedIds.length === 0) return res.json([]);
    const placeholders = allowedIds.map((_, i) => `$${i + 1}`).join(',');
    const { rows } = await pool.query({
      name: 'workspaces_list',
      text: `SELECT * FROM workspaces WHERE id IN (${placeholders}) ORDER BY name ASC`,
      values: allowedIds,
    });
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const { name, slug, color, icon } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Team name is required' });
    }
    const safeSlug = (slug || name).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'team';
    const { rows } = await pool.query({
      name: 'workspaces_insert',
      text: 'INSERT INTO workspaces (name, slug, color, icon, owner_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      values: [name.trim(), safeSlug, color || '#6366f1', icon || '⚡', userId],
    });
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const allowedIds = await getAccessibleWorkspaceIds(pool, userId);
    if (!allowedIds.some(id => String(id) === String(req.params.id))) {
      return res.status(404).json({ error: 'Not found' });
    }
    const allowed = ['name', 'slug', 'color', 'icon'];
    const fields = Object.keys(req.body).filter(k => allowed.includes(k));
    if (!fields.length) return res.status(400).json({ error: 'No valid fields' });
    const sets = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
    const vals = fields.map(f => req.body[f]);
    const { rows } = await pool.query({
      name: 'workspaces_patch',
      text: `UPDATE workspaces SET ${sets} WHERE id = $1 RETURNING *`,
      values: [req.params.id, ...vals],
    });
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
