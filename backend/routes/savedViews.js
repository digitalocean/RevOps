const router = require('express').Router();
const { pool } = require('../server');
const { getAccessibleProjectIds, requireUser } = require('../lib/access');

// GET /api/projects/:id/views — user's views + shared views for this project
router.get('/projects/:id/views', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const projectId = req.params.id;
    const allowed = await getAccessibleProjectIds(pool, userId);
    if (!allowed.some(id => String(id) === String(projectId))) {
      return res.status(404).json({ error: 'Not found' });
    }
    const { rows } = await pool.query({
      name: 'saved_views_list',
      text: 'SELECT * FROM saved_views WHERE project_id = $1 AND (user_id = $2 OR is_shared = true) ORDER BY is_default DESC, name ASC',
      values: [projectId, userId],
    });
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/projects/:id/views
router.post('/projects/:id/views', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const projectId = req.params.id;
    const allowed = await getAccessibleProjectIds(pool, userId);
    if (!allowed.some(id => String(id) === String(projectId))) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const { name, view_type = 'tracker', filters = {}, column_config = {}, sort_config = {}, is_default = false, is_shared = false } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'name required' });
    if (is_default) {
      await pool.query({
        name: 'saved_views_clear_default',
        text: 'UPDATE saved_views SET is_default = false WHERE project_id = $1 AND user_id = $2',
        values: [projectId, userId],
      });
    }
    const { rows } = await pool.query({
      name: 'saved_views_upsert',
      text: `INSERT INTO saved_views (project_id, user_id, name, view_type, filters, column_config, sort_config, is_default, is_shared)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (project_id, user_id, name) DO UPDATE SET filters = EXCLUDED.filters, column_config = EXCLUDED.column_config, sort_config = EXCLUDED.sort_config, is_default = EXCLUDED.is_default, is_shared = EXCLUDED.is_shared, updated_at = NOW() RETURNING *`,
      values: [projectId, userId, name.trim(), view_type, JSON.stringify(filters), JSON.stringify(column_config), JSON.stringify(sort_config), !!is_default, !!is_shared],
    });
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ error: 'View with this name already exists' });
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/views/:id
router.patch('/views/:id', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const view = await pool.query({
      name: 'saved_views_get_one',
      text: 'SELECT * FROM saved_views WHERE id = $1',
      values: [req.params.id],
    });
    if (!view.rows.length) return res.status(404).json({ error: 'Not found' });
    if (view.rows[0].user_id !== userId) return res.status(403).json({ error: 'Not your view' });
    const allowed = await getAccessibleProjectIds(pool, userId);
    if (!allowed.some(id => String(id) === String(view.rows[0].project_id))) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const { name, filters, column_config, sort_config, is_default, is_shared } = req.body;
    const updates = [];
    const values = [];
    let i = 1;
    if (name !== undefined) { updates.push(`name = $${i++}`); values.push(name.trim()); }
    if (filters !== undefined) { updates.push(`filters = $${i++}`); values.push(JSON.stringify(filters)); }
    if (column_config !== undefined) { updates.push(`column_config = $${i++}`); values.push(JSON.stringify(column_config)); }
    if (sort_config !== undefined) { updates.push(`sort_config = $${i++}`); values.push(JSON.stringify(sort_config)); }
    if (is_default !== undefined) {
      updates.push(`is_default = $${i++}`);
      values.push(!!is_default);
      if (is_default) {
        await pool.query({
          name: 'saved_views_clear_default_patch',
          text: 'UPDATE saved_views SET is_default = false WHERE project_id = $1 AND user_id = $2 AND id != $3',
          values: [view.rows[0].project_id, userId, req.params.id],
        });
      }
    }
    if (is_shared !== undefined) { updates.push(`is_shared = $${i++}`); values.push(!!is_shared); }
    if (!updates.length) return res.json(view.rows[0]);
    updates.push('updated_at = NOW()');
    values.push(req.params.id);
    const { rows } = await pool.query({
      name: 'saved_views_patch',
      text: `UPDATE saved_views SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
      values,
    });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/views/:id
router.delete('/views/:id', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const view = await pool.query({
      name: 'saved_views_get_del',
      text: 'SELECT * FROM saved_views WHERE id = $1',
      values: [req.params.id],
    });
    if (!view.rows.length) return res.status(404).json({ error: 'Not found' });
    if (view.rows[0].user_id !== userId) return res.status(403).json({ error: 'Not your view' });
    await pool.query({
      name: 'saved_views_delete',
      text: 'DELETE FROM saved_views WHERE id = $1',
      values: [req.params.id],
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
