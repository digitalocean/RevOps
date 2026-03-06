const router = require('express').Router();
const { pool } = require('../server');
router.get('/', async (req, res) => {
  try {
    const { workspace_id } = req.query;
    let q = 'SELECT * FROM crew WHERE active = true';
    const params = [];
    if (workspace_id) { params.push(workspace_id); q += ` AND workspace_id = $${params.length}`; }
    q += ' ORDER BY name';
    const { rows } = await pool.query(q, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/', async (req,res)=>{ try{ const {workspace_id,name,email,initials,color='#6366f1',role='Member'}=req.body; const {rows}=await pool.query(`INSERT INTO crew(workspace_id,name,email,initials,color,role) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,[workspace_id,name,email,initials,color,role]); res.status(201).json(rows[0]); }catch(e){res.status(500).json({error:e.message});} });
router.patch('/:id', async (req,res)=>{ try{ const allowed=['name','email','color','role','status','active']; const fields=Object.keys(req.body).filter(k=>allowed.includes(k)); if(!fields.length) return res.status(400).json({error:'No fields'}); const sets=fields.map((f,i)=>`${f}=$${i+2}`).join(','); const {rows}=await pool.query(`UPDATE crew SET ${sets} WHERE id=$1 RETURNING *`,[req.params.id,...fields.map(f=>req.body[f])]); res.json(rows[0]); }catch(e){res.status(500).json({error:e.message});} });
router.delete('/:id', async (req,res)=>{ try{ await pool.query(`UPDATE crew SET active=false WHERE id=$1`,[req.params.id]); res.json({success:true}); }catch(e){res.status(500).json({error:e.message});} });
module.exports = router;
