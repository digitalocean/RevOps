const router = require('express').Router();
const { pool } = require('../server');
const { getAccessibleWorkspaceIds, getAccessibleProjectIds, getOrCreateDefaultWorkspaceId, requireUser, canManageProject } = require('../lib/access');

router.get('/', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const allowedProjectIds = await getAccessibleProjectIds(pool, userId);
    if (allowedProjectIds.length === 0) return res.json([]);
    const { workspace_id } = req.query;
    let q = 'SELECT p.*, c.name as owner_name FROM projects p LEFT JOIN crew c ON p.owner_id = c.id WHERE p.id = ANY($1)';
    const params = [allowedProjectIds];
    if (workspace_id) {
      const allowedWorkspaceIds = await getAccessibleWorkspaceIds(pool, userId);
      if (!allowedWorkspaceIds.some(id => String(id) === String(workspace_id))) {
        return res.json([]);
      }
      params.push(workspace_id);
      q += ` AND p.workspace_id = $${params.length}`;
    }
    q += ' ORDER BY p.created_at';
    const { rows } = await pool.query({ name: 'projects_list', text: q, values: params });
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
const DEFAULT_COLUMNS = [
  { name: 'Not Started', slug: 'not_started', color: '#6b7280', is_done: false },
  { name: 'In Progress', slug: 'in_progress', color: '#2563eb', is_done: false },
  { name: 'In Review', slug: 'in_review', color: '#7c3aed', is_done: false },
  { name: 'Blocked', slug: 'blocked', color: '#ea580c', is_done: false },
  { name: 'Done', slug: 'done', color: '#059669', is_done: true },
];
router.post('/', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const { workspace_id, name, description, color = '#6366f1', owner_id, is_personal } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Project name is required' });
    let wid = workspace_id;
    if (!wid) {
      wid = await getOrCreateDefaultWorkspaceId(pool, userId);
      if (!wid) return res.status(500).json({ error: 'Could not create default workspace' });
    } else {
      const allowedWorkspaceIds = await getAccessibleWorkspaceIds(pool, userId);
      if (!allowedWorkspaceIds.some(id => String(id) === String(wid))) {
        return res.status(403).json({ error: 'Access denied to this workspace' });
      }
    }
    const personal = !!is_personal;
    const { rows } = await pool.query({
      name: 'projects_insert',
      text: 'INSERT INTO projects(workspace_id,name,description,color,owner_id,is_personal,created_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      values: [wid, name.trim(), description || '', color, owner_id || null, personal, userId],
    });
    const pid = rows[0].id;
    for (let i = 0; i < DEFAULT_COLUMNS.length; i++) {
      const c = DEFAULT_COLUMNS[i];
      await pool.query({
        name: 'projects_insert_board_col',
        text: 'INSERT INTO board_columns(project_id,name,slug,color,sort_order,is_done) VALUES($1,$2,$3,$4,$5,$6)',
        values: [pid, c.name, c.slug, c.color, i, c.is_done],
      });
    }
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
router.patch('/:id', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const allowedProjectIds = await getAccessibleProjectIds(pool, userId);
    if (!allowedProjectIds.some(id => String(id) === String(req.params.id))) {
      return res.status(404).json({ error: 'Not found' });
    }
    const allowed = ['name', 'description', 'color', 'status', 'owner_id'];
    const fields = Object.keys(req.body).filter(k => allowed.includes(k));
    if (!fields.length) return res.status(400).json({ error: 'No fields' });
    const sets = fields.map((f, i) => `${f}=$${i + 2}`).join(',');
    const { rows } = await pool.query({
      name: 'projects_patch',
      text: `UPDATE projects SET ${sets} WHERE id=$1 RETURNING *`,
      values: [req.params.id, ...fields.map(f => req.body[f])],
    });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id/members', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const projectId = req.params.id;
    const allowedProjectIds = await getAccessibleProjectIds(pool, userId);
    if (!allowedProjectIds.some(id => String(id) === String(projectId))) {
      return res.status(404).json({ error: 'Not found' });
    }
    const proj = await pool.query({
      name: 'projects_get_created_by',
      text: 'SELECT created_by FROM projects WHERE id = $1',
      values: [projectId],
    });
    if (!proj.rows.length) return res.status(404).json({ error: 'Not found' });
    const createdBy = proj.rows[0].created_by;
    let creatorRow = null;
    if (createdBy) {
      const cr = await pool.query({
        name: 'projects_user_by_id',
        text: 'SELECT id, full_name, email FROM users WHERE id = $1',
        values: [createdBy],
      });
      if (cr.rows.length) {
        const u = cr.rows[0];
        const inits = (u.full_name || u.email || '?').toString().slice(0, 2).toUpperCase();
        creatorRow = { id: null, crew_id: null, role: 'owner', name: u.full_name || u.email, email: u.email, initials: inits, is_creator: true };
      }
    }
    const { rows } = await pool.query({
      name: 'projects_members_list',
      text: `SELECT pm.id, pm.project_id, pm.crew_id, pm.role, c.name, c.email, c.initials,
              (p.created_by = c.user_id) AS is_creator
       FROM project_members pm JOIN crew c ON c.id = pm.crew_id JOIN projects p ON p.id = pm.project_id
       WHERE pm.project_id = $1 ORDER BY (p.created_by = c.user_id) DESC, c.name`,
      values: [projectId],
    });
    const list = rows.map((r) => ({ id: r.id, crew_id: r.crew_id, role: r.role, name: r.name, email: r.email, initials: r.initials, is_creator: !!r.is_creator }));
    if (creatorRow && !list.some((m) => m.is_creator)) res.json([creatorRow, ...list]);
    else res.json(list);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/:id/members', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const projectId = req.params.id;
    const allowedProjectIds = await getAccessibleProjectIds(pool, userId);
    if (!allowedProjectIds.some(id => String(id) === String(projectId))) {
      return res.status(404).json({ error: 'Not found' });
    }
    const { email, role = 'member' } = req.body || {};
    if (!email || !String(email).trim()) return res.status(400).json({ error: 'email required' });
    const proj = await pool.query({
      name: 'projects_get_workspace',
      text: 'SELECT workspace_id, created_by FROM projects WHERE id = $1',
      values: [projectId],
    });
    if (!proj.rows.length) return res.status(404).json({ error: 'Project not found' });
    const workspaceId = proj.rows[0].workspace_id;
    const createdBy = proj.rows[0].created_by;
    const allowedWorkspaceIds = await getAccessibleWorkspaceIds(pool, userId);
    if (!allowedWorkspaceIds.some(id => String(id) === String(workspaceId))) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const emailNorm = String(email).trim().toLowerCase();
    const userRow = await pool.query({
      name: 'projects_user_by_email',
      text: 'SELECT id, full_name FROM users WHERE LOWER(email) = $1',
      values: [emailNorm],
    });
    const invitedUserId = userRow.rows[0]?.id || null;
    const invitedFullName = userRow.rows[0]?.full_name || emailNorm;

    // Look up crew by email globally first (crew.email is UNIQUE) to avoid duplicate key
    let crewRow = await pool.query({
      name: 'projects_crew_by_email_global',
      text: 'SELECT id, user_id, workspace_id FROM crew WHERE LOWER(email) = $1 AND (active = true OR active IS NULL) LIMIT 1',
      values: [emailNorm],
    });
    if (!crewRow.rows.length) {
      crewRow = await pool.query({
        name: 'projects_crew_by_workspace_email',
        text: 'SELECT id, user_id FROM crew WHERE workspace_id = $1 AND LOWER(email) = $2 AND (active = true OR active IS NULL)',
        values: [workspaceId, emailNorm],
      });
    }
    if (!crewRow.rows.length) {
      const initials = (invitedFullName || emailNorm).slice(0, 2).toUpperCase();
      try {
        const { rows: inserted } = await pool.query({
          name: 'projects_crew_insert',
          text: 'INSERT INTO crew(workspace_id, user_id, name, email, initials, role) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',
          values: [workspaceId, invitedUserId, invitedFullName, emailNorm, initials, 'Member'],
        });
        crewRow = { rows: inserted };
      } catch (insertErr) {
        if (insertErr.code === '23505' && insertErr.constraint === 'crew_email_key') {
          crewRow = await pool.query({
            name: 'projects_crew_by_email_global_retry',
            text: 'SELECT id, user_id FROM crew WHERE LOWER(email) = $1 LIMIT 1',
            values: [emailNorm],
          });
          if (!crewRow.rows.length) throw insertErr;
        } else throw insertErr;
      }
    } else if (invitedUserId && !crewRow.rows[0].user_id) {
      await pool.query({
        name: 'projects_crew_link_user',
        text: 'UPDATE crew SET user_id = $2 WHERE id = $1',
        values: [crewRow.rows[0].id, invitedUserId],
      });
    }
    const crewId = crewRow.rows[0].id;
    await pool.query({
      name: 'projects_member_upsert',
      text: 'INSERT INTO project_members(project_id, crew_id, role) VALUES($1,$2,$3) ON CONFLICT (project_id, crew_id) DO UPDATE SET role = $3',
      values: [projectId, crewId, role],
    });
    const { rows: members } = await pool.query({
      name: 'projects_members_list_post',
      text: 'SELECT pm.id, pm.crew_id, pm.role, c.name, c.email, c.initials FROM project_members pm JOIN crew c ON c.id = pm.crew_id WHERE pm.project_id = $1',
      values: [projectId],
    });
    res.status(201).json(members);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /:id — delete project (owner/moderator/editor only)
router.delete('/:id', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const projectId = req.params.id;
    const canManage = await canManageProject(pool, userId, projectId);
    if (!canManage) return res.status(403).json({ error: 'Only project owner or moderator can delete the project' });
    await pool.query({
      name: 'projects_delete',
      text: 'DELETE FROM projects WHERE id = $1',
      values: [projectId],
    });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /:id/members/:memberId — remove a member from project (owner only)
router.delete('/:id/members/:memberId', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const projectId = req.params.id;
    const proj = await pool.query({
      name: 'projects_get_created_by_del',
      text: 'SELECT created_by FROM projects WHERE id = $1',
      values: [projectId],
    });
    if (!proj.rows.length) return res.status(404).json({ error: 'Not found' });
    if (String(proj.rows[0].created_by) !== String(userId)) {
      return res.status(403).json({ error: 'Only the project owner can remove members' });
    }
    await pool.query({
      name: 'projects_member_delete',
      text: 'DELETE FROM project_members WHERE id = $1 AND project_id = $2',
      values: [req.params.memberId, projectId],
    });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
