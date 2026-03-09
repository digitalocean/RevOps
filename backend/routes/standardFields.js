const router = require('express').Router();
const { pool } = require('../server');
const { requireUser } = require('../lib/access');
const { logFieldAudit } = require('../lib/fieldAudit');

// GET / — list all standard fields (any authenticated user)
router.get('/', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const { rows } = await pool.query({
      name: 'standard_fields_list',
      text: 'SELECT id, field_key, name, field_type, options_json, sort_order FROM standard_fields ORDER BY sort_order, created_at',
      values: [],
    });
    res.json(rows);
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
    const { rows } = await pool.query({
      name: 'standard_fields_insert',
      text: `INSERT INTO standard_fields (field_key, name, field_type, options_json, sort_order)
             SELECT $1, $2, $3, $4::jsonb, COALESCE((SELECT MAX(sort_order)+1 FROM standard_fields), 0)
             WHERE NOT EXISTS (SELECT 1 FROM standard_fields WHERE field_key = $1)
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
