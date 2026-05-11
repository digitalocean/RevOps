const router = require('express').Router();
const { pool } = require('../server');
const { requireUser, getAccessibleProjectIds, canManageProject } = require('../lib/access');
const { logFieldAudit } = require('../lib/fieldAudit');

/** Fields that support per-project option overrides. Other fields remain global. */
const PROJECT_SCOPED_FIELD_KEYS = new Set(['category']);

/** Fields that support per-project label rename (display only, keeps field_key stable). */
const PROJECT_RENAMABLE_FIELD_KEYS = new Set(['topic', 'category']);

/**
 * GET / — list all standard fields. If `project_id` is provided and the user
 * has access to it, options_json for PROJECT_SCOPED_FIELD_KEYS is replaced by
 * the project's override (when one exists).
 */
router.get('/', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const { project_id } = req.query;
    const { rows } = await pool.query({
      name: 'standard_fields_list',
      text: 'SELECT id, field_key, name, field_type, options_json, sort_order FROM standard_fields ORDER BY sort_order, created_at',
      values: [],
    });

    if (project_id) {
      const allowed = await getAccessibleProjectIds(pool, userId);
      if (allowed.some((id) => String(id) === String(project_id))) {
        const overridesRes = await pool.query({
          name: 'project_field_options_list_merged',
          text: 'SELECT field_key, options_json, label FROM project_field_options WHERE project_id = $1',
          values: [project_id],
        });
        const overrideByKey = new Map(
          overridesRes.rows.map((r) => [String(r.field_key), r])
        );
        for (const row of rows) {
          const override = overrideByKey.get(row.field_key);
          if (PROJECT_SCOPED_FIELD_KEYS.has(row.field_key) && override?.options_json != null) {
            row.options_json = override.options_json;
            row.is_project_override = true;
          } else if (PROJECT_SCOPED_FIELD_KEYS.has(row.field_key)) {
            row.is_project_override = false;
          }
          if (PROJECT_RENAMABLE_FIELD_KEYS.has(row.field_key) && override?.label) {
            row.original_name = row.name;
            row.name = override.label;
            row.is_project_label_override = true;
          }
        }
      }
    }
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * GET /project-options/:projectId — raw list of project option overrides for
 * admin UIs (no merge, just what's stored).
 */
router.get('/project-options/:projectId', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const allowed = await getAccessibleProjectIds(pool, userId);
    if (!allowed.some((id) => String(id) === String(req.params.projectId))) {
      return res.status(404).json({ error: 'Not found' });
    }
    const { rows } = await pool.query({
      name: 'project_field_options_list_raw',
      text: 'SELECT field_key, options_json, updated_at FROM project_field_options WHERE project_id = $1',
      values: [req.params.projectId],
    });
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * PUT /project-options/:projectId/:fieldKey — upsert project-specific options
 * for a supported field (only workspace owner / project admin may edit).
 */
router.put('/project-options/:projectId/:fieldKey', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const { projectId, fieldKey } = req.params;
    const bodyHasOptions = req.body && 'options_json' in req.body;
    const bodyHasLabel = req.body && 'label' in req.body;

    if (bodyHasOptions && !PROJECT_SCOPED_FIELD_KEYS.has(fieldKey)) {
      return res.status(400).json({ error: `${fieldKey} options are not project-scopable` });
    }
    if (bodyHasLabel && !PROJECT_RENAMABLE_FIELD_KEYS.has(fieldKey)) {
      return res.status(400).json({ error: `${fieldKey} is not project-renamable` });
    }
    if (!bodyHasOptions && !bodyHasLabel) {
      return res.status(400).json({ error: 'options_json or label required' });
    }

    const canManage = await canManageProject(pool, userId, projectId);
    if (!canManage) return res.status(403).json({ error: 'Only project owner/admin may edit field overrides' });

    const opts = bodyHasOptions ? (Array.isArray(req.body.options_json) ? req.body.options_json : []) : null;
    const label = bodyHasLabel ? (req.body.label == null ? null : String(req.body.label).trim() || null) : null;

    // Fetch existing so we only touch supplied columns on update.
    const existing = (await pool.query({
      text: 'SELECT options_json, label FROM project_field_options WHERE project_id = $1 AND field_key = $2',
      values: [projectId, fieldKey],
    })).rows[0];
    const nextOptions = bodyHasOptions ? JSON.stringify(opts) : (existing?.options_json != null ? JSON.stringify(existing.options_json) : '[]');
    const nextLabel = bodyHasLabel ? label : (existing?.label ?? null);

    const { rows } = await pool.query({
      name: 'project_field_options_upsert_v2',
      text: `INSERT INTO project_field_options (project_id, field_key, options_json, label)
             VALUES ($1, $2, $3::jsonb, $4)
             ON CONFLICT (project_id, field_key)
             DO UPDATE SET options_json = EXCLUDED.options_json, label = EXCLUDED.label, updated_at = NOW()
             RETURNING *`,
      values: [projectId, fieldKey, nextOptions, nextLabel],
    });
    if (bodyHasOptions) {
      logFieldAudit(pool, userId, {
        projectId,
        entityType: 'project_field_option',
        entityId: rows[0].id,
        entityName: fieldKey,
        fieldName: 'options',
        newValue: JSON.stringify(opts).slice(0, 500),
      });
    }
    if (bodyHasLabel) {
      logFieldAudit(pool, userId, {
        projectId,
        entityType: 'project_field_option',
        entityId: rows[0].id,
        entityName: fieldKey,
        fieldName: 'label',
        oldValue: existing?.label ?? null,
        newValue: label ?? null,
      });
    }
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * DELETE /project-options/:projectId/:fieldKey — remove override (fall back to global).
 */
router.delete('/project-options/:projectId/:fieldKey', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const { projectId, fieldKey } = req.params;
    const canManage = await canManageProject(pool, userId, projectId);
    if (!canManage) return res.status(403).json({ error: 'Only project owner/admin may remove override' });
    await pool.query({
      name: 'project_field_options_delete',
      text: 'DELETE FROM project_field_options WHERE project_id = $1 AND field_key = $2',
      values: [projectId, fieldKey],
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /:id — update standard field (options_json only for dropdowns; name/field_type allowed for consistency)
router.patch('/:id', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const id = req.params.id;
    const { options_json, name, field_type } = req.body || {};
    const existing = (await pool.query({ name: 'standard_fields_get_one', text: 'SELECT name, field_type, options_json FROM standard_fields WHERE id = $1', values: [id] })).rows[0];
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const updates = [];
    const values = [];
    let i = 1;
    if (options_json !== undefined) {
      updates.push(`options_json = $${i++}::jsonb`);
      values.push(JSON.stringify(Array.isArray(options_json) ? options_json : []));
    }
    if (name !== undefined && String(name).trim()) {
      updates.push(`name = $${i++}`);
      values.push(String(name).trim());
    }
    if (field_type !== undefined) {
      updates.push(`field_type = $${i++}`);
      values.push(field_type);
    }
    if (updates.length === 0) return res.status(400).json({ error: 'No updates' });
    values.push(id);
    const { rows } = await pool.query({
      name: 'standard_fields_patch',
      text: `UPDATE standard_fields SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
      values,
    });
    if (!rows || !rows[0]) return res.status(404).json({ error: 'Not found' });
    const entityName = rows[0].name || existing.name;
    if (name !== undefined && String(name).trim() !== (existing.name || '')) {
      logFieldAudit(pool, userId, { projectId: null, entityType: 'standard_field', entityId: id, entityName, fieldName: 'name', oldValue: existing.name, newValue: rows[0].name });
    }
    if (field_type !== undefined && field_type !== existing.field_type) {
      logFieldAudit(pool, userId, { projectId: null, entityType: 'standard_field', entityId: id, entityName, fieldName: 'field_type', oldValue: existing.field_type, newValue: rows[0].field_type });
    }
    if (options_json !== undefined) {
      const oldOpts = existing.options_json != null ? JSON.stringify(existing.options_json) : '';
      const newOpts = Array.isArray(rows[0].options_json) ? JSON.stringify(rows[0].options_json) : (rows[0].options_json != null ? String(rows[0].options_json) : '');
      if (oldOpts !== newOpts) {
        logFieldAudit(pool, userId, { projectId: null, entityType: 'standard_field', entityId: id, entityName, fieldName: 'options', oldValue: oldOpts.slice(0, 500), newValue: newOpts.slice(0, 500) });
      }
    }
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST / — add new standard field (applies to all projects; show warning in UI)
router.post('/', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const { name, field_key, field_type = 'text', options_json } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'name required' });
    const key = (field_key || String(name).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'field').slice(0, 80);
    const opts = options_json != null ? (Array.isArray(options_json) ? options_json : []) : [];
    // Explicit ::text casts: same $1 in SELECT + NOT EXISTS made Postgres infer conflicting types (42P08).
    const { rows } = await pool.query({
      name: 'standard_fields_insert',
      text: `INSERT INTO standard_fields (field_key, name, field_type, options_json, sort_order)
             SELECT $1::text, $2::text, $3::text, $4::jsonb, COALESCE((SELECT MAX(sort_order)+1 FROM standard_fields), 0)
             WHERE NOT EXISTS (SELECT 1 FROM standard_fields WHERE field_key = $1::text)
             RETURNING *`,
      values: [key, String(name).trim(), field_type, JSON.stringify(opts)],
    });
    if (!rows || !rows[0]) return res.status(409).json({ error: 'A standard field with this key already exists' });
    logFieldAudit(pool, userId, { projectId: null, entityType: 'standard_field', entityId: rows[0].id, entityName: String(name).trim(), fieldName: 'created', newValue: String(name).trim() });
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'A standard field with this key already exists' });
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
