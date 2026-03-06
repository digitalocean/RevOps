const router = require('express').Router();
const { pool } = require('../server');
router.get('/', async (req, res) => {
  try {
    const { workspace_id } = req.query;
    let q = 'SELECT p.*, c.name as owner_name FROM projects p LEFT JOIN crew c ON p.owner_id = c.id WHERE 1=1';
    const params = [];
    if (workspace_id) { params.push(workspace_id); q += ` AND p.workspace_id = $${params.length}`; }
    q += ' ORDER BY p.created_at';
    const { rows } = await pool.query(q, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
const DEFAULT_COLUMNS = [
  { name: 'Base Camp', slug: 'backlog', color: '#3d4a63', is_done: false },
  { name: 'Summit Ready', slug: 'summit', color: '#3d9be9', is_done: false },
  { name: 'In Ascent', slug: 'ascent', color: '#f59e0b', is_done: false },
  { name: 'At Base Camp', slug: 'basecamp', color: '#9b7dff', is_done: false },
  { name: 'Peak Reached', slug: 'peak', color: '#00c9a7', is_done: true },
];
router.post('/', async (req, res) => {
  try {
    const { workspace_id, name, description, color = '#6366f1', owner_id } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Project name is required' });
    if (!workspace_id) return res.status(400).json({ error: 'Select a team first' });
    const { rows } = await pool.query(
      `INSERT INTO projects(workspace_id,name,description,color,owner_id) VALUES($1,$2,$3,$4,$5) RETURNING *`,
      [workspace_id, name.trim(), description || '', color, owner_id || null]
    );
  const pid = rows[0].id;
  for (let i = 0; i < DEFAULT_COLUMNS.length; i++) {
    const c = DEFAULT_COLUMNS[i];
    await pool.query('INSERT INTO board_columns(project_id,name,slug,color,sort_order,is_done) VALUES($1,$2,$3,$4,$5,$6)', [pid, c.name, c.slug, c.color, i, c.is_done]);
  }
  res.status(201).json(rows[0]);
} catch(e){res.status(500).json({error:e.message});} });
router.patch('/:id', async (req,res)=>{ try{ const allowed=['name','description','color','status','owner_id']; const fields=Object.keys(req.body).filter(k=>allowed.includes(k)); if(!fields.length) return res.status(400).json({error:'No fields'}); const sets=fields.map((f,i)=>`${f}=$${i+2}`).join(','); const {rows}=await pool.query(`UPDATE projects SET ${sets} WHERE id=$1 RETURNING *`,[req.params.id,...fields.map(f=>req.body[f])]); res.json(rows[0]); }catch(e){res.status(500).json({error:e.message});} });
module.exports = router;
