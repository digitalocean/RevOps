const router = require('express').Router();
const { pool } = require('../server');
const { getAccessibleProjectIds, requireUser } = require('../lib/access');

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
    const { rows } = await pool.query('SELECT * FROM trackers WHERE project_id=$1 ORDER BY sort_order', [project_id]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id/rows', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const tr = await pool.query('SELECT project_id FROM trackers WHERE id = $1', [req.params.id]);
    if (!tr.rows.length) return res.status(404).json({ error: 'Not found' });
    const ok = await canAccessProject(pool, userId, tr.rows[0].project_id);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    const { rows } = await pool.query('SELECT * FROM tracker_rows WHERE tracker_id=$1 ORDER BY sort_order', [req.params.id]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const { project_id, name, icon = '📋', columns = [] } = req.body;
    if (!project_id) return res.status(400).json({ error: 'project_id required' });
    const ok = await canAccessProject(pool, userId, project_id);
    if (!ok) return res.status(403).json({ error: 'Access denied to this project' });
    const { rows } = await pool.query(
      'INSERT INTO trackers(project_id,name,icon,columns) VALUES($1,$2,$3,$4) RETURNING *',
      [project_id, name, icon, JSON.stringify(columns || [])]
    );
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/:id/rows', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const tr = await pool.query('SELECT project_id FROM trackers WHERE id = $1', [req.params.id]);
    if (!tr.rows.length) return res.status(404).json({ error: 'Not found' });
    const ok = await canAccessProject(pool, userId, tr.rows[0].project_id);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    const { data = {} } = req.body;
    const { rows } = await pool.query('INSERT INTO tracker_rows(tracker_id,data) VALUES($1,$2) RETURNING *', [req.params.id, JSON.stringify(data)]);
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/:id/rows/:rowId', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const tr = await pool.query('SELECT project_id FROM trackers WHERE id = $1', [req.params.id]);
    if (!tr.rows.length) return res.status(404).json({ error: 'Not found' });
    const ok = await canAccessProject(pool, userId, tr.rows[0].project_id);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    const { rows } = await pool.query('UPDATE tracker_rows SET data=$1 WHERE id=$2 RETURNING *', [JSON.stringify(req.body.data), req.params.rowId]);
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
