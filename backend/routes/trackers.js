const router = require('express').Router();
const { pool } = require('../server');
const { getAccessibleProjectIds, requireUser, canManageProject } = require('../lib/access');

async function canAccessProject(pool, userId, projectId) {
  const ids = await getAccessibleProjectIds(pool, userId);
  return ids.some(id => String(id) === String(projectId));
}

router.get('/', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const { project_id } = req.query;
    if (!project_id) return res.json([]);
    const ok = await canAccessProject(pool, userId, project_id);
    if (!ok) return res.json([]);
    const { rows } = await pool.query({
      name: 'trackers_list_by_project',
      text: 'SELECT * FROM trackers WHERE project_id=$1 ORDER BY sort_order',
      values: [project_id],
    });
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id/rows', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const tr = await pool.query({
      name: 'trackers_get_project',
      text: 'SELECT project_id FROM trackers WHERE id = $1',
      values: [req.params.id],
    });
    if (!tr.rows.length) return res.status(404).json({ error: 'Not found' });
    const ok = await canAccessProject(pool, userId, tr.rows[0].project_id);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    const { rows } = await pool.query({
      name: 'tracker_rows_list',
      text: 'SELECT * FROM tracker_rows WHERE tracker_id=$1 ORDER BY sort_order',
      values: [req.params.id],
    });
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const { project_id, name } = req.body || {};
    if (!project_id) return res.status(400).json({ error: 'project_id required' });
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'name required' });
    const ok = await canAccessProject(pool, userId, project_id);
    if (!ok) return res.status(403).json({ error: 'Access denied to this project' });
    const { rows } = await pool.query({
      name: 'trackers_insert',
      text: 'INSERT INTO trackers(project_id, name) VALUES($1, $2) RETURNING *',
      values: [project_id, String(name).trim()],
    });
    const newTracker = rows[0];
    if (newTracker && newTracker.id) {
      await pool.query({
        name: 'trackers_assign_uncategorized',
        text: 'UPDATE items SET tracker_id = $1 WHERE project_id = $2 AND tracker_id IS NULL',
        values: [newTracker.id, project_id],
      });
    }
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /:id — update tracker (e.g. name)
router.patch('/:id', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const trackerId = req.params.id;
    const tr = await pool.query({
      name: 'trackers_get_project_for_patch',
      text: 'SELECT project_id FROM trackers WHERE id = $1',
      values: [trackerId],
    });
    if (!tr.rows.length) return res.status(404).json({ error: 'Not found' });
    const ok = await canAccessProject(pool, userId, tr.rows[0].project_id);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    const { name } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'name required' });
    const { rows } = await pool.query({
      name: 'trackers_patch_name',
      text: 'UPDATE trackers SET name = $2 WHERE id = $1 RETURNING *',
      values: [trackerId, String(name).trim()],
    });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/:id/rows', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const tr = await pool.query({
      name: 'trackers_get_project_for_rows',
      text: 'SELECT project_id FROM trackers WHERE id = $1',
      values: [req.params.id],
    });
    if (!tr.rows.length) return res.status(404).json({ error: 'Not found' });
    const ok = await canAccessProject(pool, userId, tr.rows[0].project_id);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    const { data = {} } = req.body;
    const { rows } = await pool.query({
      name: 'tracker_rows_insert',
      text: 'INSERT INTO tracker_rows(tracker_id,data) VALUES($1,$2) RETURNING *',
      values: [req.params.id, JSON.stringify(data)],
    });
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/:id/rows/:rowId', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const tr = await pool.query({
      name: 'trackers_get_project_patch',
      text: 'SELECT project_id FROM trackers WHERE id = $1',
      values: [req.params.id],
    });
    if (!tr.rows.length) return res.status(404).json({ error: 'Not found' });
    const ok = await canAccessProject(pool, userId, tr.rows[0].project_id);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    const { rows } = await pool.query({
      name: 'tracker_rows_update',
      text: 'UPDATE tracker_rows SET data=$1 WHERE id=$2 RETURNING *',
      values: [JSON.stringify(req.body.data), req.params.rowId],
    });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /:id — delete section/tracker (owner/moderator/editor only)
router.delete('/:id', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const trackerId = req.params.id;
    const tr = await pool.query({
      name: 'trackers_get_project_for_delete',
      text: 'SELECT project_id FROM trackers WHERE id = $1',
      values: [trackerId],
    });
    if (!tr.rows.length) return res.status(404).json({ error: 'Not found' });
    const projectId = tr.rows[0].project_id;
    const canManage = await canManageProject(pool, userId, projectId);
    if (!canManage) return res.status(403).json({ error: 'Only project owner or moderator can delete sections' });
    await pool.query({
      name: 'trackers_delete',
      text: 'DELETE FROM trackers WHERE id = $1',
      values: [trackerId],
    });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
