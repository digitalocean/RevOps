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
    const { project_id, sprint_id } = req.query;
    let q = 'SELECT l.*,c.name as author_name,c.initials,c.color FROM log_entries l LEFT JOIN crew c ON l.author_id=c.id WHERE l.project_id = ANY($1)';
    const p = [allowedProjectIds];
    if (project_id) {
      if (!allowedProjectIds.some(id => String(id) === String(project_id))) return res.json([]);
      p.push(project_id);
      q += ` AND l.project_id = $${p.length}`;
    }
    if (sprint_id) { p.push(sprint_id); q += ` AND l.sprint_id = $${p.length}`; }
    q += ' ORDER BY l.created_at DESC';
    const { rows } = await pool.query({ name: 'log_list', text: q, values: p });
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const { project_id, sprint_id, author_id, entry_type = 'note', content, voice_url } = req.body;
    if (!content || !String(content).trim()) return res.status(400).json({ error: 'Content required' });
    if (project_id) {
      const ok = await canAccessProject(pool, userId, project_id);
      if (!ok) return res.status(403).json({ error: 'Access denied to this project' });
    }
    const { rows } = await pool.query({
      name: 'log_insert',
      text: 'INSERT INTO log_entries(project_id,sprint_id,author_id,entry_type,content,voice_url) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',
      values: [project_id || null, sprint_id || null, author_id || null, entry_type, String(content).trim(), voice_url || null],
    });
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const le = await pool.query({
      name: 'log_get_project',
      text: 'SELECT project_id FROM log_entries WHERE id = $1',
      values: [req.params.id],
    });
    if (!le.rows.length) return res.status(404).json({ error: 'Not found' });
    const ok = await canAccessProject(pool, userId, le.rows[0].project_id);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    await pool.query({
      name: 'log_delete',
      text: 'DELETE FROM log_entries WHERE id=$1',
      values: [req.params.id],
    });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
