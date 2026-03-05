const express = require('express');
const multer = require('multer');
const pool = require('../db/pool');
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

// POST /api/voice/transcribe — receive audio, return transcript (stub or Whisper)
router.post('/transcribe', upload.single('audio'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No audio file' });
    let transcript = '';
    if (process.env.OPENAI_API_KEY) {
      try {
        const OpenAI = require('openai').default;
        const { Readable } = require('stream');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const stream = Readable.from(req.file.buffer);
        stream.path = req.file.originalname || 'audio.webm';
        const t = await openai.audio.transcriptions.create({ file: stream, model: 'whisper-1' });
        transcript = t.text || '';
      } catch (err) {
        console.error('Whisper error:', err.message);
      }
    }
    if (!transcript) transcript = '[No transcript — add OPENAI_API_KEY for Whisper or type in the box]';
    res.json({ transcript });
  } catch (e) { next(e); }
});

// POST /api/voice/create — create story/task/note from transcript (stub or GPT)
router.post('/create', async (req, res, next) => {
  try {
    const { transcript, type, projectId, sprintId } = req.body;
    if (!transcript) return res.status(400).json({ error: 'Missing transcript' });
    let result = {};
    if (process.env.OPENAI_API_KEY && type !== 'note') {
      try {
        const OpenAI = require('openai').default;
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const sys = type === 'story'
          ? 'Extract from the user message: title, description, acceptance criteria (bullet list), suggested story points (number). Return valid JSON only.'
          : 'Extract from the user message: title, description, priority (critical|high|medium|low). Return valid JSON only.';
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: sys },
            { role: 'user', content: transcript },
          ],
          response_format: { type: 'json_object' },
        });
        const text = completion.choices[0]?.message?.content || '{}';
        result = JSON.parse(text);
      } catch (err) {
        console.error('GPT error:', err.message);
      }
    }
    if (type === 'story' || type === 'task') {
      const { rows } = await pool.query(
        `INSERT INTO work_items (project_id, sprint_id, type, title, description, status, priority, points) VALUES ($1, $2, $3, $4, $5, 'backlog', $6, $7) RETURNING *`,
        [
          projectId || null,
          sprintId || null,
          type,
          result.title || transcript.slice(0, 200),
          result.description || transcript,
          result.priority || 'medium',
          result.points ?? result.suggested_story_points ?? 1,
        ]
      );
      return res.status(201).json(rows[0]);
    }
    // note -> captain log
    const content = (result && result.content) ? result.content : transcript;
    const { rows } = await pool.query(
      `INSERT INTO captain_log_entries (project_id, sprint_id, content, entry_type) VALUES ($1, $2, $3, 'ai') RETURNING *`,
      [projectId || null, sprintId || null, content]
    );
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
});

module.exports = router;
