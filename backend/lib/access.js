/**
 * User-based access: which workspaces and projects the current user can see.
 * - Workspaces: user owns (owner_id) OR is a crew member (crew.user_id).
 * - Projects: in an accessible workspace AND (not personal OR created_by = user).
 */

async function getAccessibleWorkspaceIds(pool, userId) {
  if (!userId) return [];
  const { rows } = await pool.query(
    `SELECT id FROM workspaces
     WHERE owner_id = $1
     UNION
     SELECT workspace_id AS id FROM crew WHERE user_id = $1`,
    [userId, userId]
  );
  return rows.map((r) => r.id);
}

/** Get or create a single default workspace for the user (used when UI has no workspace concept). */
async function getOrCreateDefaultWorkspaceId(pool, userId) {
  if (!userId) return null;
  let { rows } = await pool.query('SELECT id FROM workspaces WHERE owner_id = $1 ORDER BY created_at LIMIT 1', [userId]);
  if (rows.length > 0) return rows[0].id;
  const slug = 'my-workspace-' + String(userId).replace(/-/g, '').slice(0, 12);
  const { rows: inserted } = await pool.query(
    `INSERT INTO workspaces (name, slug, owner_id) VALUES ($1, $2, $3) RETURNING id`,
    ['My Workspace', slug, userId]
  );
  return inserted[0]?.id ?? null;
}

async function getAccessibleProjectIds(pool, userId) {
  if (!userId) return [];
  const workspaceIds = await getAccessibleWorkspaceIds(pool, userId);
  if (workspaceIds.length === 0) return [];
  const placeholders = workspaceIds.map((_, i) => `$${i + 1}`).join(',');
  const { rows } = await pool.query(
    `SELECT id FROM projects
     WHERE workspace_id IN (${placeholders})
     AND (is_personal = false OR created_by = $${workspaceIds.length + 1})`,
    [...workspaceIds, userId]
  );
  return rows.map((r) => r.id);
}

function requireUser(req, res) {
  if (!req.user || !req.user.id) {
    res.status(401).json({ error: 'Sign in required' });
    return null;
  }
  return req.user.id;
}

module.exports = {
  getAccessibleWorkspaceIds,
  getAccessibleProjectIds,
  getOrCreateDefaultWorkspaceId,
  requireUser,
};
