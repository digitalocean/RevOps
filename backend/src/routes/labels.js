// src/routes/labels.js
const router = require('express').Router();
const pool   = require('../db/pool');

router.get('/',    async (req, res, next) => {
  try {
    const { project_id } = req.query;
    const { rows } = await pool.query(
      project_id
        ? 'SELECT * FROM labels WHERE project_id=$1 ORDER BY name' 
        : 'SELECT * FROM labels ORDER BY name',
      project_id ? [project_id] : []
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  const { project_id, name, color } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO labels (project_id,name,color) VALUES ($1,$2,$3) RETURNING *',
      [project_id||null, name, color||'#6b7280']
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM labels WHERE id=$1', [req.params.id]);
    res.json({ deleted: true });
  } catch (err) { next(err); }
});

module.exports = router;
