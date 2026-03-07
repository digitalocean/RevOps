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
    const { rows } = await pool.query('SELECT * FROM board_columns WHERE project_id = $1 ORDER BY sort_order', [project_id]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const { project_id, name, color = '#3d4a63', is_done = false } = req.body;
    if (!project_id) return res.status(400).json({ error: 'project_id required' });
    const ok = await canAccessProject(pool, userId, project_id);
    if (!ok) return res.status(403).json({ error: 'Access denied to this project' });
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const { rows } = await pool.query(
      'INSERT INTO board_columns(project_id,name,slug,color,is_done) VALUES($1,$2,$3,$4,$5) RETURNING *',
      [project_id, name, slug, color, is_done]
    );
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/:id', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const bc = await pool.query('SELECT project_id FROM board_columns WHERE id = $1', [req.params.id]);
    if (!bc.rows.length) return res.status(404).json({ error: 'Not found' });
    const ok = await canAccessProject(pool, userId, bc.rows[0].project_id);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    const allowed = ['name', 'color', 'is_done', 'sort_order'];
    const fields = Object.keys(req.body).filter(k => allowed.includes(k));
    if (!fields.length) return res.status(400).json({ error: 'No fields' });
    const sets = fields.map((f, i) => `${f}=$${i + 2}`).join(',');
    const { rows } = await pool.query(`UPDATE board_columns SET ${sets} WHERE id=$1 RETURNING *`, [req.params.id, ...fields.map(f => req.body[f])]);
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const bc = await pool.query('SELECT project_id FROM board_columns WHERE id = $1', [req.params.id]);
    if (!bc.rows.length) return res.status(404).json({ error: 'Not found' });
    const ok = await canAccessProject(pool, userId, bc.rows[0].project_id);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    await pool.query('DELETE FROM board_columns WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
