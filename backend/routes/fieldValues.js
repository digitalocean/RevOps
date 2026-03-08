const router = require('express').Router();
const { pool } = require('../server');
const { getAccessibleProjectIds, requireUser } = require('../lib/access');

async function canAccessTask(pool, userId, taskId) {
  const item = await pool.query({
    name: 'field_values_item_project',
    text: 'SELECT project_id FROM items WHERE id = $1',
    values: [taskId],
  });
  if (!item.rows.length) return false;
  const allowed = await getAccessibleProjectIds(pool, userId);
  return allowed.some(id => String(id) === String(item.rows[0].project_id));
}

// GET /api/tasks/:id/field-values
router.get('/tasks/:id/field-values', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const taskId = req.params.id;
    const ok = await canAccessTask(pool, userId, taskId);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    const { rows } = await pool.query({
      name: 'field_values_get',
      text: 'SELECT fv.*, cf.name as field_name, cf.field_type, cf.field_key FROM custom_field_values fv JOIN custom_fields cf ON cf.id = fv.field_id WHERE fv.task_id = $1',
      values: [taskId],
    });
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/tasks/:id/field-values — upsert one or more field values. Body: { values: [ { fieldId, valueText?, valueNumber?, valueDate?, valueBoolean?, valueJson? } ] }
router.patch('/tasks/:id/field-values', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const taskId = req.params.id;
    const ok = await canAccessTask(pool, userId, taskId);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    const { values } = req.body;
    if (!Array.isArray(values) || !values.length) return res.status(400).json({ error: 'values array required' });

    const results = [];
    for (const v of values) {
      const { fieldId, valueText, valueNumber, valueDate, valueBoolean, valueJson } = v;
      if (!fieldId) continue;
      const { rows } = await pool.query({
        name: 'field_values_upsert',
        text: `INSERT INTO custom_field_values (task_id, field_id, value_text, value_number, value_date, value_boolean, value_json, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (task_id, field_id) DO UPDATE SET value_text = COALESCE(EXCLUDED.value_text, custom_field_values.value_text), value_number = COALESCE(EXCLUDED.value_number, custom_field_values.value_number), value_date = COALESCE(EXCLUDED.value_date, custom_field_values.value_date), value_boolean = COALESCE(EXCLUDED.value_boolean, custom_field_values.value_boolean), value_json = COALESCE(EXCLUDED.value_json, custom_field_values.value_json), updated_at = NOW() RETURNING *`,
        values: [taskId, fieldId, valueText ?? null, valueNumber ?? null, valueDate ?? null, valueBoolean ?? null, valueJson ? JSON.stringify(valueJson) : null],
      });
      if (rows[0]) results.push(rows[0]);
    }
    res.json(results);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
