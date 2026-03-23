/**
 * User-based access: which workspaces and projects the current user can see.
 * Once signed in, users see only their data and what has been shared with them.
 *
 * - Workspaces: user owns (owner_id) OR is a crew member (crew.user_id).
 * - Projects: in an accessible workspace; personal projects only if created_by = user.
 *   So: "their projects" = owned/member workspaces; "shared" = non-personal projects in those workspaces.
 */

async function getAccessibleWorkspaceIds(pool, userId) {
  if (!userId) return [];
  const { rows } = await pool.query({
    name: 'access_workspace_ids',
    text: `SELECT id FROM workspaces WHERE owner_id = $1 UNION SELECT workspace_id AS id FROM crew WHERE user_id = $1`,
    values: [userId],
  });
  return rows.map((r) => r.id);
}

/** Get or create a single default workspace for the user (used when UI has no workspace concept). */
async function getOrCreateDefaultWorkspaceId(pool, userId) {
  if (!userId) return null;
  let { rows } = await pool.query({
    name: 'access_workspace_by_owner',
    text: 'SELECT id FROM workspaces WHERE owner_id = $1 ORDER BY created_at LIMIT 1',
    values: [userId],
  });
  if (rows.length > 0) return rows[0].id;
  const slug = 'my-workspace-' + String(userId).replace(/-/g, '').slice(0, 12);
  const { rows: inserted } = await pool.query({
    name: 'access_workspace_insert',
    text: 'INSERT INTO workspaces (name, slug, owner_id) VALUES ($1, $2, $3) RETURNING id',
    values: ['My Workspace', slug, userId],
  });
  return inserted[0]?.id ?? null;
}

async function getAccessibleProjectIds(pool, userId) {
  if (!userId) return [];
  const workspaceIds = await getAccessibleWorkspaceIds(pool, userId);
  const projectIdsFromWorkspace = [];
  if (workspaceIds.length > 0) {
    const placeholders = workspaceIds.map((_, i) => `$${i + 1}`).join(',');
    // Statement name must vary with IN (...) length — pg caches prepared statements by name per connection.
    const { rows } = await pool.query({
      name: `access_projects_by_workspace_n${workspaceIds.length}`,
      text: `SELECT id FROM projects WHERE workspace_id IN (${placeholders}) AND (is_personal = false OR created_by = $${workspaceIds.length + 1})`,
      values: [...workspaceIds, userId],
    });
    projectIdsFromWorkspace.push(...rows.map((r) => r.id));
  }
  // Shared projects: crew.user_id matches OR crew was invited by email before SSO linked (same email as users row).
  const { rows: sharedRows } = await pool.query({
    name: 'access_projects_shared',
    text: `SELECT DISTINCT pm.project_id AS id
           FROM project_members pm
           INNER JOIN crew c ON c.id = pm.crew_id
           WHERE c.user_id = $1
             AND (c.active = true OR c.active IS NULL)
           UNION
           SELECT DISTINCT pm.project_id AS id
           FROM project_members pm
           INNER JOIN crew c ON c.id = pm.crew_id
           INNER JOIN users u ON u.id = $1
           WHERE c.user_id IS NULL
             AND c.email IS NOT NULL
             AND u.email IS NOT NULL
             AND LOWER(TRIM(c.email)) = LOWER(TRIM(u.email))
             AND (c.active = true OR c.active IS NULL)`,
    values: [userId],
  });
  const sharedIds = sharedRows.map((r) => r.id);
  const combined = [...new Set([...projectIdsFromWorkspace.map(String), ...sharedIds.map(String)])];
  return combined;
}

/**
 * After SSO login, attach crew rows invited by email so project_members resolves by user_id too.
 */
/**
 * Project Share role **admin** only (not moderator/editor). Uses crew.user_id or email match to users.
 */
async function isProjectAdminRoleOnly(pool, userId, projectId) {
  if (!userId || !projectId) return false;
  const { rows } = await pool.query({
    name: 'access_project_admin_role',
    text: `SELECT 1 FROM project_members pm
           INNER JOIN crew c ON c.id = pm.crew_id
           WHERE pm.project_id = $1
             AND pm.role = 'admin'
             AND (c.active = true OR c.active IS NULL)
             AND (
               c.user_id = $2
               OR (
                 c.user_id IS NULL
                 AND c.email IS NOT NULL
                 AND EXISTS (
                   SELECT 1 FROM users u
                   WHERE u.id = $2
                     AND LOWER(TRIM(u.email)) = LOWER(TRIM(c.email))
                 )
               )
             )
           LIMIT 1`,
    values: [projectId, userId],
  });
  return rows.length > 0;
}

