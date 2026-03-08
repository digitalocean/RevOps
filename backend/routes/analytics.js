const router = require('express').Router();
const { pool } = require('../server');
const { getAccessibleProjectIds, requireUser } = require('../lib/access');

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

    const [itemsRes, velocityRes] = await Promise.all([
      pool.query(
        `SELECT id, title, status, priority, category, due_date, created_at, updated_at
         FROM items WHERE project_id = $1`,
        [projectId]
      ),
      pool.query(
        `SELECT DATE_TRUNC('week', updated_at) AS week, COUNT(*) AS count
         FROM items WHERE project_id = $1 AND status IN ('done','complete','peak','closed','resolved') AND updated_at >= NOW() - INTERVAL '8 weeks'
         GROUP BY 1 ORDER BY 1`,
        [projectId]
      ),
    ]);

    const items = itemsRes.rows;
    const total = items.length;
    const byStatus = {};
    const byCategory = {};
    const byPriority = {};
    items.forEach((i) => {
      const s = (i.status || 'not_started').replace(/_/g, ' ');
      byStatus[s] = (byStatus[s] || 0) + 1;
      if (i.category) byCategory[i.category] = (byCategory[i.category] || 0) + 1;
      const p = i.priority || 'medium';
      byPriority[p] = (byPriority[p] || 0) + 1;
    });

    const doneCount = items.filter((i) => ['done','complete','closed','resolved'].includes((i.status || '').toLowerCase())).length;
    const completionRate = total > 0 ? Math.round((doneCount / total) * 100) : 0;
    const withProgress = items.filter((i) => i.updated_at);
    const velocityWeeks = velocityRes.rows.map((r) => ({
      week: r.week,
      count: Number(r.count),
    }));

    res.json({
      kpi: {
        completionRate,
        totalItems: total,
        doneCount,
        inProgressCount: Object.entries(byStatus).reduce((acc, [k, v]) => (k.toLowerCase().includes('progress') || k === 'in progress' ? acc + v : acc), 0),
        atRiskCount: items.filter((i) => (i.status || '').toLowerCase().includes('risk') || (i.status || '').toLowerCase() === 'blocked').length,
      },
      statusDistribution: Object.entries(byStatus).map(([name, value]) => ({ name, value })),
      categoryPerformance: Object.entries(byCategory).map(([name, value]) => ({ name, value })),
      velocityTrend: velocityWeeks,
      riskItems: items.filter((i) => (i.status || '').toLowerCase() === 'blocked' || (i.priority || '').toLowerCase() === 'high').slice(0, 20).map((i) => ({
        id: i.id,
        title: i.title,
        status: i.status,
        priority: i.priority,
      })),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
