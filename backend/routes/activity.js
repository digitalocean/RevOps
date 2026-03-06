const router = require('express').Router();
const { pool } = require('../server');

// GET activity feed for a project (activity_log first, then fallback to recent items)
router.get('/', async (req, res) => {
  try {
    const { project_id, limit = 50 } = req.query;
    if (!project_id) {
      return res.status(400).json({ error: 'project_id required' });
    }
    const lim = Math.min(Number(limit) || 50, 100);

    let rows = await pool.query(
      `SELECT a.id, a.project_id, a.crew_id, a.action, a.entity_type, a.entity_id, a.details, a.created_at,
              c.name as crew_name, c.initials as crew_initials
       FROM activity_log a
       LEFT JOIN crew c ON a.crew_id = c.id
       WHERE a.project_id = $1
       ORDER BY a.created_at DESC
       LIMIT $2`,
      [project_id, lim]
    ).then(r => r.rows);

    if (rows.length === 0) {
      const items = await pool.query(
        `SELECT i.id, i.title, i.updated_at, i.created_at, c.name as assignee_name, c.initials as assignee_initials
         FROM items i
         LEFT JOIN crew c ON i.assignee_id = c.id
         WHERE i.project_id = $1
         ORDER BY COALESCE(i.updated_at, i.created_at) DESC
         LIMIT $2`,
        [project_id, lim]
      ).then(r => r.rows);
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
