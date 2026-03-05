const express = require('express');
const pool = require('../db/pool');
const router = express.Router();

router.get('/sprints/:sprintId/log', async (req, res, next) => {
  try {
    const { sprintId } = req.params;
    const { rows } = await pool.query(
      'SELECT * FROM captain_log_entries WHERE sprint_id = $1 ORDER BY created_at DESC',
      [sprintId]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

router.post('/log', async (req, res, next) => {
  try {
    const { project_id, sprint_id, author_id, content, entry_type, voice_url } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO captain_log_entries (project_id, sprint_id, author_id, content, entry_type, voice_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [project_id || null, sprint_id || null, author_id || null, content || '', entry_type || 'note', voice_url || null]
    );
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
});

module.exports = router;
