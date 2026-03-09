const router = require('express').Router();
const { pool } = require('../server');
const { getAccessibleProjectIds, requireUser } = require('../lib/access');

function buildMetrics(items) {
  const total = items.length;
  const byStatus = {};
  const byCategory = {};
  items.forEach((i) => {
    const s = (i.status || 'not_started').replace(/_/g, ' ');
    byStatus[s] = (byStatus[s] || 0) + 1;
    if (i.category) byCategory[i.category] = (byCategory[i.category] || 0) + 1;
  });
  const doneCount = items.filter((i) => ['done','complete','closed','resolved'].includes((i.status || '').toLowerCase())).length;
  const completionRate = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const inProgressCount = Object.entries(byStatus).reduce((acc, [k, v]) => (k.toLowerCase().includes('progress') || k === 'in progress' ? acc + v : acc), 0);
  const atRiskCount = items.filter((i) => (i.status || '').toLowerCase().includes('risk') || (i.status || '').toLowerCase() === 'blocked').length;
  return {
    kpi: { completionRate, totalItems: total, doneCount, inProgressCount, atRiskCount },
    statusDistribution: Object.entries(byStatus).map(([name, value]) => ({ name, value })),
    categoryPerformance: Object.entries(byCategory).map(([name, value]) => ({ name, value })),
    riskItems: items.filter((i) => (i.status || '').toLowerCase() === 'blocked' || (i.priority || '').toLowerCase() === 'high').slice(0, 20).map((i) => ({
      id: i.id, title: i.title, status: i.status, priority: i.priority,
    })),
  };
}

// GET /api/projects/:id/analytics — chart data for Analytics tab (user-scoped)
router.get('/projects/:id/analytics', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const projectId = req.params.id;
    const allowed = await getAccessibleProjectIds(pool, userId);
    if (!allowed.some(id => String(id) === String(projectId))) {
      return res.status(404).json({ error: 'Not found' });
    }

    const [itemsRes, velocityRes, projectRow, trackersRes] = await Promise.all([
      pool.query({
        name: 'analytics_items_by_project',
        text: `SELECT id, title, status, priority, category, due_date, created_at, updated_at, custom_vals, tracker_id
         FROM items WHERE project_id = $1`,
        values: [projectId],
      }),
      pool.query({
        name: 'analytics_velocity_by_project',
        text: `SELECT DATE_TRUNC('week', updated_at) AS week, COUNT(*) AS count
         FROM items WHERE project_id = $1 AND status IN ('done','complete','peak','closed','resolved') AND updated_at >= NOW() - INTERVAL '8 weeks'
         GROUP BY 1 ORDER BY 1`,
        values: [projectId],
      }),
      pool.query({ name: 'analytics_project_workspace', text: 'SELECT workspace_id FROM projects WHERE id = $1', values: [projectId] }),
      pool.query({ name: 'analytics_trackers', text: 'SELECT id, name FROM trackers WHERE project_id = $1 ORDER BY name', values: [projectId] }),
    ]);

    const items = itemsRes.rows;
    const trackers = trackersRes.rows || [];
    const projectMetrics = buildMetrics(items);
    const velocityWeeks = velocityRes.rows.map((r) => ({
      week: r.week,
      count: Number(r.count),
    }));

    // Dynamic custom field distributions: fetch custom fields for project's workspace (task/item scope)
    let customFieldDistributions = [];
    const workspaceId = projectRow.rows[0]?.workspace_id;
    if (workspaceId && items.length > 0) {
      const cfRes = await pool.query({
        name: 'analytics_custom_fields',
        text: 'SELECT id, name FROM custom_fields WHERE project_id = $1 AND (target IN (\'item\',\'task\'))',
        values: [projectId],
      });
      const itemIds = items.map((i) => i.id);
      const fvRes = await pool.query({
        name: 'analytics_field_values',
        text: 'SELECT task_id, field_id, value_text, value_number, value_date, value_boolean FROM custom_field_values WHERE task_id = ANY($1)',
        values: [itemIds],
      }).catch(() => ({ rows: [] }));
      const byTaskField = {};
      (fvRes.rows || []).forEach((r) => {
        if (!byTaskField[r.task_id]) byTaskField[r.task_id] = {};
        const val = r.value_text ?? (r.value_number != null ? String(r.value_number) : null) ?? (r.value_date ? new Date(r.value_date).toISOString().slice(0, 10) : null) ?? (r.value_boolean != null ? String(r.value_boolean) : null);
        if (val != null) byTaskField[r.task_id][r.field_id] = val;
      });
      const customFields = cfRes.rows || [];
      customFieldDistributions = customFields.map((cf) => {
        const dist = {};
        items.forEach((i) => {
          const fromCv = i.custom_vals && typeof i.custom_vals === 'object' ? (i.custom_vals[cf.name] ?? i.custom_vals[cf.id]) : undefined;
          const val = byTaskField[i.id]?.[cf.id] ?? fromCv;
          const label = val == null || val === '' ? '(empty)' : String(val);
          dist[label] = (dist[label] || 0) + 1;
        });
        return {
          fieldId: cf.id,
          fieldName: cf.name,
          data: Object.entries(dist).map(([name, value]) => ({ name, value })),
        };
      }).filter((d) => d.data.length > 0);
    }

    // Per-tracker analytics (sections applied to this project)
    const byTracker = [];
    for (const tr of trackers) {
      const trackerItems = items.filter((i) => i.tracker_id && String(i.tracker_id) === String(tr.id));
      byTracker.push({
        trackerId: tr.id,
        trackerName: tr.name,
        ...buildMetrics(trackerItems),
      });
    }
    const uncategorizedItems = items.filter((i) => !i.tracker_id);
    if (uncategorizedItems.length > 0) {
      byTracker.push({
        trackerId: null,
        trackerName: 'Uncategorized',
        ...buildMetrics(uncategorizedItems),
      });
    }

    res.json({
      ...projectMetrics,
      kpi: projectMetrics.kpi,
      statusDistribution: projectMetrics.statusDistribution,
      categoryPerformance: projectMetrics.categoryPerformance,
      riskItems: projectMetrics.riskItems,
      velocityTrend: velocityWeeks,
      customFieldDistributions,
      byTracker,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
