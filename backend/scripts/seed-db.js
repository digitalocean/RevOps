/**
 * Seed demo data for local testing.
 *
 *   node scripts/seed-db.js                       # seed for the most recently registered user
 *   node scripts/seed-db.js --email you@x.com     # seed for a specific user
 *   node scripts/seed-db.js --reset               # clear previously-seeded demo data first
 *
 * The script is idempotent — re-running without --reset is a no-op when demo
 * data already exists (we detect the "Meridian Demo" workspace slug).
 */

require('dotenv').config();
const { Pool } = require('pg');

const args = process.argv.slice(2);
const flagValue = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};
const hasFlag = (name) => args.includes(name);

const targetEmail = flagValue('--email');
const doReset = hasFlag('--reset');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: /sslmode=require/.test(process.env.DATABASE_URL || '')
    ? { rejectUnauthorized: false }
    : false,
});

const WORKSPACE_SLUG_PREFIX = 'meridian-demo';
const WORKSPACE_NAME = 'Meridian Demo';

/** Per-user slug so multiple demo users can coexist (slug is globally UNIQUE). */
function slugForUser(userId) {
  return `${WORKSPACE_SLUG_PREFIX}-${String(userId).replace(/-/g, '').slice(0, 12)}`;
}

const now = new Date();
const daysFromNow = (d) => {
  const dt = new Date(now);
  dt.setDate(dt.getDate() + d);
  return dt.toISOString().slice(0, 10);
};

async function findTargetUser(client) {
  if (targetEmail) {
    const { rows } = await client.query(
      'SELECT id, email, name FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [targetEmail]
    );
    if (!rows.length) throw new Error(`No user found with email ${targetEmail}. Register first at http://localhost:5173`);
    return rows[0];
  }
  const { rows } = await client.query(
    'SELECT id, email, name FROM users ORDER BY created_at DESC LIMIT 1'
  );
  if (!rows.length) throw new Error('No users in DB. Register a user at http://localhost:5173 first, then re-run this script.');
  return rows[0];
}

async function resetDemo(client, userId) {
  const { rows } = await client.query(
    `SELECT id FROM workspaces WHERE slug = $1 AND owner_id = $2`,
    [slugForUser(userId), userId]
  );
  if (!rows.length) return;
  const wsId = rows[0].id;
  // ON DELETE CASCADE on projects/crew/items handles the rest.
  await client.query('DELETE FROM workspaces WHERE id = $1', [wsId]);
  console.log(`   🧹 Removed previous demo workspace`);
}

