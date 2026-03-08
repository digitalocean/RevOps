const router = require('express').Router();
const { pool } = require('../server');
const { requireUser, getAccessibleProjectIds } = require('../lib/access');

// GET /api/templates
router.get('/', async (req, res) => {
  try {
    requireUser(req, res);  // auth check but no project scoping needed
    const { rows } = await pool.query('SELECT * FROM project_templates ORDER BY name ASC');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/projects/:id/apply-template — applies a template's trackers+tasks to a project (only for users with access)
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

    const tmpl = await pool.query('SELECT * FROM project_templates WHERE id=$1', [template_id]);
    if (!tmpl.rows.length) return res.status(404).json({ error: 'Template not found' });

    const trackers = tmpl.rows[0].trackers || [];
    const created = [];

    for (const tracker of trackers) {
      // Create tracker
      const tr = await pool.query(
        'INSERT INTO trackers(project_id, name) VALUES($1,$2) RETURNING *',
        [projectId, tracker.name]
      );
      const trackerId = tr.rows[0].id;

      // Create tasks
      const tasks = tracker.tasks || [];
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        const statusMap = {
          'Not Started': 'not_started', 'On Track': 'in_progress',
          'At Risk': 'at_risk', 'Complete': 'done', 'Blocked': 'blocked',
          'In Review': 'in_review',
        };
        const priorityMap = { 'P0': 'critical', 'P1': 'high', 'P2': 'medium' };
        await pool.query(
          `INSERT INTO items(project_id, tracker_id, title, status, priority, sort_order)
           VALUES($1,$2,$3,$4,$5,$6)`,
          [
            projectId, trackerId, task.title,
            statusMap[task.status] || 'not_started',
            priorityMap[task.priority] || 'medium',
            i,
          ]
        );
      }
      created.push(tracker.name);
    }

    res.json({ ok: true, created });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
