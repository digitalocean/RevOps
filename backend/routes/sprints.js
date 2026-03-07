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
    const allowedProjectIds = await getAccessibleProjectIds(pool, userId);
    if (allowedProjectIds.length === 0) return res.json([]);
    const { project_id } = req.query;
    if (project_id) {
      if (!allowedProjectIds.some(id => String(id) === String(project_id))) return res.json([]);
      const { rows } = await pool.query('SELECT * FROM sprints WHERE project_id=$1 ORDER BY created_at DESC', [project_id]);
      return res.json(rows);
    }
    const { rows } = await pool.query('SELECT * FROM sprints WHERE project_id = ANY($1) ORDER BY created_at DESC', [allowedProjectIds]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const { project_id, name, goal, start_date, end_date, capacity = 40 } = req.body;
    if (!project_id) return res.status(400).json({ error: 'project_id required' });
    const ok = await canAccessProject(pool, userId, project_id);
    if (!ok) return res.status(403).json({ error: 'Access denied to this project' });
    const { rows } = await pool.query(
      'INSERT INTO sprints(project_id,name,goal,start_date,end_date,capacity) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',
      [project_id, name, goal, start_date, end_date, capacity]
    );
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/:id', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const s = await pool.query('SELECT project_id FROM sprints WHERE id = $1', [req.params.id]);
    if (!s.rows.length) return res.status(404).json({ error: 'Not found' });
    const ok = await canAccessProject(pool, userId, s.rows[0].project_id);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    const allowed = ['name', 'goal', 'status', 'start_date', 'end_date', 'capacity'];
    const fields = Object.keys(req.body).filter(k => allowed.includes(k));
    if (!fields.length) return res.status(400).json({ error: 'No valid fields' });
    const sets = fields.map((f, i) => `${f}=$${i + 2}`).join(',');
    const { rows } = await pool.query(`UPDATE sprints SET ${sets} WHERE id=$1 RETURNING *`, [req.params.id, ...fields.map(f => req.body[f])]);
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
