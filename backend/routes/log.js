const router = require('express').Router();
const { pool } = require('../server');
router.get('/', async (req,res)=>{ try{ const {project_id,sprint_id}=req.query; let q=`SELECT l.*,c.name as author_name,c.initials,c.color FROM log_entries l LEFT JOIN crew c ON l.author_id=c.id WHERE 1=1`; const p=[]; if(project_id){p.push(project_id);q+=` AND l.project_id=$${p.length}`;} if(sprint_id){p.push(sprint_id);q+=` AND l.sprint_id=$${p.length}`;} q+=' ORDER BY l.created_at DESC'; const {rows}=await pool.query(q,p); res.json(rows); }catch(e){res.status(500).json({error:e.message});} });
router.post('/', async (req, res) => {
  try {
    const { project_id, sprint_id, author_id, entry_type = 'note', content, voice_url } = req.body;
    if (!content || !String(content).trim()) return res.status(400).json({ error: 'Content required' });
    const { rows } = await pool.query(
      `INSERT INTO log_entries(project_id,sprint_id,author_id,entry_type,content,voice_url) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
      [project_id || null, sprint_id || null, author_id || null, entry_type, String(content).trim(), voice_url || null]
    );
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
router.delete('/:id', async (req,res)=>{ try{ await pool.query(`DELETE FROM log_entries WHERE id=$1`,[req.params.id]); res.json({success:true}); }catch(e){res.status(500).json({error:e.message});} });
module.exports = router;
