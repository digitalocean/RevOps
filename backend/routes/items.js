const router = require('express').Router();
const { pool } = require('../server');
const { v4: uuid } = require('uuid');

// GET all items for a sprint
router.get('/', async (req, res) => {
  try {
    const { sprint_id, project_id } = req.query;
    let query = `
      SELECT i.*, c.name as assignee_name, c.initials as assignee_initials, c.color as assignee_color,
             bc.name as column_name, bc.color as column_color, bc.slug as column_slug
      FROM items i
      LEFT JOIN crew c ON i.assignee_id = c.id
      LEFT JOIN board_columns bc ON i.column_id = bc.id
      WHERE 1=1
    `;
    const params = [];
    if (sprint_id)  { params.push(sprint_id);  query += ` AND i.sprint_id = $${params.length}`; }
    if (project_id) { params.push(project_id); query += ` AND i.project_id = $${params.length}`; }
    query += ' ORDER BY i.sort_order ASC, i.created_at ASC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET single item
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT i.*, c.name as assignee_name, c.initials as assignee_initials, c.color as assignee_color
       FROM items i LEFT JOIN crew c ON i.assignee_id = c.id WHERE i.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST create item
router.post('/', async (req, res) => {
  try {
    const { project_id, sprint_id, type='task', title, description='', status='backlog',
            column_id, priority='medium', points=3, assignee_id, due_date, labels, custom_vals } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });
    if (!project_id) return res.status(400).json({ error: 'project_id required' });
    const labelsArr = Array.isArray(labels) ? labels : [];
    const customValsObj = custom_vals && typeof custom_vals === 'object' ? custom_vals : {};
    const { rows } = await pool.query(`
      INSERT INTO items(project_id,sprint_id,type,title,description,status,column_id,priority,points,assignee_id,due_date,labels,custom_vals)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *
    `, [project_id, sprint_id || null, type, title, description || '', status, column_id || null, priority, points ?? 3, assignee_id || null, due_date || null, labelsArr, JSON.stringify(customValsObj)]);
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH update item
router.patch('/:id', async (req, res) => {
  try {
    const allowed = ['type','title','description','status','column_id','priority','points','assignee_id','due_date','labels','custom_vals','sort_order'];
    const fields = Object.keys(req.body).filter(k => allowed.includes(k));
    if (!fields.length) return res.status(400).json({ error: 'No valid fields' });
    const sets  = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
    const vals  = fields.map(f => f === 'custom_vals' ? JSON.stringify(req.body[f]) : req.body[f]);
    const { rows } = await pool.query(
      `UPDATE items SET ${sets}, updated_at=NOW() WHERE id=$1 RETURNING *`,
      [req.params.id, ...vals]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE item
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM items WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
