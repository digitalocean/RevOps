const router = require('express').Router();
const { pool } = require('../server');
const { getAccessibleProjectIds, requireUser } = require('../lib/access');

router.use((_req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// GET activity feed for a project (user-scoped)
router.get('/', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const { project_id, limit = 50 } = req.query;
    if (!project_id) return res.status(400).json({ error: 'project_id required' });
    const allowedProjectIds = await getAccessibleProjectIds(pool, userId);
    if (!allowedProjectIds.some(id => String(id) === String(project_id))) {
      return res.status(404).json({ error: 'Not found' });
    }
    const lim = Math.min(Number(limit) || 50, 100);

    const activitySql = 'SELECT a.id, a.project_id, a.crew_id, a.action, a.entity_type, a.entity_id, a.details, a.created_at, COALESCE(c.name, u.name, u.email) crew_name, COALESCE(c.initials, UPPER(SUBSTR(COALESCE(TRIM(u.name), SPLIT_PART(u.email, \'@\', 1), \'?\'), 1, 2))) crew_initials FROM activity_log a LEFT JOIN crew c ON a.crew_id = c.id LEFT JOIN users u ON a.user_id = u.id WHERE a.project_id = $1 ORDER BY a.created_at DESC LIMIT $2';
    let rows = (await pool.query({ name: 'activity_list', text: activitySql, values: [project_id, lim] })).rows;

    if (rows.length === 0) {
      const items = (await pool.query({
        name: 'activity_fallback_items',
        text: 'SELECT i.id, i.title, i.updated_at, i.created_at, c.name as assignee_name, c.initials as assignee_initials FROM items i LEFT JOIN crew c ON i.assignee_id = c.id WHERE i.project_id = $1 ORDER BY COALESCE(i.updated_at, i.created_at) DESC LIMIT $2',
        values: [project_id, lim],
      })).rows;
      rows = items.map((i, idx) => ({
        id: `item-${i.id}`,
        project_id,
        crew_id: null,
        action: idx === 0 && i.created_at === i.updated_at ? 'item_created' : 'item_updated',
        entity_type: 'item',
        entity_id: i.id,
        details: { title: i.title },
        created_at: i.updated_at || i.created_at,
        crew_name: i.assignee_name,
        crew_initials: i.assignee_initials,
      }));
    }
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
