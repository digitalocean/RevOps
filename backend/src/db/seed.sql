-- ============================================================
-- AgileOps — Sample Seed Data
-- Run AFTER schema.sql to load example data.
-- ============================================================

-- Team Members
INSERT INTO team_members (id, name, email, role, avatar, color) VALUES
  ('11111111-0000-0000-0000-000000000001', 'Raj K.',   'raj@company.com',   'Lead Developer',   'RK', '#6366f1'),
  ('11111111-0000-0000-0000-000000000002', 'Sara K.',  'sara@company.com',  'Product Manager',  'SK', '#8b5cf6'),
  ('11111111-0000-0000-0000-000000000003', 'Aman M.',  'aman@company.com',  'DevOps Engineer',  'AM', '#059669'),
  ('11111111-0000-0000-0000-000000000004', 'Priya P.', 'priya@company.com', 'Data Analyst',     'PP', '#f59e0b')
ON CONFLICT (email) DO NOTHING;

-- Projects
INSERT INTO projects (id, name, description, color, status, owner_id) VALUES
  ('22222222-0000-0000-0000-000000000001', 'RevOps Initiative',   'Revenue operations tooling and Salesforce integrations', '#7c6af7', 'active',   '11111111-0000-0000-0000-000000000001'),
  ('22222222-0000-0000-0000-000000000002', 'Experience Cloud',    'Customer portal and messaging infrastructure',           '#8b5cf6', 'active',   '11111111-0000-0000-0000-000000000002'),
  ('22222222-0000-0000-0000-000000000003', 'Infrastructure',      'DO App Platform, PostgreSQL, SNS topics',               '#059669', 'active',   '11111111-0000-0000-0000-000000000003')
ON CONFLICT DO NOTHING;

-- Sprints
INSERT INTO sprints (id, project_id, name, goal, status, start_date, end_date, capacity) VALUES
  ('33333333-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001',
   'Sprint 14', 'Ship Messaging for Web v2 + fix P0 routing bug', 'active', '2026-03-01', '2026-03-14', 42)
ON CONFLICT DO NOTHING;

