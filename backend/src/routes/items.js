// src/routes/items.js — Work items (epics, stories, bugs, tasks)
const router = require('express').Router();
const pool   = require('../db/pool');

// Helper: fetch full item with relations
async function getFullItem(id) {
  const { rows: [item] } = await pool.query(`
    SELECT w.*,
      tm.name  AS assignee_name,
      tm.color AS assignee_color,
      tm.avatar AS assignee_avatar
    FROM work_items w
    LEFT JOIN team_members tm ON tm.id = w.assignee_id
    WHERE w.id = $1
  `, [id]);
  if (!item) return null;

  const [criteria, comments, approvers, labels, blockers] = await Promise.all([
    pool.query('SELECT * FROM criteria WHERE item_id=$1 ORDER BY sort_order', [id]),
    pool.query(`SELECT c.*, tm.name AS author_name, tm.color AS author_color, tm.avatar AS author_avatar
                FROM comments c LEFT JOIN team_members tm ON tm.id=c.author_id
                WHERE c.item_id=$1 ORDER BY c.created_at`, [id]),
    pool.query(`SELECT a.*, tm.name AS member_name, tm.color AS member_color, tm.avatar AS member_avatar
                FROM approvers a LEFT JOIN team_members tm ON tm.id=a.member_id
                WHERE a.item_id=$1`, [id]),
    pool.query(`SELECT l.* FROM labels l
                JOIN item_labels il ON il.label_id=l.id WHERE il.item_id=$1`, [id]),
    pool.query(`SELECT blocked_by_id AS id FROM blockers WHERE item_id=$1`, [id]),
  ]);

  return {
    ...item,
    criteria:  criteria.rows,
    comments:  comments.rows,
    approvers: approvers.rows,
    labels:    labels.rows,
    blockers:  blockers.rows.map(r => r.id),
  };
}

// GET items (filter by project, sprint, status, assignee)
router.get('/', async (req, res, next) => {
  try {
    const { project_id, sprint_id, status, assignee_id } = req.query;
    const conds = [], vals = [];
    if (project_id)  { conds.push(`w.project_id=$${vals.length+1}`);  vals.push(project_id); }
    if (sprint_id)   { conds.push(`w.sprint_id=$${vals.length+1}`);   vals.push(sprint_id); }
    if (status)      { conds.push(`w.status=$${vals.length+1}`);      vals.push(status); }
    if (assignee_id) { conds.push(`w.assignee_id=$${vals.length+1}`); vals.push(assignee_id); }

    const { rows } = await pool.query(`
      SELECT w.*,
        tm.name AS assignee_name, tm.color AS assignee_color, tm.avatar AS assignee_avatar,
        COALESCE(json_agg(DISTINCT jsonb_build_object('id',l.id,'name',l.name,'color',l.color))
          FILTER (WHERE l.id IS NOT NULL), '[]') AS labels,
        (SELECT COUNT(*) FROM criteria c WHERE c.item_id=w.id) AS criteria_total,
        (SELECT COUNT(*) FROM criteria c WHERE c.item_id=w.id AND c.done=true) AS criteria_done,
        (SELECT COUNT(*) FROM comments co WHERE co.item_id=w.id) AS comment_count
      FROM work_items w
      LEFT JOIN team_members tm ON tm.id=w.assignee_id
      LEFT JOIN item_labels il ON il.item_id=w.id
      LEFT JOIN labels l ON l.id=il.label_id
      ${conds.length ? 'WHERE ' + conds.join(' AND ') : ''}
      GROUP BY w.id, tm.name, tm.color, tm.avatar
      ORDER BY w.created_at DESC
    `, vals);
    res.json(rows);
  } catch (err) { next(err); }
});

