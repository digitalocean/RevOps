-- Helm — PostgreSQL Schema
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Workspaces (top-level, maps to topbar "RevOps" / "Platform" etc.)
CREATE TABLE IF NOT EXISTS workspaces (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(50) UNIQUE NOT NULL,
  color       VARCHAR(7),
  icon        VARCHAR(10),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Team members
CREATE TABLE IF NOT EXISTS team_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(255) UNIQUE NOT NULL,
  role        VARCHAR(100),
  avatar      VARCHAR(4),
  color       VARCHAR(7) DEFAULT '#6366f1',
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Projects (Fleets)
CREATE TABLE IF NOT EXISTS projects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  name          VARCHAR(100) NOT NULL,
  description   TEXT,
  color         VARCHAR(7),
  status        VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','archived','paused')),
  owner_id      UUID REFERENCES team_members(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Sprints (Voyages)
CREATE TABLE IF NOT EXISTS sprints (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  goal        TEXT,
  status      VARCHAR(20) DEFAULT 'planning' CHECK (status IN ('planning','active','completed','cancelled')),
  start_date  DATE,
  end_date    DATE,
  capacity    INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Work items (Anchors)
CREATE TABLE IF NOT EXISTS work_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sprint_id    UUID REFERENCES sprints(id) ON DELETE SET NULL,
  parent_id    UUID REFERENCES work_items(id) ON DELETE SET NULL,
  type         VARCHAR(20) DEFAULT 'task' CHECK (type IN ('epic','story','bug','task')),
  title        VARCHAR(500) NOT NULL,
  description  TEXT,
  status       VARCHAR(20) DEFAULT 'backlog' CHECK (status IN ('backlog','todo','in_progress','in_review','done')),
  priority     VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('critical','high','medium','low')),
  points       INTEGER DEFAULT 1,
  assignee_id  UUID REFERENCES team_members(id) ON DELETE SET NULL,
  start_date   DATE,
  end_date     DATE,
  created_by   UUID REFERENCES team_members(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Labels
CREATE TABLE IF NOT EXISTS labels (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID REFERENCES projects(id) ON DELETE CASCADE,
  name        VARCHAR(50) NOT NULL,
  color       VARCHAR(7) DEFAULT '#6b7280',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS item_labels (
  item_id   UUID NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  label_id  UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, label_id)
);

-- Criteria, comments, approvers, blockers
CREATE TABLE IF NOT EXISTS criteria (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     UUID NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  done        BOOLEAN DEFAULT false,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     UUID NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  author_id   UUID REFERENCES team_members(id) ON DELETE SET NULL,
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS approvers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id      UUID NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  member_id    UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  status       VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  responded_at TIMESTAMPTZ,
  UNIQUE (item_id, member_id)
);

CREATE TABLE IF NOT EXISTS blockers (
  item_id       UUID NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  blocked_by_id UUID NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, blocked_by_id)
);

-- Trackers (multi-tab sheet)
CREATE TABLE IF NOT EXISTS trackers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  icon        VARCHAR(10),
  columns     JSONB DEFAULT '[]',
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tracker_rows (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracker_id  UUID NOT NULL REFERENCES trackers(id) ON DELETE CASCADE,
  data        JSONB DEFAULT '{}',
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Captain's Log
CREATE TABLE IF NOT EXISTS captain_log_entries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID REFERENCES projects(id) ON DELETE SET NULL,
  sprint_id   UUID REFERENCES sprints(id) ON DELETE SET NULL,
  author_id   UUID REFERENCES team_members(id) ON DELETE SET NULL,
  content     TEXT NOT NULL,
  entry_type  VARCHAR(20) DEFAULT 'note' CHECK (entry_type IN ('note','voice','ai')),
  voice_url   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Activity log
CREATE TABLE IF NOT EXISTS activity_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     UUID REFERENCES work_items(id) ON DELETE CASCADE,
  project_id  UUID REFERENCES projects(id) ON DELETE CASCADE,
  sprint_id   UUID REFERENCES sprints(id) ON DELETE CASCADE,
  actor_id    UUID REFERENCES team_members(id) ON DELETE SET NULL,
  action      VARCHAR(50) NOT NULL,
  payload     JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_work_items_project   ON work_items(project_id);
CREATE INDEX IF NOT EXISTS idx_work_items_sprint   ON work_items(sprint_id);
CREATE INDEX IF NOT EXISTS idx_work_items_assignee ON work_items(assignee_id);
CREATE INDEX IF NOT EXISTS idx_work_items_status   ON work_items(status);
CREATE INDEX IF NOT EXISTS idx_trackers_project    ON trackers(project_id);
CREATE INDEX IF NOT EXISTS idx_tracker_rows_tracker ON tracker_rows(tracker_id);
CREATE INDEX IF NOT EXISTS idx_captain_log_sprint   ON captain_log_entries(sprint_id);

-- updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN CREATE TRIGGER trg_team_members_updated BEFORE UPDATE ON team_members FOR EACH ROW EXECUTE PROCEDURE update_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END; $$;
DO $$ BEGIN CREATE TRIGGER trg_projects_updated BEFORE UPDATE ON projects FOR EACH ROW EXECUTE PROCEDURE update_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END; $$;
DO $$ BEGIN CREATE TRIGGER trg_sprints_updated BEFORE UPDATE ON sprints FOR EACH ROW EXECUTE PROCEDURE update_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END; $$;
DO $$ BEGIN CREATE TRIGGER trg_work_items_updated BEFORE UPDATE ON work_items FOR EACH ROW EXECUTE PROCEDURE update_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END; $$;
DO $$ BEGIN CREATE TRIGGER trg_tracker_rows_updated BEFORE UPDATE ON tracker_rows FOR EACH ROW EXECUTE PROCEDURE update_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END; $$;
