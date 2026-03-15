-- One-time fix for activity_log missing columns (run in DB console if redeploy isn't enough)
-- Use when you see errors like "column a.entity_type does not exist" or "column a.details does not exist"

-- Add missing columns (safe to run multiple times; use IF NOT EXISTS where your PostgreSQL version supports it)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'activity_log' AND column_name = 'crew_id') THEN
    ALTER TABLE activity_log ADD COLUMN crew_id UUID REFERENCES crew(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'activity_log' AND column_name = 'entity_type') THEN
    ALTER TABLE activity_log ADD COLUMN entity_type VARCHAR(40) NOT NULL DEFAULT 'item';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'activity_log' AND column_name = 'entity_id') THEN
    ALTER TABLE activity_log ADD COLUMN entity_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'activity_log' AND column_name = 'details') THEN
    ALTER TABLE activity_log ADD COLUMN details JSONB DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'activity_log' AND column_name = 'user_id') THEN
    ALTER TABLE activity_log ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL;
    UPDATE activity_log a SET user_id = (SELECT c.user_id FROM crew c WHERE c.id = a.crew_id LIMIT 1) WHERE a.crew_id IS NOT NULL AND a.user_id IS NULL;
  END IF;
END $$;
