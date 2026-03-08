const router = require('express').Router();
const { pool } = require('../server');
const { requireUser, getAccessibleProjectIds } = require('../lib/access');

async function canAccessItem(pool, userId, itemId) {
  const r = await pool.query({
    name: 'timelogs_item_project',
    text: 'SELECT project_id FROM items WHERE id=$1',
    values: [itemId],
  });
  if (!r.rows.length) return false;
  const ids = await getAccessibleProjectIds(pool, userId);
  return ids.some(id => String(id) === String(r.rows[0].project_id));
}

// GET /api/items/:itemId/time-logs
router.get('/items/:itemId/time-logs', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const ok = await canAccessItem(pool, userId, req.params.itemId);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    const { rows } = await pool.query({
      name: 'timelogs_list',
      text: 'SELECT t.*, COALESCE(u.full_name, u.name) as user_name FROM time_logs t LEFT JOIN users u ON u.id = t.user_id WHERE t.item_id = $1 ORDER BY t.logged_at DESC',
      values: [req.params.itemId],
    });
    const totalMinutes = rows.reduce((acc, r) => acc + (r.minutes || 0), 0);
    res.json({ logs: rows, totalMinutes });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/items/:itemId/time-logs
router.post('/items/:itemId/time-logs', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const ok = await canAccessItem(pool, userId, req.params.itemId);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    const { minutes, note, logged_at } = req.body;
    if (!minutes || minutes < 1) return res.status(400).json({ error: 'minutes required (>=1)' });
    const { rows } = await pool.query({
      name: 'timelogs_insert',
      text: 'INSERT INTO time_logs(item_id, user_id, minutes, note, logged_at) VALUES($1,$2,$3,$4,$5) RETURNING *',
      values: [req.params.itemId, userId, minutes, note || null, logged_at || new Date().toISOString().slice(0,10)],
    });
    if (req.app.locals.broadcast) {
      req.app.locals.broadcast({ type: 'time_logged', itemId: req.params.itemId, log: rows[0] });
    }
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/time-logs/:id
router.delete('/time-logs/:id', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const r = await pool.query({
      name: 'timelogs_get_one',
      text: 'SELECT * FROM time_logs WHERE id=$1',
      values: [req.params.id],
    });
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    if (String(r.rows[0].user_id) !== String(userId)) return res.status(403).json({ error: 'Forbidden' });
    await pool.query({
      name: 'timelogs_delete',
      text: 'DELETE FROM time_logs WHERE id=$1',
      values: [req.params.id],
    });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
