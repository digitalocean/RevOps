const router = require('express').Router();
const { pool } = require('../server');
const { getAccessibleWorkspaceIds, getAccessibleProjectIds, getOrCreateDefaultWorkspaceId, requireUser, canManageProject } = require('../lib/access');

async function logActivity(pool, projectId, userId, action, entityId, details = {}) {
  try {
    const crew = await pool.query({
      name: 'projects_crew_by_user',
      text: 'SELECT id FROM crew WHERE user_id = $1 LIMIT 1',
      values: [userId],
    });
    const crewId = crew.rows[0]?.id || null;
    await pool.query({
      name: 'projects_activity_insert',
      text: 'INSERT INTO activity_log (project_id, crew_id, user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      values: [projectId, crewId, userId, action, 'project', entityId, JSON.stringify(details)],
    });
  } catch (_) { /* non-fatal */ }
}

function buildDisplayName(firstName, lastName) {
  return [String(firstName || '').trim(), String(lastName || '').trim()].filter(Boolean).join(' ');
}

/** Prefer first letter of first + last name; fallback to name or email. */
function twoLetterInitials(firstName, lastName, displayName, email) {
  const f = String(firstName || '').trim();
  const l = String(lastName || '').trim();
  if (f && l) return (f[0] + l[0]).toUpperCase();
  if (f.length >= 2) return f.slice(0, 2).toUpperCase();
  const n = String(displayName || '').trim();
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    if (n.length >= 2) return n.slice(0, 2).toUpperCase();
  }
  const e = String(email || '').trim();
  return e.length >= 2 ? e.slice(0, 2).toUpperCase() : '??';
}

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
    const updated = rows[0];
    if (updated && req.body.name !== undefined && String(req.body.name).trim()) {
      logActivity(pool, req.params.id, userId, 'project_updated', req.params.id, { name: String(req.body.name).trim() });
    }
    res.json(updated);
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
        text: 'SELECT id, full_name, email, first_name, last_name FROM users WHERE id = $1',
        values: [createdBy],
      });
      if (cr.rows.length) {
        const u = cr.rows[0];
        const display = buildDisplayName(u.first_name, u.last_name) || u.full_name || u.email;
        const inits = twoLetterInitials(u.first_name, u.last_name, display, u.email);
        creatorRow = {
          id: null,
          crew_id: null,
          role: 'owner',
          name: display,
          email: u.email,
          initials: inits,
          first_name: u.first_name || null,
          last_name: u.last_name || null,
          is_creator: true,
        };
      }
    }
    const { rows } = await pool.query({
      name: 'projects_members_list',
      text: `SELECT pm.id, pm.project_id, pm.crew_id, pm.role, c.name, c.email, c.initials, c.first_name, c.last_name,
              (p.created_by = c.user_id) AS is_creator
       FROM project_members pm JOIN crew c ON c.id = pm.crew_id JOIN projects p ON p.id = pm.project_id
       WHERE pm.project_id = $1 ORDER BY (p.created_by = c.user_id) DESC, c.name`,
      values: [projectId],
    });
    const list = rows.map((r) => ({
      id: r.id,
      crew_id: r.crew_id,
      role: r.role,
      name: r.name,
      email: r.email,
      initials: r.initials,
      first_name: r.first_name || null,
      last_name: r.last_name || null,
      is_creator: !!r.is_creator,
    }));
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
    const { email, role, first_name, last_name } = req.body || {};
    const fn = String(first_name || '').trim();
    const ln = String(last_name || '').trim();
    if (!fn) return res.status(400).json({ error: 'first_name required' });
    if (!ln) return res.status(400).json({ error: 'last_name required' });
    if (!email || !String(email).trim()) return res.status(400).json({ error: 'email required' });
    const displayName = buildDisplayName(fn, ln);
    if (!displayName) return res.status(400).json({ error: 'first and last name required' });
    const allowedRoles = ['admin', 'moderator', 'editor', 'viewer'];
    const roleNorm = (role && String(role).toLowerCase()) || '';
    const memberRole = allowedRoles.includes(roleNorm) ? roleNorm : 'viewer';
    const proj = await pool.query({
      name: 'projects_get_workspace',
      text: 'SELECT workspace_id, created_by FROM projects WHERE id = $1',
      values: [projectId],
    });
    if (!proj.rows.length) return res.status(404).json({ error: 'Project not found' });
    const workspaceId = proj.rows[0].workspace_id;
    const allowedWorkspaceIds = await getAccessibleWorkspaceIds(pool, userId);
    if (!allowedWorkspaceIds.some(id => String(id) === String(workspaceId))) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const emailNorm = String(email).trim().toLowerCase();
    const initials = twoLetterInitials(fn, ln, displayName, emailNorm);
    const userRow = await pool.query({
      name: 'projects_user_by_email',
      text: 'SELECT id, full_name, first_name, last_name FROM users WHERE LOWER(email) = $1',
      values: [emailNorm],
    });
    const invitedUserId = userRow.rows[0]?.id || null;

    if (invitedUserId) {
      await pool.query({
        name: 'projects_user_update_names',
        text: 'UPDATE users SET first_name = $2, last_name = $3, full_name = $4 WHERE id = $1',
        values: [invitedUserId, fn, ln, displayName],
      }).catch(() => {});
    }

    // Look up crew by email globally first (crew.email is UNIQUE) to avoid duplicate key
    let crewRow = await pool.query({
      name: 'projects_crew_by_email_global',
      text: 'SELECT id, user_id, workspace_id FROM crew WHERE LOWER(email) = $1 AND (active = true OR active IS NULL) LIMIT 1',
      values: [emailNorm],
    });
    if (!crewRow.rows.length) {
      crewRow = await pool.query({
        name: 'projects_crew_by_workspace_email',
        text: 'SELECT id, user_id, workspace_id FROM crew WHERE workspace_id = $1 AND LOWER(email) = $2 AND (active = true OR active IS NULL)',
        values: [workspaceId, emailNorm],
      });
    }
    if (!crewRow.rows.length) {
      try {
        const { rows: inserted } = await pool.query({
          name: 'projects_crew_insert',
          text: `INSERT INTO crew(workspace_id, user_id, name, email, initials, role, first_name, last_name)
                 VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
          values: [workspaceId, invitedUserId, displayName, emailNorm, initials, 'Member', fn, ln],
        });
        crewRow = { rows: inserted };
      } catch (insertErr) {
        if (insertErr.code === '23505' && insertErr.constraint === 'crew_email_key') {
          crewRow = await pool.query({
            name: 'projects_crew_by_email_global_retry',
            text: 'SELECT id, user_id, workspace_id FROM crew WHERE LOWER(email) = $1 LIMIT 1',
            values: [emailNorm],
          });
          if (!crewRow.rows.length) throw insertErr;
        } else throw insertErr;
      }
    }
    if (crewRow.rows.length) {
      const cid = crewRow.rows[0].id;
      await pool.query({
        name: 'projects_crew_update_names',
        text: `UPDATE crew SET name = $1, initials = $2, first_name = $3, last_name = $4
               WHERE id = $5`,
        values: [displayName, initials, fn, ln, cid],
      });
      if (invitedUserId && !crewRow.rows[0].user_id) {
        await pool.query({
          name: 'projects_crew_link_user',
          text: 'UPDATE crew SET user_id = $2 WHERE id = $1',
          values: [cid, invitedUserId],
        });
      }
    }
    const crewId = crewRow.rows[0].id;
    await pool.query({
      name: 'projects_member_upsert',
      text: 'INSERT INTO project_members(project_id, crew_id, role) VALUES($1,$2,$3) ON CONFLICT (project_id, crew_id) DO UPDATE SET role = $3',
      values: [projectId, crewId, memberRole],
    });
    const { rows: members } = await pool.query({
      name: 'projects_members_list_post',
      text: `SELECT pm.id, pm.crew_id, pm.role, c.name, c.email, c.initials, c.first_name, c.last_name
             FROM project_members pm JOIN crew c ON c.id = pm.crew_id WHERE pm.project_id = $1`,
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

// PATCH /:id/members/:memberId — update crew person (names, email, role) for shared list
router.patch('/:id/members/:memberId', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const projectId = req.params.id;
    const memberRecordId = req.params.memberId;
    const canManage = await canManageProject(pool, userId, projectId);
    if (!canManage) return res.status(403).json({ error: 'You do not have permission to edit project members' });
    const { first_name, last_name, email, role } = req.body || {};
    const mr = await pool.query({
      name: 'projects_member_get_crew',
      text: `SELECT pm.id, pm.crew_id, c.user_id, c.email AS old_email
             FROM project_members pm JOIN crew c ON c.id = pm.crew_id
             WHERE pm.id = $1 AND pm.project_id = $2`,
      values: [memberRecordId, projectId],
    });
    if (!mr.rows.length) return res.status(404).json({ error: 'Member not found' });
    const { crew_id: crewId, user_id: crewUserId, old_email: oldEmail } = mr.rows[0];
    const fn = first_name !== undefined ? String(first_name).trim() : null;
    const ln = last_name !== undefined ? String(last_name).trim() : null;
    const em = email !== undefined ? String(email).trim().toLowerCase() : null;
    if (first_name !== undefined && !fn) return res.status(400).json({ error: 'first_name cannot be empty' });
    if (last_name !== undefined && !ln) return res.status(400).json({ error: 'last_name cannot be empty' });
    if (email !== undefined && !em) return res.status(400).json({ error: 'email cannot be empty' });

    const crewRow = await pool.query({
      name: 'projects_crew_for_patch',
      text: 'SELECT name, email, first_name, last_name FROM crew WHERE id = $1',
      values: [crewId],
    });
    if (!crewRow.rows.length) return res.status(404).json({ error: 'Crew not found' });
    const cur = crewRow.rows[0];
    let curFn = (cur.first_name || '').trim();
    let curLn = (cur.last_name || '').trim();
    if (!curFn && !curLn && cur.name) {
      const parts = String(cur.name).trim().split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        curFn = parts[0];
        curLn = parts.slice(1).join(' ');
      } else if (parts.length === 1) curFn = parts[0];
    }
    const nextFn = first_name !== undefined ? String(first_name).trim() : curFn;
    const nextLn = last_name !== undefined ? String(last_name).trim() : curLn;
    const displayName = buildDisplayName(nextFn, nextLn) || String(cur.name || '').trim();
    const nextEmail = em != null ? em : String(oldEmail || '').toLowerCase();
    const initials = twoLetterInitials(nextFn, nextLn, displayName, nextEmail);

    if (em != null && em !== String(oldEmail || '').toLowerCase()) {
      const clash = await pool.query({
        name: 'projects_crew_email_clash',
        text: 'SELECT id FROM crew WHERE LOWER(email) = $1 AND id <> $2 AND (active = true OR active IS NULL)',
        values: [em, crewId],
      });
      if (clash.rows.length) return res.status(409).json({ error: 'Another person already uses this email' });
    }

    await pool.query({
      name: 'projects_crew_patch_member',
      text: `UPDATE crew SET name = $1, initials = $2, first_name = $3, last_name = $4, email = $5 WHERE id = $6`,
      values: [displayName, initials, nextFn || null, nextLn || null, nextEmail, crewId],
    });

    if (crewUserId) {
      await pool.query({
        name: 'projects_user_patch_from_crew',
        text: 'UPDATE users SET first_name = $2, last_name = $3, full_name = $4 WHERE id = $1',
        values: [crewUserId, nextFn || null, nextLn || null, displayName],
      }).catch(() => {});
    }

    const allowedRoles = ['admin', 'moderator', 'editor', 'viewer'];
    if (role !== undefined) {
      const roleNorm = String(role).toLowerCase();
      if (allowedRoles.includes(roleNorm)) {
        await pool.query({
          name: 'projects_pm_patch_role',
          text: 'UPDATE project_members SET role = $1 WHERE id = $2 AND project_id = $3',
          values: [roleNorm, memberRecordId, projectId],
        });
      }
    }

    const { rows: out } = await pool.query({
      name: 'projects_members_one_after_patch',
      text: `SELECT pm.id, pm.crew_id, pm.role, c.name, c.email, c.initials, c.first_name, c.last_name,
              (p.created_by = c.user_id) AS is_creator
       FROM project_members pm JOIN crew c ON c.id = pm.crew_id JOIN projects p ON p.id = pm.project_id
       WHERE pm.id = $1`,
      values: [memberRecordId],
    });
    return res.json(out[0] || {});
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Email already in use' });
    res.status(500).json({ error: e.message });
  }
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

// POST /:id/apply-template — apply a saved template: create sections (trackers) only, no task rows
router.post('/:id/apply-template', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const { template_id } = req.body;
    if (!template_id) return res.status(400).json({ error: 'template_id required' });

    const projectId = req.params.id;
    const allowedProjectIds = await getAccessibleProjectIds(pool, userId);
    if (!allowedProjectIds.some(id => String(id) === String(projectId))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const tmpl = await pool.query({
      name: 'templates_get_one',
      text: 'SELECT * FROM project_templates WHERE id=$1',
      values: [template_id],
    });
    if (!tmpl.rows.length) return res.status(404).json({ error: 'Template not found' });

    const trackers = tmpl.rows[0].trackers || [];
    const created = [];

    for (const tracker of trackers) {
      await pool.query({
        name: 'templates_tracker_insert',
        text: 'INSERT INTO trackers(project_id, name) VALUES($1,$2) RETURNING *',
        values: [projectId, tracker.name],
      });
      created.push(tracker.name);
    }

    res.json({ ok: true, created });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
