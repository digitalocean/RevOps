const router = require('express').Router();
const { pool } = require('../server');
const { getAccessibleProjectIds, requireUser } = require('../lib/access');

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
             bc.name as column_name, bc.color as column_color, bc.slug as column_slug
      FROM items i
      LEFT JOIN crew c ON i.assignee_id = c.id
      LEFT JOIN board_columns bc ON i.column_id = bc.id
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
    const { rows } = await pool.query(query, params);
    if (rows.length > 0) {
      const itemIds = rows.map((r) => r.id);
      const fvRes = await pool.query(
        'SELECT task_id, field_id, value_text, value_number, value_date, value_boolean FROM custom_field_values WHERE task_id = ANY($1)',
        [itemIds]
      ).catch(() => ({ rows: [] }));
      const byTask = {};
      (fvRes.rows || []).forEach((r) => {
        if (!byTask[r.task_id]) byTask[r.task_id] = {};
        const val = r.value_text ?? r.value_number ?? (r.value_date ? new Date(r.value_date).toISOString().slice(0, 10) : null) ?? r.value_boolean;
        byTask[r.task_id][r.field_id] = val;
      });
      rows.forEach((r) => { r.field_values = byTask[r.id] || {}; });
    }
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET single item (user-scoped)
router.get('/:id', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const { rows } = await pool.query(
      `SELECT i.*, c.name as assignee_name, c.initials as assignee_initials, c.color as assignee_color
       FROM items i LEFT JOIN crew c ON i.assignee_id = c.id WHERE i.id = $1`,
      [req.params.id]
    );
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
            column_id, priority='medium', points=3, assignee_id, due_date, labels, custom_vals, category } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });
    if (!project_id) return res.status(400).json({ error: 'project_id required' });
    const ok = await canAccessProject(pool, userId, project_id);
    if (!ok) return res.status(403).json({ error: 'Access denied to this project' });
    const labelsArr = Array.isArray(labels) ? labels : [];
    const customValsObj = custom_vals && typeof custom_vals === 'object' ? custom_vals : {};
    const { rows } = await pool.query(`
      INSERT INTO items(project_id,sprint_id,parent_id,tracker_id,type,title,description,status,column_id,priority,points,assignee_id,due_date,labels,custom_vals,category)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *
    `, [project_id, sprint_id || null, parent_id || null, tracker_id || null, type, title, description || '', status, column_id || null, priority, points ?? 3, assignee_id || null, due_date || null, labelsArr, JSON.stringify(customValsObj), category || null]);
    res.status(201).json(rows[0]);
    logActivity(pool, project_id, userId, 'item_created', rows[0].id, { title });
    // Real-time broadcast
    try { req.app.locals.broadcast({ type: 'item_created', projectId: project_id, item: rows[0] }); } catch (_) {}
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Helper: log activity
async function logActivity(pool, projectId, userId, action, entityId, details = {}) {
  try {
    const crew = await pool.query('SELECT id FROM crew WHERE user_id = $1 LIMIT 1', [userId]);
    const crewId = crew.rows[0]?.id || null;
    await pool.query(
      `INSERT INTO activity_log (project_id, crew_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, 'item', $4, $5)`,
      [projectId, crewId, action, entityId, JSON.stringify(details)]
    );
  } catch { /* non-fatal */ }
}

// PATCH update item (user must have access to item's project)
router.patch('/:id', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const itemCheck = await pool.query('SELECT project_id, title, status, priority, assignee_id FROM items WHERE id = $1', [req.params.id]);
    if (!itemCheck.rows.length) return res.status(404).json({ error: 'Not found' });
    const existing = itemCheck.rows[0];
    const ok = await canAccessProject(pool, userId, existing.project_id);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    const allowed = ['type','title','description','status','column_id','priority','points','progress','assignee_id','due_date','labels','custom_vals','sort_order','parent_id','tracker_id','category','repeat_interval','repeat_ends_on','is_milestone','start_date'];
    const fields = Object.keys(req.body).filter(k => allowed.includes(k));
    if (!fields.length) return res.status(400).json({ error: 'No valid fields' });
    const sets  = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
    const vals  = fields.map(f => f === 'custom_vals' ? JSON.stringify(req.body[f]) : req.body[f]);
    const { rows } = await pool.query(
      `UPDATE items SET ${sets}, updated_at=NOW() WHERE id=$1 RETURNING *`,
      [req.params.id, ...vals]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
    // Real-time broadcast
    try { req.app.locals.broadcast({ type: 'item_updated', projectId: existing.project_id, item: rows[0] }); } catch (_) {}
    // Activity logging (async, non-blocking)
    const title = rows[0].title || existing.title;
    if (req.body.status && req.body.status !== existing.status) {
      logActivity(pool, existing.project_id, userId, 'status_changed', req.params.id,
        { title, from: existing.status, to: req.body.status });
    } else if (req.body.priority && req.body.priority !== existing.priority) {
      logActivity(pool, existing.project_id, userId, 'priority_changed', req.params.id,
        { title, from: existing.priority, to: req.body.priority });
    } else if ('assignee_id' in req.body) {
      let assigneeName = null;
      if (req.body.assignee_id) {
        const cr = await pool.query('SELECT name FROM crew WHERE id = $1', [req.body.assignee_id]).catch(() => ({ rows: [] }));
        assigneeName = cr.rows[0]?.name || null;
      }
      logActivity(pool, existing.project_id, userId, 'assignee_changed', req.params.id,
        { title, assignee: assigneeName });
    } else {
      logActivity(pool, existing.project_id, userId, 'item_updated', req.params.id, { title });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE item (user must have access to item's project)
router.delete('/:id', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const itemCheck = await pool.query('SELECT project_id, title FROM items WHERE id = $1', [req.params.id]);
    if (!itemCheck.rows.length) return res.status(404).json({ error: 'Not found' });
    const ok = await canAccessProject(pool, userId, itemCheck.rows[0].project_id);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    await pool.query('DELETE FROM items WHERE id=$1', [req.params.id]);
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
    const { rows } = await pool.query(
      `SELECT d.*, i.title as depends_on_title, i.status as depends_on_status
       FROM item_dependencies d
       JOIN items i ON i.id = d.depends_on_id
       WHERE d.item_id = $1`,
      [req.params.id]
    );
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
    const { rows } = await pool.query(
      `INSERT INTO item_dependencies(item_id, depends_on_id) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING *`,
      [req.params.id, depends_on_id]
    );
    res.status(201).json(rows[0] || { ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/items/:id/dependencies/:depId
router.delete('/:id/dependencies/:depId', async (req, res) => {
  try {
    requireUser(req, res);
    await pool.query('DELETE FROM item_dependencies WHERE item_id=$1 AND depends_on_id=$2', [req.params.id, req.params.depId]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/items/reorder — bulk sort_order update
router.patch('/reorder', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const { order } = req.body; // [{id, sort_order}]
    if (!Array.isArray(order)) return res.status(400).json({ error: 'order array required' });
    for (const { id, sort_order } of order) {
      await pool.query('UPDATE items SET sort_order=$1, updated_at=NOW() WHERE id=$2', [sort_order, id]);
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