async function seedWorkspace(client, user) {
  const slug = slugForUser(user.id);
  const existing = await client.query(
    'SELECT id FROM workspaces WHERE slug = $1 AND owner_id = $2',
    [slug, user.id]
  );
  if (existing.rows.length) {
    return { id: existing.rows[0].id, created: false };
  }
  const { rows } = await client.query(
    `INSERT INTO workspaces (name, slug, color, icon, owner_id) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [WORKSPACE_NAME, slug, '#6366f1', '🏔️', user.id]
  );
  return { id: rows[0].id, created: true };
}

async function seedCrew(client, workspaceId, user) {
  const ownerInitials = (user.name || user.email).slice(0, 2).toUpperCase();
  const shortId = String(user.id).replace(/-/g, '').slice(0, 8);
  // Suffix seeded crew emails with the owning user's short id so multiple demo users don't clash on crew.email UNIQUE.
  const demoEmail = (local) => `${local}+${shortId}@demo.meridian.app`;
  const members = [
    {
      user_id: user.id,
      name: user.name || user.email.split('@')[0],
      email: user.email,
      initials: ownerInitials,
      color: '#6366f1',
      role: 'Owner',
    },
    { user_id: null, name: 'Aria Chen',    email: demoEmail('aria'),   initials: 'AC', color: '#22c55e', role: 'Engineering Lead' },
    { user_id: null, name: 'Marcus Reed',  email: demoEmail('marcus'), initials: 'MR', color: '#f59e0b', role: 'Product Manager' },
    { user_id: null, name: 'Priya Sharma', email: demoEmail('priya'),  initials: 'PS', color: '#ec4899', role: 'Designer' },
    { user_id: null, name: 'Jordan Fox',   email: demoEmail('jordan'), initials: 'JF', color: '#0ea5e9', role: 'QA' },
  ];
  const inserted = [];
  for (const m of members) {
    const { rows } = await client.query(
      `INSERT INTO crew (workspace_id, user_id, name, email, initials, color, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (email) DO UPDATE SET workspace_id = EXCLUDED.workspace_id
       RETURNING id, name, email`,
      [workspaceId, m.user_id, m.name, m.email, m.initials, m.color, m.role]
    );
    inserted.push({ ...rows[0] });
  }
  return inserted;
}

async function seedProject(client, workspaceId, userId, ownerCrewId, spec) {
  const { rows } = await client.query(
    `INSERT INTO projects (workspace_id, name, description, color, owner_id, is_personal, created_by)
     VALUES ($1, $2, $3, $4, $5, false, $6) RETURNING id`,
    [workspaceId, spec.name, spec.description, spec.color, ownerCrewId, userId]
  );
  const projectId = rows[0].id;

  for (const [i, crewId] of spec.memberCrewIds.entries()) {
    await client.query(
      `INSERT INTO project_members (project_id, crew_id, role) VALUES ($1, $2, $3)
       ON CONFLICT (project_id, crew_id) DO NOTHING`,
      [projectId, crewId, i === 0 ? 'admin' : 'editor']
    );
  }

  const sprintRes = await client.query(
    `INSERT INTO sprints (project_id, name, goal, status, start_date, end_date, capacity)
     VALUES ($1, $2, $3, 'active', $4, $5, 40) RETURNING id`,
    [projectId, spec.sprint.name, spec.sprint.goal, daysFromNow(-3), daysFromNow(11)]
  );
  const sprintId = sprintRes.rows[0].id;

  const trackerIds = {};
  for (const [idx, t] of spec.trackers.entries()) {
    const tr = await client.query(
      `INSERT INTO trackers (project_id, name, icon, sort_order, created_by_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [projectId, t.name, t.icon || '📋', idx, userId]
    );
    trackerIds[t.name] = tr.rows[0].id;
  }

  let sortOrder = 0;
  for (const t of spec.trackers) {
    const trackerId = trackerIds[t.name];
    for (const item of t.items) {
      const assigneeCrewId = item.assignee && item.assignee !== 'unassigned'
        ? spec.memberCrewIds[item.assignee]
        : null;
      await client.query(
        `INSERT INTO items
           (project_id, sprint_id, tracker_id, type, title, description, status, priority, points,
            assignee_id, due_date, labels, category, progress, created_by_id, requester_id, sort_order, is_milestone)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
        [
          projectId,
          sprintId,
          trackerId,
          item.type || 'task',
          item.title,
          item.description || '',
          item.status || 'Not Started',
          item.priority || 'P1',
          item.points ?? 3,
          assigneeCrewId,
          item.due_date || null,
          item.labels || [],
          item.category || null,
          item.progress ?? 0,
          userId,
          userId,
          sortOrder++,
          !!item.is_milestone,
        ]
      );
    }
  }

  return { projectId, sprintId };
}

async function seedActivityAndNotifications(client, userId, projectId) {
  await client.query(
    `INSERT INTO activity_log (project_id, user_id, action, entity_type, entity_id, details)
     VALUES ($1, $2, 'project_created', 'project', $1, '{"seed": true}')`,
    [projectId, userId]
  );
  await client.query(
    `INSERT INTO notifications (user_id, type, title, body, project_id, read)
     VALUES
       ($1, 'due_soon', 'Tasks due this week', 'You have 3 tasks due in the next 7 days.', $2, false),
       ($1, 'mention', 'Aria mentioned you', 'In "Ability to Duplicate a Project" — can you take a look?', $2, false)`,
    [userId, projectId]
  );
}

async function main() {
  const client = await pool.connect();
  try {
    console.log('\n🏔  Meridian demo seed starting…');

    const user = await findTargetUser(client);
    console.log(`   ▶ Target user: ${user.name || '(no name)'} <${user.email}>`);

    await client.query('BEGIN');

    if (doReset) await resetDemo(client, user.id);

    const ws = await seedWorkspace(client, user);
    if (!ws.created) {
      console.log('   ℹ️  Demo workspace already exists — skipping. Use --reset to rebuild.\n');
      await client.query('ROLLBACK');
      return;
    }
    console.log(`   ✅ Created workspace "${WORKSPACE_NAME}"`);

    const crew = await seedCrew(client, ws.id, user);
    console.log(`   ✅ Created ${crew.length} crew members`);
    const crewIds = crew.map((c) => c.id);
    const ownerCrewId = crewIds[0];

    // ── Project 1: "Meridian Platform" — with trackers matching the user's screenshot
    const p1 = await seedProject(client, ws.id, user.id, ownerCrewId, {
      name: 'Meridian Platform',
      description: 'Core product roadmap & issue tracking.',
      color: '#6366f1',
      memberCrewIds: crewIds,
      sprint: { name: 'Sprint 7', goal: 'Polish dashboard + unblock Kanban.' },
      trackers: [
        {
          name: 'Feature Requests',
          icon: '✨',
          items: [
            { title: 'Ability to Duplicate a Project',                          category: 'Engineering',  priority: 'P0', status: 'Not Started', assignee: 0, due_date: daysFromNow(2),  progress: 10 },
            { title: 'Ability to create a recurring task',                       category: 'System Imp',   priority: 'P1', status: 'On Track',    assignee: 0, due_date: daysFromNow(6),  progress: 35 },
            { title: 'Create Form for Input into Tracker',                       category: 'Engineering',  priority: 'P1', status: 'Not Started', due_date: daysFromNow(9) },
            { title: 'Share a Project Link',                                     category: 'Engineering',  priority: 'P1', status: 'In Review',   assignee: 2, progress: 80 },
            { title: 'Ability to Sort the tasks',                                category: 'Engineering',  priority: 'P1', status: 'Not Started', due_date: daysFromNow(4) },
            { title: 'Everyone can see every Project of mine, Project RBAC is not working', category: 'Sales',        priority: 'P1', status: 'At Risk',     assignee: 1, due_date: daysFromNow(1),  progress: 25 },
            { title: 'Add the ability to name/rename links',                     category: 'Operations',   priority: 'P1', status: 'Not Started' },
            { title: 'In the [tracker] tab, add the ability to sort columns',    category: 'Engineering',  priority: 'P1', status: 'Not Started', due_date: daysFromNow(12) },
            { title: 'Add a column for "requester"',                             category: 'Product',      priority: 'P1', status: 'Not Started' },
            { title: 'Collaborator field to add one or more people working on the project', category: 'Product', priority: 'P1', status: 'Not Started' },
            { title: 'Report for new issues created this week',                  category: 'Operations',   priority: 'P1', status: 'Not Started', due_date: daysFromNow(7) },
            { title: '(similar to Jira) Add a "history" so we can see who created the project, who last updated it and when, who changed the status and when, etc.', category: 'Engineering', priority: 'P1', status: 'Not Started' },
            { title: 'Delete button to remove issues/projects',                  category: 'Engineering',  priority: 'P1', status: 'Not Started' },
          ],
        },
        {
          name: 'Tasks',
          icon: '✅',
          items: [
            { title: 'Expandable Input Column & Text Formatting',                category: 'Design',       priority: 'P1', status: 'Not Started', due_date: daysFromNow(6), progress: 0  },
            { title: 'Prioritization in DNA <> RevOps Projects broken',          category: 'Sales',        priority: 'P1', status: 'Not Started', due_date: daysFromNow(6), progress: 0  },
          ],
        },
        {
          name: 'Issues',
          icon: '🐛',
          items: [
            { title: 'My Tasks are universal, ideally, My task should only be at Project Level', category: 'Product',     priority: 'P0', status: 'Not Started', assignee: 0, due_date: daysFromNow(2) },
            { title: 'Categories should be Project Specific',                    category: 'Sales',        priority: 'P0', status: 'Not Started', assignee: 0, due_date: daysFromNow(3) },
            { title: 'Everyone can see every Project of mine, Project RBAC is not working', category: 'Product', priority: 'P1', status: 'Not Started', due_date: daysFromNow(5) },
            { title: '(similar to Jira) Add a "history" so we can see who created the project, who last updated it and when, who changed the status and when, etc.', category: 'Engineering', priority: 'P1', status: 'Not Started' },
          ],
        },
      ],
    });
    console.log(`   ✅ Project "Meridian Platform" — 3 trackers, 19 items`);

    // ── Project 2: "Q2 Launch Plan"
    await seedProject(client, ws.id, user.id, ownerCrewId, {
      name: 'Q2 Launch Plan',
      description: 'Cross-functional launch checklist.',
      color: '#f59e0b',
      memberCrewIds: crewIds.slice(0, 4),
      sprint: { name: 'Launch Sprint', goal: 'Ship v2 announcement + docs.' },
      trackers: [
        {
          name: 'Engineering',
          icon: '🛠',
          items: [
            { title: 'Backend API design',         category: 'Engineering', priority: 'P0', status: 'Complete',   progress: 100, assignee: 1 },
            { title: 'Database migrations',        category: 'Engineering', priority: 'P1', status: 'On Track',   progress: 60,  assignee: 1, due_date: daysFromNow(5) },
            { title: 'Unit test coverage ≥ 80%',   category: 'Engineering', priority: 'P2', status: 'Not Started', due_date: daysFromNow(14) },
            { title: 'Launch milestone — tag v2',  category: 'Engineering', priority: 'P0', status: 'Not Started', due_date: daysFromNow(14), is_milestone: true },
          ],
        },
        {
          name: 'Design',
          icon: '🎨',
          items: [
            { title: 'Wireframes',         category: 'Design', priority: 'P0', status: 'In Review', progress: 90,  assignee: 3 },
            { title: 'Component library',  category: 'Design', priority: 'P1', status: 'On Track',  progress: 45,  assignee: 3, due_date: daysFromNow(8) },
          ],
        },
        {
          name: 'Go-To-Market',
          icon: '📣',
          items: [
            { title: 'Launch copy',  category: 'Operations', priority: 'P1', status: 'Not Started', assignee: 2, due_date: daysFromNow(10) },
            { title: 'Sales deck',   category: 'Sales',      priority: 'P2', status: 'Not Started', assignee: 2, due_date: daysFromNow(12) },
          ],
        },
      ],
    });
    console.log(`   ✅ Project "Q2 Launch Plan" — 3 trackers, 8 items`);

    // ── Project 3: "Field Ops Tracker"
    await seedProject(client, ws.id, user.id, ownerCrewId, {
      name: 'Field Ops Tracker',
      description: 'Bugs and improvements from field reports.',
      color: '#22c55e',
      memberCrewIds: crewIds.slice(0, 3),
      sprint: { name: 'Week 18 Ops', goal: 'Close top 10 field-reported bugs.' },
      trackers: [
        {
          name: 'Bugs',
          icon: '🐞',
          items: [
            { title: 'Kanban card does not open drawer on click',   category: 'Engineering', priority: 'P0', status: 'Blocked',   assignee: 4, due_date: daysFromNow(-1), progress: 50 },
            { title: 'KPI bar does not live-update via WebSocket',  category: 'Engineering', priority: 'P0', status: 'On Track',  assignee: 1, due_date: daysFromNow(3) },
            { title: 'Mobile sidebar hamburger overlaps content',   category: 'Design',      priority: 'P1', status: 'In Review', assignee: 3, progress: 80 },
          ],
        },
        {
          name: 'Improvements',
          icon: '⚡',
          items: [
            { title: 'Drag-to-reorder tasks within section',        category: 'Product',  priority: 'P1', status: 'Complete',   progress: 100 },
            { title: 'Pomodoro focus timer logs time automatically', category: 'Product',  priority: 'P2', status: 'On Track',   progress: 40, assignee: 2, due_date: daysFromNow(9) },
            { title: 'Team workload view — assign from heatmap',    category: 'Operations', priority: 'P1', status: 'Not Started', due_date: daysFromNow(15) },
          ],
        },
      ],
    });
    console.log(`   ✅ Project "Field Ops Tracker" — 2 trackers, 6 items`);

    await seedActivityAndNotifications(client, user.id, p1.projectId);
    console.log(`   ✅ Seeded activity log + 2 notifications`);

    await client.query('COMMIT');
    console.log('\n🏔  Done. Refresh http://localhost:5173 to see the data.\n');
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('\n❌ Seed failed:', e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
