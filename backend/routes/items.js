const router = require('express').Router();
const { pool } = require('../server');
const { getAccessibleProjectIds, requireUser, isProjectAdminRoleOnly } = require('../lib/access');

async function canAccessProject(pool, userId, projectId) {
  const ids = await getAccessibleProjectIds(pool, userId);
  return ids.some(id => String(id) === String(projectId));
}

// GET all items for a sprint/project (user-scoped)
router.get('/', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const allowedProjectIds = await getAccessibleProjectIds(pool, userId);
    if (allowedProjectIds.length === 0) return res.json([]);
    const { sprint_id, project_id } = req.query;
    let query = `
      SELECT i.*, c.name as assignee_name, c.initials as assignee_initials, c.color as assignee_color,
             c.user_id as assignee_user_id, c.email as assignee_email,
             bc.name as column_name, bc.color as column_color, bc.slug as column_slug,
             cu.email as created_by_email,
             COALESCE(NULLIF(TRIM(CONCAT_WS(' ', cu.first_name, cu.last_name)), ''), cu.name) as created_by_name,
             COALESCE(i.requester_id, i.created_by_id) as requester_effective_id,
             COALESCE(ru.email, cu.email) as requester_email,
             COALESCE(
               NULLIF(TRIM(CONCAT_WS(' ', ru.first_name, ru.last_name)), ''),
               ru.name,
               NULLIF(TRIM(CONCAT_WS(' ', cu.first_name, cu.last_name)), ''),
               cu.name
             ) as requester_name
      FROM items i
      LEFT JOIN crew c ON i.assignee_id = c.id
      LEFT JOIN board_columns bc ON i.column_id = bc.id
      LEFT JOIN users cu ON i.created_by_id = cu.id
      LEFT JOIN users ru ON i.requester_id = ru.id
      WHERE i.project_id = ANY($1)
    `;
    const params = [allowedProjectIds];
    if (sprint_id)  { params.push(sprint_id);  query += ` AND i.sprint_id = $${params.length}`; }
    if (project_id) {
      if (!allowedProjectIds.some(id => String(id) === String(project_id))) return res.json([]);
      params.push(project_id);
      query += ` AND i.project_id = $${params.length}`;
    }
    query += ' ORDER BY i.sort_order ASC, i.created_at ASC';
    const { rows } = await pool.query({ name: 'items_list', text: query, values: params });
    if (rows.length > 0) {
      const itemIds = rows.map((r) => r.id);
      const fvRes = await pool.query({
        name: 'items_field_values',
        text: 'SELECT task_id, field_id, value_text, value_number, value_date, value_boolean FROM custom_field_values WHERE task_id = ANY($1)',
        values: [itemIds],
      }).catch(() => ({ rows: [] }));
      const byTask = {};
      (fvRes.rows || []).forEach((r) => {
        if (!byTask[r.task_id]) byTask[r.task_id] = {};
        const val = r.value_text ?? r.value_number ?? (r.value_date ? new Date(r.value_date).toISOString().slice(0, 10) : null) ?? r.value_boolean;
        byTask[r.task_id][r.field_id] = val;
      });
      rows.forEach((r) => {
        r.field_values = { ...(byTask[r.id] || {}) };
        const cv = typeof r.custom_vals === 'object' && r.custom_vals ? r.custom_vals : {};
        Object.assign(r.field_values, cv);
      });
    }
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET single item (user-scoped)
router.get('/:id', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const { rows } = await pool.query({
      name: 'items_get_one',
      text: `SELECT i.*, c.name as assignee_name, c.initials as assignee_initials, c.color as assignee_color,
                    cu.email as created_by_email,
                    COALESCE(NULLIF(TRIM(CONCAT_WS(' ', cu.first_name, cu.last_name)), ''), cu.name) as created_by_name,
                    COALESCE(i.requester_id, i.created_by_id) as requester_effective_id,
                    COALESCE(ru.email, cu.email) as requester_email,
                    COALESCE(
                      NULLIF(TRIM(CONCAT_WS(' ', ru.first_name, ru.last_name)), ''),
                      ru.name,
                      NULLIF(TRIM(CONCAT_WS(' ', cu.first_name, cu.last_name)), ''),
                      cu.name
                    ) as requester_name
             FROM items i
             LEFT JOIN crew c ON i.assignee_id = c.id
             LEFT JOIN users cu ON i.created_by_id = cu.id
             LEFT JOIN users ru ON i.requester_id = ru.id
             WHERE i.id = $1`,
      values: [req.params.id],
    });
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    const ok = await canAccessProject(pool, userId, rows[0].project_id);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST create item (user must have access to project)
router.post('/', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const { project_id, sprint_id, parent_id, tracker_id, type='task', title, description='', status='not_started',
            column_id, priority='medium', points=3, assignee_id, due_date, labels, custom_vals, category, requester_id } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });
    if (!project_id) return res.status(400).json({ error: 'project_id required' });
    const ok = await canAccessProject(pool, userId, project_id);
    if (!ok) return res.status(403).json({ error: 'Access denied to this project' });
    const labelsArr = Array.isArray(labels) ? labels : [];
    const customValsObj = custom_vals && typeof custom_vals === 'object' ? custom_vals : {};

    // Place the new item at the end of its tracker so drag-reorder stays stable.
    const { rows: maxRows } = await pool.query({
      name: 'items_max_sort_in_tracker',
      text: `SELECT COALESCE(MAX(sort_order), -100) + 100 AS next_sort
             FROM items
             WHERE project_id = $1
               AND ((tracker_id IS NULL AND $2::uuid IS NULL) OR tracker_id = $2::uuid)`,
      values: [project_id, tracker_id || null],
    });
    const nextSort = Number(maxRows[0]?.next_sort ?? 0);

    const requesterId = requester_id || userId;
    const { rows } = await pool.query({
      name: 'items_insert',
      text: 'INSERT INTO items(project_id,sprint_id,parent_id,tracker_id,type,title,description,status,column_id,priority,points,assignee_id,due_date,labels,custom_vals,category,created_by_id,requester_id,sort_order) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING *',
      values: [project_id, sprint_id || null, parent_id || null, tracker_id || null, type, title, description || '', status, column_id || null, priority, points ?? 3, assignee_id || null, due_date || null, labelsArr, JSON.stringify(customValsObj), category || null, userId, requesterId, nextSort],
    });
    res.status(201).json(rows[0]);
    logActivity(pool, project_id, userId, 'item_created', rows[0].id, { title });
    // Real-time broadcast
    try { req.app.locals.broadcast({ type: 'item_created', projectId: project_id, item: rows[0] }); } catch (_) {}
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Helper: log activity
async function logActivity(pool, projectId, userId, action, entityId, details = {}) {
  try {
    const crew = await pool.query({
      name: 'items_crew_by_user',
      text: 'SELECT id FROM crew WHERE user_id = $1 LIMIT 1',
      values: [userId],
    });
    const crewId = crew.rows[0]?.id || null;
    await pool.query({
      name: 'items_activity_insert',
      text: `INSERT INTO activity_log (project_id, crew_id, user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, 'item', $5, $6)`,
      values: [projectId, crewId, userId, action, entityId, JSON.stringify(details)],
    });
  } catch { /* non-fatal */ }
}

// PATCH update item (user must have access to item's project)
router.patch('/:id', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const itemCheck = await pool.query({
      name: 'items_get_for_patch',
      text: 'SELECT project_id, title, status, priority, assignee_id, due_date, category, custom_vals FROM items WHERE id = $1',
      values: [req.params.id],
    });
    if (!itemCheck.rows.length) return res.status(404).json({ error: 'Not found' });
    const existing = itemCheck.rows[0];
    const ok = await canAccessProject(pool, userId, existing.project_id);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    const allowed = ['type','title','description','status','column_id','priority','points','progress','assignee_id','due_date','labels','custom_vals','sort_order','parent_id','tracker_id','category','repeat_interval','repeat_ends_on','is_milestone','start_date','topic','requester_id'];
    let body = { ...req.body };
    const curVals = (existing.custom_vals && typeof existing.custom_vals === 'object') ? existing.custom_vals : {};
    let mergedCustom = { ...curVals };
    if (body.topic !== undefined) {
      mergedCustom.topic = body.topic;
      delete body.topic;
    }
    if (body.custom_vals !== undefined && typeof body.custom_vals === 'object') {
      mergedCustom = { ...mergedCustom, ...body.custom_vals };
      delete body.custom_vals;
    }
    const hasCustomValsPatch =
      req.body.custom_vals !== undefined && req.body.custom_vals !== null && typeof req.body.custom_vals === 'object';
    if (req.body.topic !== undefined || hasCustomValsPatch) {
      body.custom_vals = mergedCustom;
    }
    const fields = Object.keys(body).filter(k => allowed.includes(k));
    if (!fields.length) return res.status(400).json({ error: 'No valid fields' });
    const sets  = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
    const vals  = fields.map(f => f === 'custom_vals' ? JSON.stringify(body[f]) : body[f]);
    const { rows } = await pool.query({
      name: 'items_patch',
      text: `UPDATE items SET ${sets}, updated_at=NOW() WHERE id=$1 RETURNING *`,
      values: [req.params.id, ...vals],
    });
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
    // Real-time broadcast
    try { req.app.locals.broadcast({ type: 'item_updated', projectId: existing.project_id, item: rows[0] }); } catch (_) {}
    // Activity logging (async, non-blocking) — log each type of change for a rich activity feed
    const title = rows[0].title || existing.title;
    const logged = [];
    if (req.body.status !== undefined && req.body.status !== existing.status) {
      logActivity(pool, existing.project_id, userId, 'status_changed', req.params.id,
        { title, from: existing.status, to: req.body.status });
      logged.push('status');
      // Recurring: when the item transitions to a completed status and has a
      // repeat_interval, spawn a fresh copy with the next due_date so the
      // user's recurring cadence keeps going without manual duplication.
      const newStatus = String(req.body.status || '').toLowerCase();
      const wasComplete = ['done', 'complete', 'completed'].includes(String(existing.status || '').toLowerCase());
      const nowComplete = ['done', 'complete', 'completed'].includes(newStatus);
      if (!wasComplete && nowComplete) {
        try {
          const current = rows[0];
          const interval = current.repeat_interval;
          if (interval && interval !== 'none') {
            const stepDays = interval === 'daily' ? 1 : interval === 'weekly' ? 7 : interval === 'monthly' ? 30 : 0;
            if (stepDays > 0) {
              const baseDue = current.due_date ? new Date(current.due_date) : new Date();
              const nextDue = new Date(baseDue.getTime());
              nextDue.setDate(nextDue.getDate() + stepDays);
              const endsOn = current.repeat_ends_on ? new Date(current.repeat_ends_on) : null;
              if (!endsOn || nextDue <= endsOn) {
                // Append to end of the same tracker so the list stays tidy.
                const { rows: maxRows } = await pool.query({
                  name: 'items_max_sort_in_tracker_recurring',
                  text: `SELECT COALESCE(MAX(sort_order), -100) + 100 AS next_sort
                         FROM items
                         WHERE project_id = $1
                           AND ((tracker_id IS NULL AND $2::uuid IS NULL) OR tracker_id = $2::uuid)`,
                  values: [current.project_id, current.tracker_id || null],
                });
                const nextSort = Number(maxRows[0]?.next_sort ?? 0);
                const { rows: newRows } = await pool.query({
                  name: 'items_recurring_insert',
                  text: `INSERT INTO items
                         (project_id, sprint_id, parent_id, tracker_id, type, title, description, status,
                          column_id, priority, points, assignee_id, due_date, labels, custom_vals, category,
                          created_by_id, requester_id, sort_order, repeat_interval, repeat_ends_on)
                         VALUES ($1,$2,$3,$4,$5,$6,$7,'not_started',$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
                         RETURNING *`,
                  values: [
                    current.project_id,
                    current.sprint_id,
                    current.parent_id,
                    current.tracker_id,
                    current.type || 'task',
                    current.title,
                    current.description,
                    current.column_id,
                    current.priority,
                    current.points ?? 3,
                    current.assignee_id,
                    nextDue.toISOString().slice(0, 10),
                    Array.isArray(current.labels) ? current.labels : [],
                    JSON.stringify(current.custom_vals && typeof current.custom_vals === 'object' ? current.custom_vals : {}),
                    current.category,
                    userId,
                    current.requester_id || userId,
                    nextSort,
                    current.repeat_interval,
                    current.repeat_ends_on,
                  ],
                });
                logActivity(pool, current.project_id, userId, 'item_created', newRows[0].id,
                  { title: newRows[0].title, recurring_from: current.id });
                try { req.app.locals.broadcast({ type: 'item_created', projectId: current.project_id, item: newRows[0] }); } catch (_) {}
              }
            }
          }
        } catch (e) { console.error('recurring_task_spawn_failed', e); }
      }
    }
    if (req.body.priority !== undefined && req.body.priority !== existing.priority) {
      logActivity(pool, existing.project_id, userId, 'priority_changed', req.params.id,
        { title, from: existing.priority, to: req.body.priority });
      logged.push('priority');
    }
    if ('assignee_id' in req.body && String(req.body.assignee_id || '') !== String(existing.assignee_id || '')) {
      let fromName = null;
      let toName = null;
      if (existing.assignee_id) {
        const fr = await pool.query({ name: 'items_crew_name', text: 'SELECT name FROM crew WHERE id = $1', values: [existing.assignee_id] }).catch(() => ({ rows: [] }));
        fromName = fr.rows[0]?.name || null;
      }
      if (req.body.assignee_id) {
        const tr = await pool.query({ name: 'items_crew_name', text: 'SELECT name FROM crew WHERE id = $1', values: [req.body.assignee_id] }).catch(() => ({ rows: [] }));
        toName = tr.rows[0]?.name || null;
      }
      logActivity(pool, existing.project_id, userId, 'assignee_changed', req.params.id,
        { title, from: fromName, to: toName, assignee: toName });
      logged.push('assignee');
    }
    if (req.body.title !== undefined && String(req.body.title).trim() !== String(existing.title || '').trim()) {
      logActivity(pool, existing.project_id, userId, 'title_changed', req.params.id,
        { title: existing.title, to: String(req.body.title).trim() });
      logged.push('title');
    }
    const existingDue = existing.due_date ? (existing.due_date instanceof Date ? existing.due_date.toISOString().slice(0, 10) : String(existing.due_date).slice(0, 10)) : null;
    const newDue = req.body.due_date ? String(req.body.due_date).slice(0, 10) : null;
    if (req.body.due_date !== undefined && newDue !== existingDue) {
      logActivity(pool, existing.project_id, userId, 'due_date_changed', req.params.id,
        { title, from: existingDue, to: newDue });
      logged.push('due_date');
    }
    if (req.body.category !== undefined && String(req.body.category || '') !== String(existing.category || '')) {
      logActivity(pool, existing.project_id, userId, 'category_changed', req.params.id,
        { title, from: existing.category || null, to: req.body.category || null });
      logged.push('category');
    }
    if (logged.length === 0) {
      logActivity(pool, existing.project_id, userId, 'item_updated', req.params.id, { title });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE item — project Share role **admin** only, and only tasks you created
router.delete('/:id', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const itemCheck = await pool.query({
      name: 'items_get_for_del',
      text: 'SELECT project_id, title, created_by_id FROM items WHERE id = $1',
      values: [req.params.id],
    });
    if (!itemCheck.rows.length) return res.status(404).json({ error: 'Not found' });
    const row = itemCheck.rows[0];
    const admin = await isProjectAdminRoleOnly(pool, userId, row.project_id);
    if (!admin) return res.status(403).json({ error: 'Only project admins can delete tasks' });
    if (!row.created_by_id || String(row.created_by_id) !== String(userId)) {
      return res.status(403).json({ error: 'You can only delete tasks you created' });
    }
    await pool.query({
      name: 'items_delete',
      text: 'DELETE FROM items WHERE id=$1',
      values: [req.params.id],
    });
    res.json({ success: true });
    // Real-time broadcast
    try { req.app.locals.broadcast({ type: 'item_deleted', projectId: itemCheck.rows[0].project_id, itemId: req.params.id }); } catch (_) {}
    logActivity(pool, itemCheck.rows[0].project_id, userId, 'item_deleted', req.params.id,
      { title: itemCheck.rows[0].title });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

// GET /api/items/:id/dependencies
router.get('/:id/dependencies', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const { rows } = await pool.query({
      name: 'items_deps_list',
      text: 'SELECT d.*, i.title as depends_on_title, i.status as depends_on_status FROM item_dependencies d JOIN items i ON i.id = d.depends_on_id WHERE d.item_id = $1',
      values: [req.params.id],
    });
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/items/:id/dependencies
router.post('/:id/dependencies', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const { depends_on_id } = req.body;
    if (!depends_on_id) return res.status(400).json({ error: 'depends_on_id required' });
    if (depends_on_id === req.params.id) return res.status(400).json({ error: 'A task cannot depend on itself' });
    const { rows } = await pool.query({
      name: 'items_deps_insert',
      text: 'INSERT INTO item_dependencies(item_id, depends_on_id) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING *',
      values: [req.params.id, depends_on_id],
    });
    res.status(201).json(rows[0] || { ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/items/:id/dependencies/:depId
router.delete('/:id/dependencies/:depId', async (req, res) => {
  try {
    requireUser(req, res);
    await pool.query({
      name: 'items_deps_delete',
      text: 'DELETE FROM item_dependencies WHERE item_id=$1 AND depends_on_id=$2',
      values: [req.params.id, req.params.depId],
    });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/items/reorder — bulk sort_order update for items within a single
// (project, tracker) scope. Writes sort_order with a gap of 100 so future
// insertions don't need a full relayout.
router.patch('/reorder', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const { order } = req.body; // [{id, sort_order?}]
    if (!Array.isArray(order) || order.length === 0) {
      return res.status(400).json({ error: 'order array required' });
    }
    const ids = order.map((o) => String(o.id)).filter(Boolean);
    if (!ids.length) return res.status(400).json({ error: 'order ids required' });

    // Fetch project_id + tracker_id for every item so we can (a) enforce RBAC
    // and (b) reject multi-project or multi-tracker reorders — those should be
    // two separate calls because sort_order is scoped per tracker.
    const { rows: itemRows } = await pool.query({
      name: 'items_reorder_fetch',
      text: 'SELECT id, project_id, tracker_id FROM items WHERE id = ANY($1::uuid[])',
      values: [ids],
    });
    if (itemRows.length !== ids.length) {
      return res.status(404).json({ error: 'One or more items not found' });
    }
    const projectIds = new Set(itemRows.map((r) => String(r.project_id)));
    if (projectIds.size > 1) {
      return res.status(400).json({ error: 'All items in a reorder must belong to the same project' });
    }
    const trackerIds = new Set(itemRows.map((r) => String(r.tracker_id || 'null')));
    if (trackerIds.size > 1) {
      return res.status(400).json({ error: 'All items in a reorder must belong to the same tracker' });
    }
    const [projectId] = [...projectIds];
    const allowed = await getAccessibleProjectIds(pool, userId);
    if (!allowed.some((p) => String(p) === projectId)) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }

    for (const [idx, { id }] of order.entries()) {
      await pool.query({
        name: 'items_reorder_one',
        text: 'UPDATE items SET sort_order = $1, updated_at = NOW() WHERE id = $2',
        values: [idx * 100, id],
      });
    }
    // Let connected clients refresh their order.
    try {
      req.app.locals.broadcast?.({ type: 'items_reordered', projectId, ids });
    } catch (_) { /* non-fatal */ }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
