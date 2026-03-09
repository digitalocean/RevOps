const router = require('express').Router();
const { pool } = require('../server');
const { getAccessibleWorkspaceIds, requireUser } = require('../lib/access');
const { getAccessibleProjectIds } = require('../lib/access');
const { logFieldAudit } = require('../lib/fieldAudit');

router.get('/', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const { project_id, target } = req.query;
    // Custom fields are per-project only. When project_id is provided, return only that project's fields.
    if (project_id) {
      const allowed = await getAccessibleProjectIds(pool, userId);
      if (!allowed.some(id => String(id) === String(project_id))) return res.json([]);
      let q = 'SELECT * FROM custom_fields WHERE project_id = $1';
      const p = [project_id];
      if (target) { p.push(target); q += ` AND (target = $${p.length} OR applies_to = $${p.length})`; }
      q += ' ORDER BY sort_order, created_at';
      const { rows } = await pool.query({ name: 'custom_fields_list_by_project', text: q, values: p });
      return res.json(rows);
    }
    return res.json([]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

function toAppliesTo(target) {
  if (target === 'item' || target === 'task') return 'task';
  if (target === 'sprint' || target === 'tracker') return 'tracker';
  return target || 'task';
}

function toTarget(appliesTo) {
  if (appliesTo === 'task') return 'item';
  if (appliesTo === 'tracker') return 'sprint';
  return appliesTo || 'item';
}

router.post('/', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const { project_id, target, name, field_type = 'text', options = [], applies_to, options_json } = req.body;
    if (!project_id) return res.status(400).json({ error: 'project_id required — custom fields are per project' });
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'name required' });
    const allowed = await getAccessibleProjectIds(pool, userId);
    if (!allowed.some(id => String(id) === String(project_id))) return res.status(403).json({ error: 'Access denied' });
    const prow = await pool.query({
      name: 'custom_fields_proj_workspace_post',
      text: 'SELECT workspace_id FROM projects WHERE id = $1',
      values: [project_id],
    });
    const workspace_id = prow.rows[0]?.workspace_id || null;
    const appliedTarget = target || (applies_to ? toTarget(applies_to) : 'item');
    const opts = Array.isArray(options) ? options : [];
    const { rows } = await pool.query({
      name: 'custom_fields_insert',
      text: 'INSERT INTO custom_fields(project_id, workspace_id, target, name, field_type, options) VALUES($1, $2, $3, $4, $5, $6) RETURNING *',
      values: [project_id, workspace_id, appliedTarget, name.trim(), field_type, opts],
    });
    const id = rows[0].id;
    try {
      if (options_json != null) await pool.query({
        name: 'custom_fields_update_options_json',
        text: 'UPDATE custom_fields SET options_json = $2::jsonb WHERE id = $1',
        values: [id, JSON.stringify(Array.isArray(options_json) ? options_json : [])],
      });
      if (applies_to) await pool.query({
        name: 'custom_fields_update_applies_to',
        text: 'UPDATE custom_fields SET applies_to = $2 WHERE id = $1',
        values: [id, applies_to],
      });
      const fieldKey = (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'field';
      await pool.query({
        name: 'custom_fields_update_field_key',
        text: 'UPDATE custom_fields SET field_key = $2 WHERE id = $1',
        values: [id, fieldKey],
      });
    } catch (_) { /* optional columns may not exist */ }
    const { rows: updated } = await pool.query({
      name: 'custom_fields_get_by_id',
      text: 'SELECT * FROM custom_fields WHERE id = $1',
      values: [id],
    });
    logFieldAudit(pool, userId, { projectId: project_id, entityType: 'custom_field', entityId: id, entityName: name.trim(), fieldName: 'created', newValue: name.trim() });
    res.status(201).json(updated[0] || rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/:id', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const cf = await pool.query({
      name: 'custom_fields_get_project_patch',
      text: 'SELECT project_id, workspace_id, name, field_type, options_json FROM custom_fields WHERE id = $1',
      values: [req.params.id],
    });
    if (!cf.rows.length) return res.status(404).json({ error: 'Not found' });
    const projectId = cf.rows[0].project_id;
    const workspaceId = cf.rows[0].workspace_id;
    if (projectId) {
      const allowed = await getAccessibleProjectIds(pool, userId);
      if (!allowed.some(id => String(id) === String(projectId))) return res.status(404).json({ error: 'Not found' });
    } else {
      const allowed = await getAccessibleWorkspaceIds(pool, userId);
      if (!allowed.some(id => String(id) === String(workspaceId))) return res.status(404).json({ error: 'Not found' });
    }
    const { name, field_type, target, applies_to, options, options_json, is_required, default_value } = req.body;
    const updates = [];
    const values = [];
    let i = 1;
    if (name !== undefined) { updates.push(`name = $${i++}`); values.push(name.trim()); }
    if (field_type !== undefined) { updates.push(`field_type = $${i++}`); values.push(field_type); }
    if (target !== undefined) { updates.push(`target = $${i++}`); values.push(target); }
    if (applies_to !== undefined) { updates.push(`applies_to = $${i++}`); values.push(applies_to); }
    if (options !== undefined) { updates.push(`options = $${i++}`); values.push(options); }
    if (options_json !== undefined) { updates.push(`options_json = $${i++}::jsonb`); values.push(JSON.stringify(Array.isArray(options_json) ? options_json : [])); }
    if (!updates.length) return res.status(400).json({ error: 'No updates' });
    values.push(req.params.id);
    const existing = cf.rows[0];
    const projectId = existing.project_id;
    const { rows } = await pool.query({
      name: 'custom_fields_patch',
      text: `UPDATE custom_fields SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
      values,
    }).catch(() => null);
    if (!rows || !rows[0]) return res.status(500).json({ error: 'Update failed' });
    const updatedRow = rows[0];
    const entityName = updatedRow.name || existing.name;
    if (name !== undefined && String(name).trim() !== (existing.name || '')) {
      logFieldAudit(pool, userId, { projectId, entityType: 'custom_field', entityId: req.params.id, entityName, fieldName: 'name', oldValue: existing.name, newValue: updatedRow.name });
    }
    if (field_type !== undefined && field_type !== existing.field_type) {
      logFieldAudit(pool, userId, { projectId, entityType: 'custom_field', entityId: req.params.id, entityName, fieldName: 'field_type', oldValue: existing.field_type, newValue: updatedRow.field_type });
    }
    if (options_json !== undefined) {
      const oldOpts = existing.options_json != null ? JSON.stringify(existing.options_json) : '';
      const newOpts = Array.isArray(updatedRow.options_json) ? JSON.stringify(updatedRow.options_json) : (updatedRow.options_json != null ? String(updatedRow.options_json) : '');
      if (oldOpts !== newOpts) {
        logFieldAudit(pool, userId, { projectId, entityType: 'custom_field', entityId: req.params.id, entityName, fieldName: 'options', oldValue: oldOpts.slice(0, 500), newValue: newOpts.slice(0, 500) });
      }
    }
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const cf = await pool.query({
      name: 'custom_fields_get_project_delete',
      text: 'SELECT project_id, workspace_id FROM custom_fields WHERE id = $1',
      values: [req.params.id],
    });
    if (!cf.rows.length) return res.status(404).json({ error: 'Not found' });
    const projectId = cf.rows[0].project_id;
    const workspaceId = cf.rows[0].workspace_id;
    if (projectId) {
      const allowed = await getAccessibleProjectIds(pool, userId);
      if (!allowed.some(id => String(id) === String(projectId))) return res.status(404).json({ error: 'Not found' });
    } else {
      const allowed = await getAccessibleWorkspaceIds(pool, userId);
      if (!allowed.some(id => String(id) === String(workspaceId))) return res.status(404).json({ error: 'Not found' });
    }
    await pool.query({
      name: 'custom_fields_delete',
      text: 'DELETE FROM custom_fields WHERE id=$1',
      values: [req.params.id],
    });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
