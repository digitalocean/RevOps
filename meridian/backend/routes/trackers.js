const router = require('express').Router();
const { pool } = require('../server');
router.get('/', async (req,res)=>{ try{ const {project_id}=req.query; const {rows}=await pool.query(`SELECT * FROM trackers WHERE project_id=$1 ORDER BY sort_order`,[project_id]); res.json(rows); }catch(e){res.status(500).json({error:e.message});} });
router.get('/:id/rows', async (req,res)=>{ try{ const {rows}=await pool.query(`SELECT * FROM tracker_rows WHERE tracker_id=$1 ORDER BY sort_order`,[req.params.id]); res.json(rows); }catch(e){res.status(500).json({error:e.message});} });
router.post('/', async (req,res)=>{ try{ const {project_id,name,icon='📋',columns=[]}=req.body; const {rows}=await pool.query(`INSERT INTO trackers(project_id,name,icon,columns) VALUES($1,$2,$3,$4) RETURNING *`,[project_id,name,icon,JSON.stringify(columns)]); res.status(201).json(rows[0]); }catch(e){res.status(500).json({error:e.message});} });
router.post('/:id/rows', async (req,res)=>{ try{ const {data={}}=req.body; const {rows}=await pool.query(`INSERT INTO tracker_rows(tracker_id,data) VALUES($1,$2) RETURNING *`,[req.params.id,JSON.stringify(data)]); res.status(201).json(rows[0]); }catch(e){res.status(500).json({error:e.message});} });
router.patch('/:id/rows/:rowId', async (req,res)=>{ try{ const {rows}=await pool.query(`UPDATE tracker_rows SET data=$1 WHERE id=$2 RETURNING *`,[JSON.stringify(req.body.data),req.params.rowId]); res.json(rows[0]); }catch(e){res.status(500).json({error:e.message});} });
module.exports = router;
