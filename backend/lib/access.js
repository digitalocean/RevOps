/**
 * User-based access: which workspaces and projects the current user can see.
 *
 *   Project RBAC (strict):
 *     • Projects in workspaces the user OWNS → full access.
 *     • Projects explicitly in `project_members` for the user (via crew.user_id
 *       or email match) → access to that project only.
 *     • A bare crew row in a workspace does NOT grant access to sibling
 *       projects. Inviting someone to one project should not expose others.
 *
 *   Workspace authority:
 *     • `getAccessibleWorkspaceIds` → owned workspaces only (admin actions:
 *       create project, manage crew, edit workspace).
 *     • `getVisibleWorkspaceIds` → owned + workspaces containing a shared
 *       project (used by UI endpoints: workspace switcher, crew dropdowns).
 */

/**
 * Workspaces the user has *admin-level* authority over (create projects, manage
 * crew, rename workspace). Restricted to workspace owners.
 *
 * Use `getVisibleWorkspaceIds` for UI-level "workspaces I should see in the
 * switcher" — that broader set also includes workspaces that merely *contain*
 * a project shared with me.
 */
async function getAccessibleWorkspaceIds(pool, userId) {
  if (!userId) return [];
  const { rows } = await pool.query({
    name: 'access_owned_workspace_ids',
    text: `SELECT id FROM workspaces WHERE owner_id = $1`,
    values: [userId],
  });
  return rows.map((r) => r.id);
}

/**
 * Workspaces the user should see in read-only contexts: owned workspaces PLUS
 * workspaces that contain at least one project shared with the user (so the
 * workspace switcher can show them).
 */
async function getVisibleWorkspaceIds(pool, userId) {
  if (!userId) return [];
  const { rows } = await pool.query({
    name: 'access_visible_workspace_ids',
    text: `SELECT id FROM workspaces WHERE owner_id = $1
           UNION
           SELECT DISTINCT p.workspace_id AS id
           FROM projects p
           INNER JOIN project_members pm ON pm.project_id = p.id
           INNER JOIN crew c ON c.id = pm.crew_id
           WHERE (c.active = true OR c.active IS NULL)
             AND (
               c.user_id = $1
               OR (
                 c.user_id IS NULL
                 AND c.email IS NOT NULL
                 AND EXISTS (SELECT 1 FROM users u WHERE u.id = $1 AND LOWER(TRIM(u.email)) = LOWER(TRIM(c.email)))
               )
             )
             AND p.workspace_id IS NOT NULL`,
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

/**
 * Projects the user may see / read. Two sources ONLY:
 *   1. Projects in workspaces the user *owns* (workspaces.owner_id = user).
 *      Personal projects in owned workspaces are only visible to their creator.
 *   2. Projects explicitly shared with the user via project_members — matched
 *      either by crew.user_id or (pre-link) by email equality with users.email.
 *
 * NOTE: a mere crew row in a workspace is NOT enough to grant workspace-wide
 * project visibility. That would leak sibling projects to anyone invited to a
 * single project in that workspace (see RBAC bug: sharing one project should
 * not expose every other project in the same workspace).
 */
async function getAccessibleProjectIds(pool, userId) {
  if (!userId) return [];

  const { rows: ownedRows } = await pool.query({
    name: 'access_projects_in_owned_workspaces',
    text: `SELECT p.id FROM projects p
           INNER JOIN workspaces w ON w.id = p.workspace_id
           WHERE w.owner_id = $1
             AND (p.is_personal = false OR p.created_by = $1)`,
    values: [userId],
  });
  const ownedProjectIds = ownedRows.map((r) => r.id);

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

  const combined = [...new Set([...ownedProjectIds.map(String), ...sharedIds.map(String)])];
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
  getVisibleWorkspaceIds,
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
