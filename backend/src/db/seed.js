const fs = require('fs');
const path = require('path');
if (process.env.DATABASE_URL && (process.env.DATABASE_URL.includes('ondigitalocean.com') || /sslmode=/.test(process.env.DATABASE_URL))) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}
const pool = require('./pool');

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('INSERT INTO workspaces (id, name, slug, icon) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING', ['a0000000-0000-0000-0000-000000000001', 'DigitalOcean RevOps', 'revops', '⚡']);
    await client.query(
      `INSERT INTO team_members (name, email, role, avatar, color) VALUES ('Raj K.', 'raj@example.com', 'Eng', 'RK', '#6366f1'), ('Sara K.', 'sara@example.com', 'PM', 'SK', '#8b5cf6'), ('Aman M.', 'aman@example.com', 'Dev', 'AM', '#059669'), ('Priya P.', 'priya@example.com', 'QA', 'PP', '#f59e0b') ON CONFLICT (email) DO NOTHING`
    );
    const { rows: teams } = await client.query('SELECT id FROM team_members LIMIT 1');
    const projectId = 'b0000000-0000-0000-0000-000000000001';
    await client.query(
      `INSERT INTO projects (id, workspace_id, name, description, color) VALUES ($1, 'a0000000-0000-0000-0000-000000000001', 'RevOps Initiative', 'Main RevOps project', '#6366f1') ON CONFLICT (id) DO NOTHING`,
      [projectId]
    );
    await client.query(
      `INSERT INTO sprints (id, project_id, name, goal, status, start_date, end_date, capacity) VALUES 
       ('c0000000-0000-0000-0000-000000000001', $1, 'Sprint 13', 'Q1 wrap', 'completed', '2026-02-01', '2026-02-14', 40),
       ('c0000000-0000-0000-0000-000000000002', $1, 'Sprint 14', 'Revenue Horizon', 'active', '2026-03-01', '2026-03-14', 42) ON CONFLICT (id) DO NOTHING`,
      [projectId]
    );
    const sprint14 = 'c0000000-0000-0000-0000-000000000002';
    const memberId = teams[0]?.id || 'd0000000-0000-0000-0000-000000000001';
    await client.query(
      `INSERT INTO work_items (project_id, sprint_id, type, title, status, priority, points, assignee_id) VALUES
       ($1, $2, 'story', 'Revenue dashboard', 'todo', 'high', 8, $3),
       ($1, $2, 'task', 'API auth', 'in_progress', 'medium', 3, $3),
       ($1, $2, 'bug', 'Login redirect', 'in_review', 'critical', 2, $3),
       ($1, $2, 'task', 'Docs update', 'done', 'low', 1, $3),
       ($1, $2, 'story', 'Billing export', 'backlog', 'medium', 5, $3)`,
      [projectId, sprint14, memberId]
    );
    await client.query(
      `INSERT INTO captain_log_entries (sprint_id, content, entry_type) VALUES ($1, 'Sprint 14 kicked off. Focus on revenue metrics.', 'note'), ($1, 'Voice note: discussed scope with PM.', 'voice'), ($1, 'AI summary: align with OKRs.', 'ai')`,
      [sprint14]
    );
    console.log('Helm seed data loaded.');
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}
seed();
