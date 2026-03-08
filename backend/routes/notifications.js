const router = require('express').Router();
const { pool } = require('../server');
const { requireUser } = require('../lib/access');

// GET /api/notifications — list unread + recent for current user
router.get('/', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const { rows } = await pool.query(
      `SELECT n.*, i.title as item_title, p.name as project_name
       FROM notifications n
       LEFT JOIN items i ON i.id = n.item_id
       LEFT JOIN projects p ON p.id = n.project_id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC LIMIT 50`,
      [userId]
    );
    const unreadCount = rows.filter(r => !r.read).length;
    res.json({ notifications: rows, unreadCount });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    await pool.query('UPDATE notifications SET read=true WHERE id=$1 AND user_id=$2', [req.params.id, userId]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/notifications/read-all
router.post('/read-all', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    await pool.query('UPDATE notifications SET read=true WHERE user_id=$1 AND read=false', [userId]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Internal helper: create a notification (called from other routes)
async function createNotification(pool, { userId, type, title, body, itemId, projectId }) {
  if (!userId) return;
  try {
    await pool.query(
      `INSERT INTO notifications(user_id, type, title, body, item_id, project_id) VALUES($1,$2,$3,$4,$5,$6)`,
      [userId, type, title, body || null, itemId || null, projectId || null]
    );
  } catch {}
}

module.exports = router;
module.exports.createNotification = createNotification;
