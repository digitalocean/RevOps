const router  = require('express').Router();
const { pool } = require('../server');
const multer  = require('multer');
const upload  = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

const DEMO_TRANSCRIPTS = [
  'Follow up with Aman — Opportunity rollup review is stalling. Consider breaking into smaller sub-stories.',
  'Create a task: Build the LWC bridge component that polls agent availability every 30 seconds.',
  'Log note: SOQL error root cause identified — account rollup trigger is not bulk-safe. Static cache pattern needed.',
  'Task: Update bogiefile configurations with new AWS account IDs and proxy settings for QA environment.',
];
let demoIdx = 0;

// POST /api/voice/transcribe — accepts audio blob
router.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    // Real transcription via OpenAI Whisper
    if (process.env.OPENAI_API_KEY) {
      const OpenAI = require('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const { Readable } = require('stream');
      const stream = Readable.from(req.file.buffer);
      stream.path = 'audio.webm';
      const transcription = await openai.audio.transcriptions.create({
        file: stream,
        model: 'whisper-1',
      });
      return res.json({ transcript: transcription.text, mode: 'whisper' });
    }

    // Demo mode fallback
    const transcript = DEMO_TRANSCRIPTS[demoIdx % DEMO_TRANSCRIPTS.length];
    demoIdx++;
    res.json({ transcript, mode: 'demo' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/voice/create — create item/note from transcript using GPT-4o
router.post('/create', async (req, res) => {
  try {
    const { transcript, item_type = 'note', project_id, sprint_id, author_id } = req.body;
    if (!transcript || !transcript.trim()) return res.status(400).json({ error: 'Transcript is required' });
    if (item_type !== 'note') {
      if (!project_id) return res.status(400).json({ error: 'Select a project first' });
    }

    let result = null;

    if (process.env.OPENAI_API_KEY) {
      const OpenAI = require('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const systemPrompt = item_type === 'note'
        ? 'Extract a clean, concise log note from the transcript. Return JSON: {"content": "..."}'
        : `Extract a work item from the transcript. Return JSON: {"title":"...","description":"...","type":"task","priority":"medium","points":3}`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: transcript },
        ],
        response_format: { type: 'json_object' },
      });

      const parsed = JSON.parse(completion.choices[0].message.content);

      if (item_type === 'note') {
        const { rows } = await pool.query(
          `INSERT INTO log_entries(project_id,sprint_id,author_id,entry_type,content) VALUES($1,$2,$3,'ai',$4) RETURNING *`,
          [project_id, sprint_id, author_id, parsed.content || transcript]
        );
        result = { type: 'log', entry: rows[0] };
      } else {
        const { rows } = await pool.query(
          `INSERT INTO items(project_id,sprint_id,type,title,description,priority,points,status) VALUES($1,$2,$3,$4,$5,$6,$7,'backlog') RETURNING *`,
          [project_id, sprint_id || null, parsed.type || item_type, parsed.title, parsed.description, parsed.priority || 'medium', parsed.points || 3]
        );
        result = { type: 'item', item: rows[0] };
      }
    } else {
      // Demo mode — save as log or require project/sprint for item
      if (item_type === 'note') {
        const { rows } = await pool.query(
          `INSERT INTO log_entries(project_id,sprint_id,author_id,entry_type,content) VALUES($1,$2,$3,'voice',$4) RETURNING *`,
          [project_id || null, sprint_id || null, author_id, transcript]
        );
        result = { type: 'log', entry: rows[0], mode: 'demo' };
      } else {
        const title = transcript.slice(0, 500).trim() || 'Voice task';
        const itemType = (item_type === 'story' ? 'story' : 'task');
        const { rows } = await pool.query(
          `INSERT INTO items(project_id,sprint_id,type,title,description,priority,points,status) VALUES($1,$2,$3,$4,$5,'medium',3,'backlog') RETURNING *`,
          [project_id, sprint_id || null, itemType, title, transcript]
        );
        result = { type: 'item', item: rows[0], mode: 'demo' };
      }
    }

    // Save voice recording record
    await pool.query(
      `INSERT INTO voice_recordings(crew_id,transcript,item_type) VALUES($1,$2,$3)`,
      [author_id, transcript, item_type]
    );

    res.status(201).json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