// GET single item (full details)
router.get('/:id', async (req, res, next) => {
  try {
    const item = await getFullItem(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) { next(err); }
});

// POST create item
router.post('/', async (req, res, next) => {
  const { project_id, sprint_id, type, title, description, status, priority, points,
          assignee_id, start_date, end_date, labels=[], criteria=[] } = req.body;
  if (!project_id || !title) return res.status(400).json({ error: 'project_id and title required' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [item] } = await client.query(
      `INSERT INTO work_items
         (project_id,sprint_id,type,title,description,status,priority,points,assignee_id,start_date,end_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [project_id, sprint_id||null, type||'task', title, description||null,
       status||'backlog', priority||'medium', points||1, assignee_id||null,
       start_date||null, end_date||null]
    );
    // Labels
    for (const lid of labels) {
      await client.query('INSERT INTO item_labels VALUES ($1,$2) ON CONFLICT DO NOTHING', [item.id, lid]);
    }
    // Criteria
    for (let i=0; i<criteria.length; i++) {
      await client.query('INSERT INTO criteria (item_id,text,sort_order) VALUES ($1,$2,$3)',
        [item.id, criteria[i].text || criteria[i], i]);
    }
    await client.query('COMMIT');
    res.status(201).json(await getFullItem(item.id));
  } catch (err) { await client.query('ROLLBACK'); next(err); }
  finally { client.release(); }
});

// PATCH update item fields
router.patch('/:id', async (req, res, next) => {
  const fields = ['type','title','description','status','priority','points',
                  'assignee_id','sprint_id','start_date','end_date'];
  const updates = [], values = [];
  fields.forEach(f => {
    if (req.body[f] !== undefined) { updates.push(`${f}=$${updates.length+1}`); values.push(req.body[f]); }
  });
  if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });
  values.push(req.params.id);
  try {
    const { rows } = await pool.query(
      `UPDATE work_items SET ${updates.join(',')} WHERE id=$${values.length} RETURNING *`, values
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(await getFullItem(req.params.id));
  } catch (err) { next(err); }
});

// DELETE item
router.delete('/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM work_items WHERE id=$1', [req.params.id]);
    res.json({ deleted: true });
  } catch (err) { next(err); }
});

// ── Criteria sub-routes ────────────────────────────────────────
router.post('/:id/criteria', async (req, res, next) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO criteria (item_id,text) VALUES ($1,$2) RETURNING *', [req.params.id, text]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.patch('/:id/criteria/:cid', async (req, res, next) => {
  const { done, text } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE criteria SET done=COALESCE($1,done), text=COALESCE($2,text)
       WHERE id=$3 AND item_id=$4 RETURNING *`,
      [done, text, req.params.cid, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.delete('/:id/criteria/:cid', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM criteria WHERE id=$1 AND item_id=$2', [req.params.cid, req.params.id]);
    res.json({ deleted: true });
  } catch (err) { next(err); }
});

// ── Comments sub-routes ────────────────────────────────────────
router.get('/:id/comments', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*, tm.name AS author_name, tm.avatar AS author_avatar, tm.color AS author_color
       FROM comments c LEFT JOIN team_members tm ON tm.id=c.author_id
       WHERE c.item_id=$1 ORDER BY c.created_at`, [req.params.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/:id/comments', async (req, res, next) => {
  const { body, author_id } = req.body;
  if (!body) return res.status(400).json({ error: 'body required' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO comments (item_id,body,author_id) VALUES ($1,$2,$3) RETURNING *',
      [req.params.id, body, author_id||null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// ── Approvers sub-routes ───────────────────────────────────────
router.post('/:id/approvers', async (req, res, next) => {
  const { member_id } = req.body;
  if (!member_id) return res.status(400).json({ error: 'member_id required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO approvers (item_id,member_id) VALUES ($1,$2)
       ON CONFLICT (item_id,member_id) DO NOTHING RETURNING *`,
      [req.params.id, member_id]
    );
    res.status(201).json(rows[0] || { message: 'already exists' });
  } catch (err) { next(err); }
});

router.patch('/:id/approvers/:aid', async (req, res, next) => {
  const { status } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE approvers SET status=$1, responded_at=NOW()
       WHERE id=$2 AND item_id=$3 RETURNING *`,
      [status, req.params.aid, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.delete('/:id/approvers/:aid', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM approvers WHERE id=$1', [req.params.aid]);
    res.json({ deleted: true });
  } catch (err) { next(err); }
});

// ── Blockers sub-routes ────────────────────────────────────────
router.post('/:id/blockers', async (req, res, next) => {
  const { blocked_by_id } = req.body;
  try {
    await pool.query(
      'INSERT INTO blockers VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [req.params.id, blocked_by_id]
    );
    res.status(201).json({ item_id: req.params.id, blocked_by_id });
  } catch (err) { next(err); }
});

router.delete('/:id/blockers/:bid', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM blockers WHERE item_id=$1 AND blocked_by_id=$2',
      [req.params.id, req.params.bid]);
    res.json({ deleted: true });
  } catch (err) { next(err); }
});

module.exports = router;
