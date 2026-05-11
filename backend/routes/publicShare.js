const router = require('express').Router();
const { pool } = require('../server');

/**
 * Public (unauthenticated) read-only endpoints for a tokenised project share.
 * All lookups are done by the opaque `share_token`; we never expose internal
 * project ids to anonymous callers that don't present a valid token.
 */
async function getProjectByToken(token) {
  if (!token || typeof token !== 'string') return null;
  const { rows } = await pool.query({
    name: 'public_project_by_token',
    text: `SELECT id, name, description, color, workspace_id, created_at
           FROM projects
           WHERE share_enabled = true AND share_token = $1`,
    values: [token],
  });
  return rows[0] || null;
}

router.use((_req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  // Public link — no credentials required; explicitly avoid any cookies.
  res.setHeader('Cache-Control', 'public, max-age=30');
  next();
});

/** GET /api/public/projects/:token — project metadata + trackers + items. */
router.get('/projects/:token', async (req, res) => {
  try {
    const proj = await getProjectByToken(req.params.token);
    if (!proj) return res.status(404).json({ error: 'Not found or link disabled' });

    const [trackersRes, itemsRes] = await Promise.all([
      pool.query({
        name: 'public_trackers_list',
        text: 'SELECT id, name, sort_order FROM trackers WHERE project_id = $1 ORDER BY sort_order ASC, name ASC',
        values: [proj.id],
      }),
      pool.query({
        name: 'public_items_list',
        text: `SELECT i.id, i.title, i.description, i.status, i.priority, i.category,
                      i.due_date, i.tracker_id, i.sort_order, i.created_at, i.progress,
                      c.name AS assignee_name, c.initials AS assignee_initials
               FROM items i
               LEFT JOIN crew c ON i.assignee_id = c.id
               WHERE i.project_id = $1
               ORDER BY i.sort_order ASC, i.created_at ASC`,
        values: [proj.id],
      }),
    ]);

    res.json({
      project: {
        id: proj.id,
        name: proj.name,
        description: proj.description,
        color: proj.color,
        created_at: proj.created_at,
      },
      trackers: trackersRes.rows,
      items: itemsRes.rows,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
