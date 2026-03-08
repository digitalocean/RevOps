const router = require('express').Router();
const { pool } = require('../server');
const { getAccessibleWorkspaceIds, requireUser } = require('../lib/access');

router.get('/', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const allowedWorkspaceIds = await getAccessibleWorkspaceIds(pool, userId);
    if (allowedWorkspaceIds.length === 0) return res.json([]);
    const { workspace_id } = req.query;
    let q = 'SELECT * FROM crew WHERE active = true AND workspace_id = ANY($1)';
    const params = [allowedWorkspaceIds];
    if (workspace_id) {
      if (!allowedWorkspaceIds.some(id => String(id) === String(workspace_id))) return res.json([]);
      params.push(workspace_id);
      q += ` AND workspace_id = $2`;
    }
    q += ' ORDER BY name';
    const { rows } = await pool.query({ name: 'crew_list', text: q, values: params });
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const allowedWorkspaceIds = await getAccessibleWorkspaceIds(pool, userId);
    const { workspace_id, name, email, initials, color = '#6366f1', role = 'Member' } = req.body;
    if (!workspace_id || !allowedWorkspaceIds.some(id => String(id) === String(workspace_id))) {
      return res.status(403).json({ error: 'Access denied to this workspace' });
    }
    const { rows } = await pool.query({
      name: 'crew_insert',
      text: 'INSERT INTO crew(workspace_id,name,email,initials,color,role) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',
      values: [workspace_id, name, email, initials, color, role],
    });
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/:id', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const crewRow = await pool.query({
      name: 'crew_get_workspace',
      text: 'SELECT workspace_id FROM crew WHERE id = $1',
      values: [req.params.id],
    });
    if (!crewRow.rows.length) return res.status(404).json({ error: 'Not found' });
    const allowedWorkspaceIds = await getAccessibleWorkspaceIds(pool, userId);
    if (!allowedWorkspaceIds.some(id => String(id) === String(crewRow.rows[0].workspace_id))) {
      return res.status(404).json({ error: 'Not found' });
    }
    const allowed = ['name', 'email', 'color', 'role', 'status', 'active'];
    const fields = Object.keys(req.body).filter(k => allowed.includes(k));
    if (!fields.length) return res.status(400).json({ error: 'No fields' });
    const sets = fields.map((f, i) => `${f}=$${i + 2}`).join(',');
    const { rows } = await pool.query({
      name: 'crew_patch',
      text: `UPDATE crew SET ${sets} WHERE id=$1 RETURNING *`,
      values: [req.params.id, ...fields.map(f => req.body[f])],
    });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const crewRow = await pool.query({
      name: 'crew_get_workspace_del',
      text: 'SELECT workspace_id FROM crew WHERE id = $1',
      values: [req.params.id],
    });
    if (!crewRow.rows.length) return res.status(404).json({ error: 'Not found' });
    const allowedWorkspaceIds = await getAccessibleWorkspaceIds(pool, userId);
    if (!allowedWorkspaceIds.some(id => String(id) === String(crewRow.rows[0].workspace_id))) {
      return res.status(404).json({ error: 'Not found' });
    }
    await pool.query({
      name: 'crew_deactivate',
      text: 'UPDATE crew SET active=false WHERE id=$1',
      values: [req.params.id],
    });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
