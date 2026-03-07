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
  requireUser,
};
