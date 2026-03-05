-- ============================================================
-- AgileOps — Delete ALL data (keep tables). Run before re-seeding.
-- Skips tables that don't exist (e.g. if schema wasn't run yet).
--
-- Ways to run this:
-- 1) CLI:  DATABASE_URL=... npm run db:reset   (from backend/)
-- 2) psql: psql "YOUR_DATABASE_URL" -f backend/src/db/reset.sql
-- 3) DO:   DigitalOcean → your DB → Connection details → "Console" → paste this file
-- 4) API:  POST /api/admin/reset with header X-Reset-Secret: YOUR_RESET_SECRET (set RESET_SECRET in env)
-- ============================================================

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'activity_log', 'item_labels', 'criteria', 'comments', 'approvers',
    'blockers', 'work_items', 'labels', 'sprints', 'projects', 'team_members', 'roles'
  ]
  LOOP
    BEGIN
      EXECUTE format('TRUNCATE %I CASCADE', t);
    EXCEPTION WHEN undefined_table THEN NULL;
    END;
  END LOOP;
END $$;
