const router = require('express').Router();
const { pool } = require('../server');
const { getAccessibleProjectIds, requireUser } = require('../lib/access');

// GET /projects/:id/audit — Field Audit history only: custom/standard field metadata (new field, picklist options, etc.)
router.get('/projects/:id/audit', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const projectId = req.params.id;
    const allowed = await getAccessibleProjectIds(pool, userId);
    if (!allowed.some((id) => String(id) === String(projectId))) {
      return res.status(404).json({ error: 'Not found' });
    }
    const limit = Math.min(Number(req.query.limit) || 200, 500);
    const { rows } = await pool.query({
      name: 'audit_list_field_only',
      text: `SELECT a.id, a.project_id, a.crew_id, a.entity_type, a.entity_id, a.entity_name, a.field_name, a.old_value, a.new_value, a.created_at,
             c.name AS crew_name, c.initials AS crew_initials
             FROM audit_log a
             LEFT JOIN crew c ON c.id = a.crew_id
             WHERE (a.project_id = $1 OR (a.project_id IS NULL AND a.entity_type = 'standard_field'))
             AND a.entity_type IN ('custom_field', 'standard_field')
             ORDER BY a.created_at DESC
             LIMIT $2`,
      values: [projectId, limit],
    });
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
