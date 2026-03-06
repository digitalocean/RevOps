# Meridian database schema

Schema is in **`backend/scripts/schema.sql`**. It runs **automatically on API startup** (with retry at 2s and 5s if the DB is not ready). You can also run it once manually with **`cd backend && npm run db:init`** (requires `DATABASE_URL` in `backend/.env`).

- **Health:** `GET /api/health` returns `db: 'connected'` and `schema: true` when the DB is ready.
- **Manual schema run:** `GET /api/db/ensure` runs the schema and returns `{ ok, schema }`.

## Tables (order matters for FKs)

| Table | Purpose |
|-------|---------|
| **workspaces** | Top-level container; has `name`, `slug`. |
| **crew** | Team members; optional `workspace_id`. |
| **projects** | Campaigns; `workspace_id` (nullable). |
| **board_columns** | Kanban columns per project. |
| **sprints** | Expeditions; `project_id`. |
| **items** | Work items; `project_id`, `sprint_id`, `column_id`, `assignee_id` (all nullable except `project_id`). |
| **custom_fields** | Custom field definitions; `workspace_id`. |
| **column_prefs** | Per-user column visibility. |
| **log_entries** | Captain's log; `project_id`, `sprint_id`, `author_id`. |
| **trackers** | Field-note trackers; `project_id`. |
| **tracker_rows** | Rows in a tracker. |
| **voice_recordings** | Voice log metadata. |

## Bootstrap (on first run)

When the schema runs, it **only creates tables**. No seed data is inserted. Create your first workspace from the app (topbar → “New team”).

No projects or sprints are created. Create workspaces (sidebar “+” under Workspaces), then projects (header “+” tabs), then add initiatives (Quick Actions → New Initiative) from the UI.

## Wiping all data

To start from scratch (e.g. in production), run in order (e.g. via `psql` or a DB client):

```sql
TRUNCATE voice_recordings, tracker_rows, trackers, log_entries, column_prefs, items, board_columns, sprints, projects, custom_fields, crew, workspaces RESTART IDENTITY CASCADE;
```

Then restart the API (or call `GET /api/db/ensure`). Create a workspace from the app (topbar → “New team”) to get started.

## If data is not persisting

1. **Check health:** `GET /api/health` should return `db: 'connected'` and ideally `schema: true`. If `schema: false`, the schema did not run (e.g. DB was not ready).
2. **Trigger schema:** Open `GET /api/db/ensure` in the browser or call it once; then reload the app and create data again.
3. **DigitalOcean:** Ensure the **api** component has **DATABASE_URL** set (from the linked database). Without it, the API cannot connect and no data is stored.
4. **Frontend:** Ensure the app is calling your deployed API (check **VITE_API_URL** for the web build). If the UI points at the wrong origin, requests may hit a different backend or fail.
