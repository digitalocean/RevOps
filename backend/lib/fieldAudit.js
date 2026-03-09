/**
 * Log field metadata changes to audit_log (custom_field / standard_field only).
 * Used for "Field Audit history" in Base Camp.
 */
async function logFieldAudit(pool, userId, opts) {
  const { projectId, entityType, entityId, entityName, fieldName, oldValue, newValue } = opts;
  if (!entityType || !fieldName) return;
  try {
    const crew = await pool.query({
      name: 'field_audit_crew_by_user',
      text: 'SELECT id FROM crew WHERE user_id = $1 LIMIT 1',
      values: [userId],
    });
    const crewId = crew.rows[0]?.id || null;
    await pool.query({
      name: 'field_audit_insert',
      text: `INSERT INTO audit_log (project_id, crew_id, entity_type, entity_id, entity_name, field_name, old_value, new_value)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      values: [
        projectId || null,
        crewId,
        entityType,
        entityId || null,
        entityName || null,
        fieldName,
        oldValue != null ? String(oldValue).slice(0, 2000) : null,
        newValue != null ? String(newValue).slice(0, 2000) : null,
      ],
    });
  } catch (_) { /* non-fatal */ }
}

module.exports = { logFieldAudit };