-- Labels
INSERT INTO labels (id, project_id, name, color) VALUES
  ('44444444-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'Salesforce',   '#0ea5e9'),
  ('44444444-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000001', 'LWC',          '#8b5cf6'),
  ('44444444-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000001', 'Apex',         '#2dd4a0'),
  ('44444444-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000001', 'P0 Bug',       '#f25f5c'),
  ('44444444-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000001', 'Omni-Channel', '#f5a623')
ON CONFLICT DO NOTHING;

-- Work Items
INSERT INTO work_items (id, project_id, sprint_id, type, title, description, status, priority, points, assignee_id, start_date, end_date) VALUES
  ('55555555-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001',
   'epic', 'Messaging for Web v2',
   'Full migration from legacy Embedded Service Chat to Messaging for Web.',
   'in_progress', 'high', 13, '11111111-0000-0000-0000-000000000001', '2026-03-01', '2026-03-12'),

  ('55555555-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001',
   'story', 'Agent availability detection LWC',
   'LWC bridge component polling Apex every 30s to detect online agents.',
   'in_progress', 'high', 8, '11111111-0000-0000-0000-000000000001', '2026-03-01', '2026-03-07'),

  ('55555555-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001',
   'bug', 'Omni-Channel routing fails Tier 2',
   'Cases from Tier 2 accounts route to wrong queue. SMTP keywords missing.',
   'todo', 'critical', 3, '11111111-0000-0000-0000-000000000002', '2026-03-03', '2026-03-06'),

  ('55555555-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001',
   'task', 'PostgreSQL cluster setup on DO',
   'Provision Managed PostgreSQL 15 on DigitalOcean nyc3.',
   'todo', 'medium', 2, '11111111-0000-0000-0000-000000000003', '2026-03-04', '2026-03-05'),

  ('55555555-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001',
   'story', 'Custom pre-chat LWC form',
   'Branded pre-chat form capturing Name, Email, Subject and Account Type.',
   'in_review', 'medium', 5, '11111111-0000-0000-0000-000000000001', '2026-03-01', '2026-03-08'),

  ('55555555-0000-0000-0000-000000000006', '22222222-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001',
   'story', 'SNS topic migration to QA',
   'Migrate auto-panda SNS topics from prod to QA account.',
   'done', 'low', 3, '11111111-0000-0000-0000-000000000002', '2026-03-01', '2026-03-03'),

  ('55555555-0000-0000-0000-000000000007', '22222222-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001',
   'story', 'RevOps opportunity rollup system',
   'Batch Apex architecture for opportunity hierarchy rollup.',
   'done', 'medium', 8, '11111111-0000-0000-0000-000000000004', '2026-03-01', '2026-03-05')
ON CONFLICT DO NOTHING;

-- Item Labels
INSERT INTO item_labels (item_id, label_id) VALUES
  ('55555555-0000-0000-0000-000000000001','44444444-0000-0000-0000-000000000001'),
  ('55555555-0000-0000-0000-000000000002','44444444-0000-0000-0000-000000000001'),
  ('55555555-0000-0000-0000-000000000002','44444444-0000-0000-0000-000000000002'),
  ('55555555-0000-0000-0000-000000000003','44444444-0000-0000-0000-000000000004'),
  ('55555555-0000-0000-0000-000000000003','44444444-0000-0000-0000-000000000005'),
  ('55555555-0000-0000-0000-000000000005','44444444-0000-0000-0000-000000000001'),
  ('55555555-0000-0000-0000-000000000005','44444444-0000-0000-0000-000000000002'),
  ('55555555-0000-0000-0000-000000000007','44444444-0000-0000-0000-000000000001'),
  ('55555555-0000-0000-0000-000000000007','44444444-0000-0000-0000-000000000003')
ON CONFLICT DO NOTHING;

-- Blockers
INSERT INTO blockers (item_id, blocked_by_id) VALUES
  ('55555555-0000-0000-0000-000000000003','55555555-0000-0000-0000-000000000002')
ON CONFLICT DO NOTHING;

-- Criteria
INSERT INTO criteria (item_id, text, done, sort_order) VALUES
  ('55555555-0000-0000-0000-000000000002','Apex controller exposes availability endpoint',        true,  1),
  ('55555555-0000-0000-0000-000000000002','LWC polls every 30s without memory leaks',             true,  2),
  ('55555555-0000-0000-0000-000000000002','Button hides when 0 agents online',                   false, 3),
  ('55555555-0000-0000-0000-000000000002','Unit test coverage >= 85%',                            false, 4),
  ('55555555-0000-0000-0000-000000000005','All fields saved to MessagingSession',                 true,  1),
  ('55555555-0000-0000-0000-000000000005','Authenticated user fields auto-populated',             true,  2),
  ('55555555-0000-0000-0000-000000000005','Mobile responsive across all breakpoints',             true,  3),
  ('55555555-0000-0000-0000-000000000003','Reproduced consistently in sandbox',                   true,  1),
  ('55555555-0000-0000-0000-000000000003','Root cause documented',                               false, 2),
  ('55555555-0000-0000-0000-000000000003','Fix verified in UAT',                                 false, 3);

-- Comments
INSERT INTO comments (item_id, author_id, body, created_at) VALUES
  ('55555555-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000002',
   'DOM observer logic looks great! What about disconnectedCallback cleanup?', '2026-03-03T14:22:00Z'),
  ('55555555-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000001',
   'Good catch — cleanup added and pushed to feature/agent-avail branch.', '2026-03-03T14:45:00Z');

-- Approvers
INSERT INTO approvers (item_id, member_id, status) VALUES
  ('55555555-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000002','approved'),
  ('55555555-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000003','pending'),
  ('55555555-0000-0000-0000-000000000005','11111111-0000-0000-0000-000000000002','approved')
ON CONFLICT DO NOTHING;
