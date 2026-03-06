const router = require('express').Router();
const { pool } = require('../server');

router.get('/', async (req, res) => {
  try {
    const { project_id } = req.query;
    const q = project_id
      ? `SELECT * FROM sprints WHERE project_id=$1 ORDER BY created_at DESC`
      : `SELECT * FROM sprints ORDER BY created_at DESC`;
    const { rows } = await pool.query(q, project_id ? [project_id] : []);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { project_id, name, goal, start_date, end_date, capacity=40 } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO sprints(project_id,name,goal,start_date,end_date,capacity) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
      [project_id, name, goal, start_date, end_date, capacity]
    );
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/:id', async (req, res) => {
  try {
    const allowed = ['name','goal','status','start_date','end_date','capacity'];
    const fields = Object.keys(req.body).filter(k => allowed.includes(k));
    if (!fields.length) return res.status(400).json({ error: 'No valid fields' });
    const sets = fields.map((f,i) => `${f}=$${i+2}`).join(',');
    const { rows } = await pool.query(`UPDATE sprints SET ${sets} WHERE id=$1 RETURNING *`, [req.params.id, ...fields.map(f=>req.body[f])]);
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
