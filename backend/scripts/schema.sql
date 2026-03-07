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
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workspaces')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'workspaces' AND column_name = 'owner_id') THEN
    ALTER TABLE workspaces ADD COLUMN owner_id UUID REFERENCES users(id) ON DELETE SET NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'projects')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'created_by') THEN
    ALTER TABLE projects ADD COLUMN created_by UUID REFERENCES users(id) ON DELETE SET NULL;
  END IF;
  -- User fields (spec)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'full_name') THEN
    ALTER TABLE users ADD COLUMN full_name VARCHAR(120);
    UPDATE users SET full_name = name WHERE full_name IS NULL AND name IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'is_verified') THEN
    ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT false;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'verification_token') THEN
    ALTER TABLE users ADD COLUMN verification_token VARCHAR(255);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'reset_token') THEN
    ALTER TABLE users ADD COLUMN reset_token VARCHAR(255);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'reset_token_expires_at') THEN
    ALTER TABLE users ADD COLUMN reset_token_expires_at TIMESTAMPTZ;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'last_login_at') THEN
    ALTER TABLE users ADD COLUMN last_login_at TIMESTAMPTZ;
  END IF;
  -- Items (spec: created_by, is_big_rock, position)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'items')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'items' AND column_name = 'created_by_id') THEN
    ALTER TABLE items ADD COLUMN created_by_id UUID REFERENCES users(id) ON DELETE SET NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'items')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'items' AND column_name = 'is_big_rock') THEN
    ALTER TABLE items ADD COLUMN is_big_rock BOOLEAN DEFAULT false;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'items')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'items' AND column_name = 'position') THEN
    ALTER TABLE items ADD COLUMN position INT DEFAULT 0;
  END IF;
  -- Trackers (spec: is_collapsed, created_by_id)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'trackers')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'trackers' AND column_name = 'is_collapsed') THEN
    ALTER TABLE trackers ADD COLUMN is_collapsed BOOLEAN DEFAULT false;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'trackers')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'trackers' AND column_name = 'created_by_id') THEN
    ALTER TABLE trackers ADD COLUMN created_by_id UUID REFERENCES users(id) ON DELETE SET NULL;
  END IF;
  -- Custom fields (spec: field_key, applies_to, options as JSONB)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'custom_fields')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'custom_fields' AND column_name = 'field_key') THEN
    ALTER TABLE custom_fields ADD COLUMN field_key VARCHAR(80);
    UPDATE custom_fields SET field_key = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '_', 'g')) WHERE field_key IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'custom_fields')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'custom_fields' AND column_name = 'applies_to') THEN
    ALTER TABLE custom_fields ADD COLUMN applies_to VARCHAR(30) DEFAULT 'task';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'custom_fields')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'custom_fields' AND column_name = 'project_id') THEN
    ALTER TABLE custom_fields ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'custom_fields')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'custom_fields' AND column_name = 'options_json') THEN
    ALTER TABLE custom_fields ADD COLUMN options_json JSONB DEFAULT '[]';
  END IF;
END $$;

-- SavedView (spec)
CREATE TABLE IF NOT EXISTS saved_views (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name          VARCHAR(120) NOT NULL,
  view_type     VARCHAR(40)  DEFAULT 'tracker',
  filters       JSONB        DEFAULT '{}',
  column_config JSONB        DEFAULT '{}',
  sort_config   JSONB        DEFAULT '{}',
  is_default    BOOLEAN      DEFAULT false,
  is_shared     BOOLEAN      DEFAULT false,
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(project_id, user_id, name)
);

CREATE INDEX IF NOT EXISTS saved_views_project_user ON saved_views(project_id, user_id);

-- CustomFieldValue (spec)
CREATE TABLE IF NOT EXISTS custom_field_values (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id       UUID REFERENCES items(id) ON DELETE CASCADE NOT NULL,
  field_id      UUID REFERENCES custom_fields(id) ON DELETE CASCADE NOT NULL,
  value_text    TEXT,
  value_number  DOUBLE PRECISION,
  value_date    DATE,
  value_boolean BOOLEAN,
  value_json    JSONB,
  updated_at    TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(task_id, field_id)
);

CREATE INDEX IF NOT EXISTS custom_field_values_task ON custom_field_values(task_id);
CREATE INDEX IF NOT EXISTS custom_field_values_field ON custom_field_values(field_id);

-- FieldNote (spec: dedicated notes per project)
CREATE TABLE IF NOT EXISTS field_notes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  author_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  title      VARCHAR(200),
  content    TEXT,
  tags       TEXT[]         DEFAULT '{}',
  created_at TIMESTAMPTZ    DEFAULT NOW(),
  updated_at TIMESTAMPTZ    DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS field_notes_project ON field_notes(project_id);
