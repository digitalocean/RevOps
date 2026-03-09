const router = require('express').Router();
const { pool } = require('../server');
const { requireUser, getAccessibleProjectIds } = require('../lib/access');

// GET /api/templates
router.get('/', async (req, res) => {
  try {
    requireUser(req, res);
    const { rows } = await pool.query({
      name: 'templates_list',
      text: 'SELECT * FROM project_templates ORDER BY name ASC',
      values: [],
    });
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/templates — create a new template (from uploaded sheet or manual)
router.post('/', async (req, res) => {
  try {
    requireUser(req, res);
    const { name, description, icon, trackers } = req.body;
    if (!name || !trackers || !Array.isArray(trackers)) {
      return res.status(400).json({ error: 'name and trackers (array) required' });
    }
    const trackersJson = JSON.stringify(trackers.map((t) => ({
      name: t.name || 'Section',
      tasks: Array.isArray(t.tasks) ? t.tasks.map((task) => ({
        title: task.title || 'Task',
        status: task.status || 'Not Started',
        priority: task.priority || 'P1',
      })) : [],
    })));
    const { rows } = await pool.query({
      name: 'templates_insert',
      text: 'INSERT INTO project_templates (name, description, icon, trackers) VALUES ($1, $2, $3, $4::jsonb) RETURNING *',
      values: [name.trim(), description || null, icon || '📋', trackersJson],
    });
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/projects/:id/apply-template — create sections (trackers) only, no task rows
router.post('/projects/:id/apply-template', async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const { template_id } = req.body;
    if (!template_id) return res.status(400).json({ error: 'template_id required' });

    const projectId = req.params.id;
    const allowedProjectIds = await getAccessibleProjectIds(pool, userId);
    if (!allowedProjectIds.some(id => String(id) === String(projectId))) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }

    const tmpl = await pool.query({
      name: 'templates_get_one',
      text: 'SELECT * FROM project_templates WHERE id=$1',
      values: [template_id],
    });
    if (!tmpl.rows.length) return res.status(404).json({ error: 'Template not found' });

    const trackers = tmpl.rows[0].trackers || [];
    const created = [];

    for (const tracker of trackers) {
      await pool.query({
        name: 'templates_tracker_insert',
        text: 'INSERT INTO trackers(project_id, name) VALUES($1,$2) RETURNING *',
        values: [projectId, tracker.name],
      });
      created.push(tracker.name);
    }

    res.json({ ok: true, created });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
