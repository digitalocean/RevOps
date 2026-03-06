const router = require('express').Router();
const { pool } = require('../server');
router.get('/', async (req, res) => {
  try {
    const { workspace_id, target } = req.query;
    if (!workspace_id) return res.json([]);
    let q = 'SELECT * FROM custom_fields WHERE workspace_id = $1';
    const p = [workspace_id];
    if (target) { p.push(target); q += ` AND target = $${p.length}`; }
    q += ' ORDER BY sort_order, created_at';
    const { rows } = await pool.query(q, p);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/', async (req,res)=>{ try{ const {workspace_id,target,name,field_type='text',options=[]}=req.body; if(!name||!target) return res.status(400).json({error:'name and target required'}); const {rows}=await pool.query(`INSERT INTO custom_fields(workspace_id,target,name,field_type,options) VALUES($1,$2,$3,$4,$5) RETURNING *`,[workspace_id,target,name,field_type,options]); res.status(201).json(rows[0]); }catch(e){res.status(500).json({error:e.message});} });
router.delete('/:id', async (req,res)=>{ try{ await pool.query(`DELETE FROM custom_fields WHERE id=$1`,[req.params.id]); res.json({success:true}); }catch(e){res.status(500).json({error:e.message});} });
module.exports = router;
