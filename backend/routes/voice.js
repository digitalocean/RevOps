const router  = require('express').Router();
const { pool } = require('../server');
const multer  = require('multer');
const upload  = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

// POST /api/voice/transcribe — accepts audio blob (multipart form field "audio")
router.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer || req.file.buffer.length === 0) {
      return res.status(400).json({
        error: 'No audio received',
        hint: 'Send a multipart form with an "audio" file (e.g. audio/webm or audio/mpeg).',
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({
        error: 'Voice transcription not configured',
        hint: 'Set OPENAI_API_KEY on the server to enable real-time voice notes.',
        code: 'OPENAI_API_KEY_REQUIRED',
      });
    }

    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const { Readable } = require('stream');
    const buffer = req.file.buffer;
    const stream = Readable.from(buffer);
    // Whisper expects a file-like with name; some environments need this for format detection
    stream.path = req.file.originalname || 'audio.webm';
    const transcription = await openai.audio.transcriptions.create({
      file: stream,
      model: 'whisper-1',
    });
    const text = (transcription && transcription.text) ? transcription.text.trim() : '';
    return res.json({ transcript: text || '(no speech detected)', mode: 'whisper' });
  } catch (e) {
    console.error('Voice transcribe error:', e.message);
    res.status(500).json({
      error: e.message || 'Transcription failed',
      hint: e.response ? 'Check audio format (WebM/MP3/WAV supported).' : undefined,
    });
  }
});

// POST /api/voice/create — create item/note from transcript (notes use transcript as-is; work items use GPT when key set)
router.post('/create', async (req, res) => {
  try {
    const { transcript, item_type = 'note', project_id, sprint_id, author_id } = req.body;
    if (!transcript || typeof transcript !== 'string') return res.status(400).json({ error: 'Transcript is required' });
    const text = transcript.trim();
    if (!text) return res.status(400).json({ error: 'Transcript is required' });
    if (item_type !== 'note') {
      if (!project_id) return res.status(400).json({ error: 'Select a project first' });
    }

    let result = null;

    if (item_type === 'note') {
      // Notes: always use the transcript as the note content (real-time, no GPT rewrite)
      const { rows } = await pool.query(
        `INSERT INTO log_entries(project_id,sprint_id,author_id,entry_type,content) VALUES($1,$2,$3,'voice',$4) RETURNING *`,
        [project_id || null, sprint_id || null, author_id || null, text]
      );
      result = { type: 'log', entry: rows[0] };
    } else {
      // Work items: use GPT to extract structure when API key is set
      if (process.env.OPENAI_API_KEY) {
        const OpenAI = require('openai');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: 'Extract a work item from the transcript. Return JSON: {"title":"...","description":"...","type":"task","priority":"medium","points":3}' },
            { role: 'user', content: text },
          ],
          response_format: { type: 'json_object' },
        });
        const parsed = JSON.parse(completion.choices[0].message.content);
        const { rows } = await pool.query(
          `INSERT INTO items(project_id,sprint_id,type,title,description,priority,points,status) VALUES($1,$2,$3,$4,$5,$6,$7,'not_started') RETURNING *`,
          [project_id, sprint_id || null, parsed.type || item_type, parsed.title || text.slice(0, 200), parsed.description || '', parsed.priority || 'medium', parsed.points || 3]
        );
        result = { type: 'item', item: rows[0] };
      } else {
        const title = text.slice(0, 500).trim() || 'Voice task';
        const itemType = (item_type === 'story' ? 'story' : 'task');
        const { rows } = await pool.query(
          `INSERT INTO items(project_id,sprint_id,type,title,description,priority,points,status) VALUES($1,$2,$3,$4,$5,'medium',3,'not_started') RETURNING *`,
          [project_id, sprint_id || null, itemType, title, text]
        );
        result = { type: 'item', item: rows[0] };
      }
    }

    try {
      await pool.query(
        `INSERT INTO voice_recordings(crew_id,transcript,item_type) VALUES($1,$2,$3)`,
        [author_id || null, text, item_type]
      );
    } catch (logErr) {
      console.warn('Voice recording log failed:', logErr.message);
    }

    res.status(201).json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
