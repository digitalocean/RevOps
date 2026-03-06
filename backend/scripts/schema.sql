-- To-DO schema (run on server startup or via npm run db:init)
CREATE TABLE IF NOT EXISTS workspaces (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(120) NOT NULL,
  slug        VARCHAR(80)  UNIQUE NOT NULL,
  color       VARCHAR(20)  DEFAULT '#d4943a',
  icon        VARCHAR(10)  DEFAULT '⚡',
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(200) UNIQUE NOT NULL,
  name          VARCHAR(120),
  avatar_url    TEXT,
  google_id     VARCHAR(120) UNIQUE,
  password_hash VARCHAR(255),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crew (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  name        VARCHAR(120) NOT NULL,
  email       VARCHAR(200) UNIQUE,
  initials    VARCHAR(4)   NOT NULL,
  color       VARCHAR(20)  DEFAULT '#6366f1',
  role        VARCHAR(60)  DEFAULT 'Member',
  status      VARCHAR(20)  DEFAULT 'online',
  active      BOOLEAN      DEFAULT true,
  invite_sent_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name          VARCHAR(200) NOT NULL,
  description   TEXT,
  color         VARCHAR(20)  DEFAULT '#6366f1',
  status        VARCHAR(30)  DEFAULT 'active',
  owner_id      UUID REFERENCES crew(id),
  is_personal   BOOLEAN      DEFAULT false,
  created_at    TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID REFERENCES projects(id) ON DELETE CASCADE,
  crew_id     UUID REFERENCES crew(id) ON DELETE CASCADE,
  role        VARCHAR(40)  DEFAULT 'member',
  created_at  TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(project_id, crew_id)
);

CREATE TABLE IF NOT EXISTS activity_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID REFERENCES projects(id) ON DELETE CASCADE,
  crew_id     UUID REFERENCES crew(id) ON DELETE SET NULL,
  action      VARCHAR(40)  NOT NULL,
  entity_type VARCHAR(40)  NOT NULL,
  entity_id   UUID,
  details     JSONB        DEFAULT '{}',
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS activity_log_project_created ON activity_log(project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS board_columns (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID REFERENCES projects(id) ON DELETE CASCADE,
  name        VARCHAR(80)  NOT NULL,
  slug        VARCHAR(40)  NOT NULL,
  color       VARCHAR(20)  DEFAULT '#3d4a63',
  sort_order  INT          DEFAULT 0,
  is_done     BOOLEAN      DEFAULT false,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sprints (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID REFERENCES projects(id) ON DELETE CASCADE,
  name        VARCHAR(200) NOT NULL,
  goal        TEXT,
  status      VARCHAR(30)  DEFAULT 'active',
  start_date  DATE,
  end_date    DATE,
  capacity    INT          DEFAULT 40,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID REFERENCES projects(id) ON DELETE CASCADE,
  sprint_id   UUID REFERENCES sprints(id),
  parent_id   UUID REFERENCES items(id),
  type        VARCHAR(20)  DEFAULT 'task',
  title       VARCHAR(500) NOT NULL,
  description TEXT,
  status      VARCHAR(40)  DEFAULT 'backlog',
  column_id   UUID REFERENCES board_columns(id),
  priority    VARCHAR(20)  DEFAULT 'medium',
  points      INT          DEFAULT 3,
  assignee_id UUID REFERENCES crew(id),
  due_date    DATE,
  labels      TEXT[]       DEFAULT '{}',
  custom_vals JSONB        DEFAULT '{}',
  sort_order  INT          DEFAULT 0,
  created_at  TIMESTAMPTZ  DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS custom_fields (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  target      VARCHAR(30)  NOT NULL,
  name        VARCHAR(120) NOT NULL,
  field_type  VARCHAR(30)  DEFAULT 'text',
  options     TEXT[]       DEFAULT '{}',
  sort_order  INT          DEFAULT 0,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS column_prefs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id     UUID REFERENCES crew(id) ON DELETE CASCADE,
  project_id  UUID REFERENCES projects(id) ON DELETE CASCADE,
  visible_cols JSONB       DEFAULT '{}',
  created_at  TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(crew_id, project_id)
);

CREATE TABLE IF NOT EXISTS log_entries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID REFERENCES projects(id) ON DELETE CASCADE,
  sprint_id   UUID REFERENCES sprints(id),
  author_id   UUID REFERENCES crew(id),
  entry_type  VARCHAR(20)  DEFAULT 'note',
  content     TEXT         NOT NULL,
  voice_url   TEXT,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trackers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID REFERENCES projects(id) ON DELETE CASCADE,
  name        VARCHAR(120) NOT NULL,
  icon        VARCHAR(10)  DEFAULT '📋',
  columns     JSONB        DEFAULT '[]',
  sort_order  INT          DEFAULT 0,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tracker_rows (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracker_id  UUID REFERENCES trackers(id) ON DELETE CASCADE,
  data        JSONB        DEFAULT '{}',
  sort_order  INT          DEFAULT 0,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS voice_recordings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id     UUID REFERENCES crew(id),
  transcript  TEXT,
  item_type   VARCHAR(20),
  result_id   UUID,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS items_updated_at ON items;
CREATE TRIGGER items_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- Migrations: add columns to existing tables if missing (e.g. projects had no workspace_id)
DO $$
DECLARE
  first_workspace_id UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'projects')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'workspace_id') THEN
    ALTER TABLE projects ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
    SELECT id INTO first_workspace_id FROM workspaces LIMIT 1;
    IF first_workspace_id IS NOT NULL THEN
      UPDATE projects SET workspace_id = first_workspace_id WHERE workspace_id IS NULL;
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'items')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'trackers')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'items' AND column_name = 'tracker_id') THEN
    ALTER TABLE items ADD COLUMN tracker_id UUID REFERENCES trackers(id) ON DELETE SET NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'items')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'items' AND column_name = 'category') THEN
    ALTER TABLE items ADD COLUMN category VARCHAR(60);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crew')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'crew' AND column_name = 'user_id') THEN
    ALTER TABLE crew ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crew')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'crew' AND column_name = 'invite_sent_at') THEN
    ALTER TABLE crew ADD COLUMN invite_sent_at TIMESTAMPTZ;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'projects')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'is_personal') THEN
    ALTER TABLE projects ADD COLUMN is_personal BOOLEAN DEFAULT false;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activity_log')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'activity_log' AND column_name = 'crew_id') THEN
    ALTER TABLE activity_log ADD COLUMN crew_id UUID REFERENCES crew(id) ON DELETE SET NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'password_hash') THEN
    ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);
  END IF;
END $$;