/**
 * Crew row for this user in the project's workspace (for log_entries.author_id).
 */
async function getCrewIdForUserOnProjectWorkspace(pool, userId, projectId) {
  if (!userId || !projectId) return null;
  const { rows } = await pool.query({
    name: 'access_crew_for_user_project_ws',
    text: `SELECT c.id FROM crew c
           INNER JOIN projects p ON p.workspace_id = c.workspace_id AND p.id = $1
           WHERE (c.active = true OR c.active IS NULL)
             AND (
               c.user_id = $2
               OR (
                 c.user_id IS NULL
                 AND c.email IS NOT NULL
                 AND EXISTS (
                   SELECT 1 FROM users u
                   WHERE u.id = $2
                     AND LOWER(TRIM(u.email)) = LOWER(TRIM(c.email))
                 )
               )
             )
           ORDER BY c.user_id NULLS LAST
           LIMIT 1`,
    values: [projectId, userId],
  });
  return rows[0]?.id ?? null;
}

/** log_entries.author_id references crew.id */
async function crewRowBelongsToUser(pool, crewId, userId) {
  if (!crewId || !userId) return false;
  const { rows } = await pool.query({
    name: 'access_crew_belongs_user',
    text: `SELECT 1 FROM crew c
           WHERE c.id = $1
             AND (
               c.user_id = $2
               OR (
                 c.user_id IS NULL
                 AND c.email IS NOT NULL
                 AND EXISTS (
                   SELECT 1 FROM users u
                   WHERE u.id = $2
                     AND LOWER(TRIM(u.email)) = LOWER(TRIM(c.email))
                 )
               )
             )`,
    values: [crewId, userId],
  });
  return rows.length > 0;
}

async function linkCrewRowsToUserByEmail(pool, userId, email) {
  if (!userId || !email) return;
  const e = String(email).trim().toLowerCase();
  if (!e) return;
  try {
    await pool.query({
      name: 'access_crew_link_user_email',
      text: `UPDATE crew SET user_id = $1
             WHERE LOWER(TRIM(email)) = $2
               AND user_id IS NULL
               AND (active = true OR active IS NULL)`,
      values: [userId, e],
    });
  } catch {
    /* non-fatal */
  }
}

/** True if user can delete/edit project (creator or project member with owner/admin/moderator/editor role). */
async function canManageProject(pool, userId, projectId) {
  if (!userId || !projectId) return false;
  const { rows } = await pool.query({
    name: 'access_can_manage_project',
    text: `SELECT 1 FROM projects WHERE id = $1 AND created_by = $2
           UNION ALL
           SELECT 1 FROM project_members pm
             JOIN crew c ON c.id = pm.crew_id AND c.user_id = $2
           WHERE pm.project_id = $1 AND pm.role IN ('owner', 'admin', 'moderator', 'editor')
           UNION ALL
           SELECT 1 FROM project_members pm
             JOIN crew c ON c.id = pm.crew_id
             JOIN users u ON u.id = $2
           WHERE pm.project_id = $1
             AND pm.role IN ('owner', 'admin', 'moderator', 'editor')
             AND c.user_id IS NULL
             AND c.email IS NOT NULL
             AND u.email IS NOT NULL
             AND LOWER(TRIM(c.email)) = LOWER(TRIM(u.email))
             AND (c.active = true OR c.active IS NULL)`,
    values: [projectId, userId],
  });
  return rows.length > 0;
}

function requireUser(req, res) {
  if (!req.user || !req.user.id) {
    res.status(401).json({ error: 'Sign in required' });
    return null;
  }
  return req.user.id;
}

/** From users.global_role (SAML). Returns null if column missing or unset. */
async function getUserGlobalRole(pool, userId) {
  if (!userId) return null;
  try {
    const { rows } = await pool.query({
      name: 'access_user_global_role',
      text: 'SELECT global_role FROM users WHERE id = $1',
      values: [userId],
    });
    return rows[0]?.global_role || null;
  } catch {
    return null;
  }
}

module.exports = {
  getAccessibleWorkspaceIds,
  getAccessibleProjectIds,
  getOrCreateDefaultWorkspaceId,
  canManageProject,
  requireUser,
  getUserGlobalRole,
  linkCrewRowsToUserByEmail,
  isProjectAdminRoleOnly,
  getCrewIdForUserOnProjectWorkspace,
  crewRowBelongsToUser,
};
