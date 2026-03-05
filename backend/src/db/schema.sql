-- ============================================================
-- AgileOps — PostgreSQL Database Schema
-- Run this file once to create all tables.
-- ============================================================

-- Enable UUID support
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- TEAM MEMBERS (add/edit via the Team Members UI in the app)
CREATE TABLE IF NOT EXISTS team_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(255) NOT NULL UNIQUE,
  role        VARCHAR(100),
  avatar      VARCHAR(4),               -- initials, e.g. "RK"
  color       VARCHAR(7) DEFAULT '#6366f1',
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- PROJECTS
CREATE TABLE IF NOT EXISTS projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(150) NOT NULL,
  description TEXT,
  color       VARCHAR(7) DEFAULT '#7c6af7',
  status      VARCHAR(20) DEFAULT 'active'
              CHECK (status IN ('active','archived','paused')),
  owner_id    UUID REFERENCES team_members(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- SPRINTS
CREATE TABLE IF NOT EXISTS sprints (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  goal        TEXT,
  status      VARCHAR(20) DEFAULT 'planning'
              CHECK (status IN ('planning','active','completed','cancelled')),
  start_date  DATE,
  end_date    DATE,
  capacity    INTEGER DEFAULT 0,        -- total story points budgeted
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- LABELS (per-project tags)
CREATE TABLE IF NOT EXISTS labels (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID REFERENCES projects(id) ON DELETE CASCADE,
  name        VARCHAR(50) NOT NULL,
  color       VARCHAR(7) DEFAULT '#6b7280',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- WORK ITEMS (epics, stories, bugs, tasks)
CREATE TABLE IF NOT EXISTS work_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sprint_id   UUID REFERENCES sprints(id) ON DELETE SET NULL,
  parent_id   UUID REFERENCES work_items(id) ON DELETE SET NULL,
  type        VARCHAR(20) NOT NULL DEFAULT 'task'
              CHECK (type IN ('epic','story','bug','task')),
  title       VARCHAR(300) NOT NULL,
  description TEXT,
  status      VARCHAR(30) NOT NULL DEFAULT 'backlog'
              CHECK (status IN ('backlog','todo','in_progress','in_review','done')),
  priority    VARCHAR(20) NOT NULL DEFAULT 'medium'
              CHECK (priority IN ('critical','high','medium','low')),
  points      INTEGER DEFAULT 1,
  assignee_id UUID REFERENCES team_members(id) ON DELETE SET NULL,
  start_date  DATE,
  end_date    DATE,
  created_by  UUID REFERENCES team_members(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ITEM LABELS (one item can have many labels)
CREATE TABLE IF NOT EXISTS item_labels (
  item_id   UUID NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  label_id  UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, label_id)
);

-- ACCEPTANCE CRITERIA (checklist per item)
CREATE TABLE IF NOT EXISTS criteria (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     UUID NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  done        BOOLEAN DEFAULT false,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- COMMENTS
CREATE TABLE IF NOT EXISTS comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     UUID NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  author_id   UUID REFERENCES team_members(id) ON DELETE SET NULL,
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- APPROVERS (who needs to sign off on an item)
CREATE TABLE IF NOT EXISTS approvers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id      UUID NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  member_id    UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  status       VARCHAR(20) DEFAULT 'pending'
               CHECK (status IN ('pending','approved','rejected')),
  responded_at TIMESTAMPTZ,
  UNIQUE (item_id, member_id)
);

-- BLOCKERS (item A is blocked by item B)
CREATE TABLE IF NOT EXISTS blockers (
  item_id       UUID NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  blocked_by_id UUID NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, blocked_by_id)
);

-- ACTIVITY LOG (full audit trail)
CREATE TABLE IF NOT EXISTS activity_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     UUID REFERENCES work_items(id) ON DELETE CASCADE,
  project_id  UUID REFERENCES projects(id) ON DELETE CASCADE,
  sprint_id   UUID REFERENCES sprints(id) ON DELETE CASCADE,
  actor_id    UUID REFERENCES team_members(id) ON DELETE SET NULL,
  action      VARCHAR(50) NOT NULL,   -- e.g. 'status_changed', 'comment_added'
  payload     JSONB,                  -- extra data, e.g. {from:'todo', to:'done'}
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── INDEXES ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_work_items_project   ON work_items(project_id);
CREATE INDEX IF NOT EXISTS idx_work_items_sprint    ON work_items(sprint_id);
CREATE INDEX IF NOT EXISTS idx_work_items_assignee  ON work_items(assignee_id);
CREATE INDEX IF NOT EXISTS idx_work_items_status    ON work_items(status);
CREATE INDEX IF NOT EXISTS idx_criteria_item        ON criteria(item_id);
CREATE INDEX IF NOT EXISTS idx_comments_item        ON comments(item_id);
CREATE INDEX IF NOT EXISTS idx_activity_item        ON activity_log(item_id);
CREATE INDEX IF NOT EXISTS idx_activity_project     ON activity_log(project_id);

-- ─── AUTO-UPDATE updated_at ─────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_team_members_updated
    BEFORE UPDATE ON team_members FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END; $$;

DO $$ BEGIN
  CREATE TRIGGER trg_projects_updated
    BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END; $$;

DO $$ BEGIN
  CREATE TRIGGER trg_sprints_updated
    BEFORE UPDATE ON sprints FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END; $$;

DO $$ BEGIN
  CREATE TRIGGER trg_work_items_updated
    BEFORE UPDATE ON work_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END; $$;
