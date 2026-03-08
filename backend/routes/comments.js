const router = require('express').Router();
const { pool } = require('../server');
const { requireUser, getAccessibleProjectIds } = require('../lib/access');
const { createNotification } = require('./notifications');

async function canAccessItem(pool, userId, itemId) {
  const r = await pool.query({
    name: 'comments_item_project',
    text: 'SELECT project_id FROM items WHERE id=$1',
    values: [itemId],
  });
  if (!r.rows.length) return false;
  const ids = await getAccessibleProjectIds(pool, userId);
  return ids.some(id => String(id) === String(r.rows[0].project_id));
}

// GET /api/items/:itemId/comments
router.get('/items/:itemId/comments', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const ok = await canAccessItem(pool, userId, req.params.itemId);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    const { rows } = await pool.query({
      name: 'comments_list',
      text: 'SELECT c.*, COALESCE(u.full_name, u.name) as author_name, u.email as author_email FROM item_comments c LEFT JOIN users u ON u.id = c.author_id WHERE c.item_id = $1 ORDER BY c.created_at ASC',
      values: [req.params.itemId],
    });
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/items/:itemId/comments
router.post('/items/:itemId/comments', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const ok = await canAccessItem(pool, userId, req.params.itemId);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    const { body, mentions = [] } = req.body;
    if (!body?.trim()) return res.status(400).json({ error: 'body required' });
    const { rows } = await pool.query({
      name: 'comments_insert',
      text: 'INSERT INTO item_comments(item_id, author_id, body, mentions) VALUES($1,$2,$3,$4) RETURNING *',
      values: [req.params.itemId, userId, body.trim(), mentions],
    });
    // Enrich with author name
    const u = await pool.query({
      name: 'comments_author',
      text: 'SELECT name, email FROM users WHERE id=$1',
      values: [userId],
    });
    const comment = { ...rows[0], author_name: u.rows[0]?.name, author_email: u.rows[0]?.email };
    // Broadcast via WebSocket if available
    if (req.app.locals.broadcast) {
      req.app.locals.broadcast({ type: 'comment_added', itemId: req.params.itemId, comment });
    }
    // Fire notifications for @mentions
    if (mentions && mentions.length > 0) {
      const itemRes = await pool.query({
        name: 'comments_item_title',
        text: 'SELECT title, project_id FROM items WHERE id=$1',
        values: [req.params.itemId],
      });
      const itemTitle = itemRes.rows[0]?.title || 'a task';
      const projectId = itemRes.rows[0]?.project_id;
      const authorRes = await pool.query({
        name: 'comments_author_name',
        text: 'SELECT name FROM users WHERE id=$1',
        values: [userId],
      });
      const authorName = authorRes.rows[0]?.name || 'Someone';
      for (const mention of mentions) {
        const mentionedUser = await pool.query({
          name: 'comments_user_by_name',
          text: 'SELECT id FROM users WHERE name ILIKE $1 LIMIT 1',
          values: [mention],
        }).catch(() => ({ rows: [] }));
        if (mentionedUser.rows[0] && String(mentionedUser.rows[0].id) !== String(userId)) {
          await createNotification(pool, {
            userId: mentionedUser.rows[0].id,
            type: 'mention',
            title: `${authorName} mentioned you`,
            body: `In "${itemTitle}": ${body.trim().slice(0, 120)}`,
            itemId: req.params.itemId,
            projectId,
          });
          req.app.locals.broadcast?.({ type: 'notification', userId: mentionedUser.rows[0].id });
        }
      }
    }
    res.status(201).json(comment);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/comments/:id
router.delete('/comments/:id', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const r = await pool.query({
      name: 'comments_get_one',
      text: 'SELECT * FROM item_comments WHERE id=$1',
      values: [req.params.id],
    });
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    if (String(r.rows[0].author_id) !== String(userId)) return res.status(403).json({ error: 'Forbidden' });
    await pool.query({
      name: 'comments_delete',
      text: 'DELETE FROM item_comments WHERE id=$1',
      values: [req.params.id],
    });
    if (req.app.locals.broadcast) {
      req.app.locals.broadcast({ type: 'comment_deleted', commentId: req.params.id, itemId: r.rows[0].item_id });
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/items/:itemId/attachments
router.get('/items/:itemId/attachments', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const ok = await canAccessItem(pool, userId, req.params.itemId);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    const { rows } = await pool.query({
      name: 'comments_attachments_list',
      text: 'SELECT a.*, u.name as uploader_name FROM item_attachments a LEFT JOIN users u ON u.id = a.uploader_id WHERE a.item_id = $1 ORDER BY a.created_at ASC',
      values: [req.params.itemId],
    });
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/items/:itemId/attachments — stores base64 or external URL
router.post('/items/:itemId/attachments', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const ok = await canAccessItem(pool, userId, req.params.itemId);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    const { name, url, size_bytes = 0, mime_type = 'application/octet-stream' } = req.body;
    if (!name || !url) return res.status(400).json({ error: 'name and url required' });
    const { rows } = await pool.query({
      name: 'comments_attachment_insert',
      text: 'INSERT INTO item_attachments(item_id, uploader_id, name, url, size_bytes, mime_type) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',
      values: [req.params.itemId, userId, name, url, size_bytes, mime_type],
    });
    if (req.app.locals.broadcast) {
      req.app.locals.broadcast({ type: 'attachment_added', itemId: req.params.itemId, attachment: rows[0] });
    }
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/attachments/:id
router.delete('/attachments/:id', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const r = await pool.query({
      name: 'comments_attachment_get',
      text: 'SELECT * FROM item_attachments WHERE id=$1',
      values: [req.params.id],
    });
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    if (String(r.rows[0].uploader_id) !== String(userId)) return res.status(403).json({ error: 'Forbidden' });
    await pool.query({
      name: 'comments_attachment_delete',
      text: 'DELETE FROM item_attachments WHERE id=$1',
      values: [req.params.id],
    });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
