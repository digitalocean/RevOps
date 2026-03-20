const router = require('express').Router();
const { pool } = require('../server');
const { getAccessibleWorkspaceIds, getAccessibleProjectIds, requireUser } = require('../lib/access');

/**
 * Ensure project creator can be chosen as assignee: they need a crew row with a real id.
 * Merges creator's crew (by user_id anywhere, or new row in project workspace) into the list.
 */
async function mergeProjectCreatorIntoCrewRows(pool, userId, rows, projectId, workspaceId) {
  const allowedProjectIds = await getAccessibleProjectIds(pool, userId);
  if (!allowedProjectIds.some((id) => String(id) === String(projectId))) return rows;
  const proj = await pool.query({
    name: 'crew_proj_workspace_creator',
    text: 'SELECT workspace_id, created_by FROM projects WHERE id = $1',
    values: [projectId],
  });
  if (!proj.rows.length) return rows;
  const wid = proj.rows[0].workspace_id;
  const createdBy = proj.rows[0].created_by;
  if (!createdBy) return rows;
  if (workspaceId != null && String(workspaceId) !== String(wid)) return rows;

  const byId = new Map(rows.map((r) => [String(r.id), r]));

  const existingForUser = await pool.query({
    name: 'crew_by_user_id',
    text: 'SELECT * FROM crew WHERE user_id = $1 AND (active = true OR active IS NULL) ORDER BY created_at ASC LIMIT 1',
    values: [createdBy],
  });
  if (existingForUser.rows.length) {
    const c = existingForUser.rows[0];
    if (!byId.has(String(c.id))) {
      rows.push(c);
      byId.set(String(c.id), c);
    }
    return rows;
  }

  const u = await pool.query({
    name: 'crew_creator_user',
    text: 'SELECT id, full_name, email FROM users WHERE id = $1',
    values: [createdBy],
  });
  if (!u.rows.length) return rows;
  let email = String(u.rows[0].email || '').toLowerCase().trim();
  if (!email) email = `user-${String(createdBy).replace(/-/g, '')}@profiles.internal`;
  const name = String(u.rows[0].full_name || email.split('@')[0] || 'Project owner').slice(0, 120);
  const initials = name.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase() || email.slice(0, 2).toUpperCase() || 'PO';

  try {
    const ins = await pool.query({
      name: 'crew_insert_creator',
      text: `INSERT INTO crew (workspace_id, user_id, name, email, initials, role)
             VALUES ($1, $2, $3, $4, $5, 'Member') RETURNING *`,
      values: [wid, createdBy, name, email, initials],
    });
    if (ins.rows[0] && !byId.has(String(ins.rows[0].id))) rows.push(ins.rows[0]);
  } catch (e) {
    if (e.code === '23505') {
      const ex = await pool.query({
        name: 'crew_by_email_after_dup',
        text: 'SELECT * FROM crew WHERE LOWER(email) = $1 AND (active = true OR active IS NULL) LIMIT 1',
        values: [email],
      });
      if (ex.rows[0] && !byId.has(String(ex.rows[0].id))) rows.push(ex.rows[0]);
    } else throw e;
  }
  return rows;
}

router.get('/', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const allowedWorkspaceIds = await getAccessibleWorkspaceIds(pool, userId);
    if (allowedWorkspaceIds.length === 0) return res.json([]);
    let { workspace_id, project_id } = req.query;

    if (project_id && (!workspace_id || String(workspace_id).length === 0)) {
      const allowedProjectIds = await getAccessibleProjectIds(pool, userId);
      if (allowedProjectIds.some((id) => String(id) === String(project_id))) {
        const pr = await pool.query({
          name: 'crew_infer_workspace',
          text: 'SELECT workspace_id FROM projects WHERE id = $1',
          values: [project_id],
        });
        if (pr.rows[0]?.workspace_id) workspace_id = pr.rows[0].workspace_id;
      }
    }

    let q = 'SELECT * FROM crew WHERE active = true AND workspace_id = ANY($1)';
    const params = [allowedWorkspaceIds];
    if (workspace_id) {
      if (!allowedWorkspaceIds.some(id => String(id) === String(workspace_id))) return res.json([]);
      params.push(workspace_id);
      q += ` AND workspace_id = $2`;
    }
    q += ' ORDER BY name';
    const { rows } = await pool.query({ name: 'crew_list', text: q, values: params });
    let out = rows.slice();

    if (project_id) {
      out = await mergeProjectCreatorIntoCrewRows(pool, userId, out, project_id, workspace_id || null);
      out.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' }));
    }

    res.json(out);
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
