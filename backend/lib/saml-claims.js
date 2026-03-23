/**
 * Extract SAML assertion attributes from passport-saml profile and map to app fields.
 * Configure Okta: App → General → SAML Settings → Attribute Statements (e.g. Name=Role, Value=user.role).
 */

const PROFILE_SKIP = new Set([
  'nameID',
  'nameIDFormat',
  'nameQualifier',
  'spNameQualifier',
  'sessionIndex',
  'issuer',
  'inResponseTo',
  'getAssertion',
  'getAssertionXml',
]);

/**
 * Snapshot of assertion attributes for API / debugging (truncated).
 */
function snapshotSamlAttributes(profile) {
  const out = {};
  if (!profile || typeof profile !== 'object') return out;
  for (const [k, v] of Object.entries(profile)) {
    if (PROFILE_SKIP.has(k) || k.startsWith('_')) continue;
    if (v === undefined || v === null) continue;
    const arr = Array.isArray(v) ? v : [v];
    out[k] = arr.map((x) => {
      const s = typeof x === 'object' ? JSON.stringify(x) : String(x);
      return s.length > 400 ? `${s.slice(0, 400)}…` : s;
    });
  }
  return out;
}

function firstMatchingAttribute(profile, claimNames) {
  for (const name of claimNames) {
    const v = profile[name];
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) {
      const flat = v.map(String).filter(Boolean);
      if (flat.length) return flat.join(',');
    } else if (String(v).trim()) {
      return String(v).trim();
    }
  }
  return null;
}

/**
 * Known Okta → To-Do app roles (highest privilege first). First matching group wins.
 * Stored in users.global_role as the `role` value (short slug for APIs / future RBAC).
 */
const DEFAULT_TODO_OKTA_GROUP_PRIORITY = [
  { group: 'ToDo-SuperAdmins', role: 'superadmin' },
  { group: 'ToDo-Admins', role: 'workspace_admin' },
  { group: 'ToDo-ProjectManagers', role: 'project_manager' },
  { group: 'ToDo-Members', role: 'member' },
  { group: 'ToDo-Viewers', role: 'viewer' },
];

/** Default SAML attribute names that may contain group / role membership (exact string match per group). */
const DEFAULT_GROUP_CLAIM_KEYS = [
  'groups',
  'Groups',
  'group',
  'Group',
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role',
  'http://schemas.xmlsoap.org/claims/Group',
];

/**
 * Env `SAML_GROUP_CLAIM_KEYS` — comma-separated extra attribute names (merged with defaults, first wins per key).
 */
function resolvedGroupClaimKeys() {
  const extra = (process.env.SAML_GROUP_CLAIM_KEYS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set([...DEFAULT_GROUP_CLAIM_KEYS, ...extra])];
}

function collectIdpGroupSet(profile) {
  const out = new Set();
  if (!profile || typeof profile !== 'object') return out;
  for (const key of resolvedGroupClaimKeys()) {
    const v = profile[key];
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) {
      for (const x of v) {
        const s = String(x).trim();
        if (s) out.add(s);
      }
    } else {
      const s = String(v).trim();
      if (s) out.add(s);
    }
  }
  return out;
}

/**
 * If the user is in any configured ToDo-* Okta group, return the highest-privilege app role.
 * Optional env: SAML_TODO_GROUP_PRIORITY_JSON — JSON array of { "group": "ToDo-…", "role": "slug" } (evaluated in order).
 */
function deriveTodoGroupRole(profile) {
  if (process.env.SAML_TODO_ROLES_DISABLED === 'true') return null;
  let rules = DEFAULT_TODO_OKTA_GROUP_PRIORITY;
  if (process.env.SAML_TODO_GROUP_PRIORITY_JSON) {
    try {
      const parsed = JSON.parse(process.env.SAML_TODO_GROUP_PRIORITY_JSON);
      if (Array.isArray(parsed) && parsed.length) rules = parsed;
    } catch {
      /* keep default */
    }
  }
  const userGroups = collectIdpGroupSet(profile);
  for (const entry of rules) {
    const g = entry && entry.group != null ? String(entry.group).trim() : '';
    const r = entry && entry.role != null ? String(entry.role).trim() : '';
    if (!g || !r) continue;
    if (userGroups.has(g)) return r.slice(0, 120);
  }
  return null;
}

/**
 * When true, only configured ToDo (or SAML_TODO_GROUP_PRIORITY_JSON) groups grant a role — no legacy Role/Groups string mapping.
 */
function isSamlRequireTodoGroup() {
  return process.env.SAML_REQUIRE_TODO_GROUP === 'true';
}

/**
 * Default copy for users without a matching app group (overridable via SAML_ACCESS_DENIED_MESSAGE).
 */
const DEFAULT_ACCESS_DENIED_MESSAGE =
  'You do not have access to this application yet. Please raise a request with IT to be added to the appropriate access group, then try signing in again.';

function getAccessDeniedMessage() {
  const m = process.env.SAML_ACCESS_DENIED_MESSAGE;
  if (m != null && String(m).trim()) return String(m).trim();
  return DEFAULT_ACCESS_DENIED_MESSAGE;
}

/**
 * Resolve app global_role from SAML profile using SAML_ROLE_ATTRIBUTE_NAMES and optional SAML_ROLE_MAP_JSON.
 */
function deriveGlobalRoleFromProfile(profile) {
  const todoRole = deriveTodoGroupRole(profile);
  if (todoRole) return todoRole;

  if (isSamlRequireTodoGroup()) {
    return null;
  }

  const defaultNames =
    'Role,roles,Groups,group,Department,department,Title,title,' +
    'http://schemas.microsoft.com/ws/2008/06/identity/claims/role,' +
    'http://schemas.xmlsoap.org/claims/Group';
  const names = (process.env.SAML_ROLE_ATTRIBUTE_NAMES || defaultNames)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const raw = firstMatchingAttribute(profile, names);
  if (!raw) return null;

  let map = {};
  if (process.env.SAML_ROLE_MAP_JSON) {
    try {
      map = JSON.parse(process.env.SAML_ROLE_MAP_JSON);
    } catch (_) {
      /* ignore */
    }
  }
  const parts = raw.split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
  for (const part of parts) {
    for (const [idpValue, appRole] of Object.entries(map)) {
      if (part === idpValue || part.includes(idpValue)) {
        return String(appRole).slice(0, 120);
      }
    }
  }
  return raw.slice(0, 120);
}

/**
 * Whether this user may use the app UI/API (when SAML_REQUIRE_TODO_GROUP is enabled).
 * @param {{ global_role?: string | null, has_password_hash?: boolean }} row
 */
function isAppAccessGrantedForUser(row) {
  if (!isSamlRequireTodoGroup()) return true;
  const role = row?.global_role != null ? String(row.global_role).trim() : '';
  if (role) return true;
  const allowLocal = process.env.SAML_ALLOW_LOCAL_PASSWORD_USERS !== 'false';
  if (allowLocal && row?.has_password_hash) return true;
  return false;
}

module.exports = {
  snapshotSamlAttributes,
  deriveGlobalRoleFromProfile,
  deriveTodoGroupRole,
  collectIdpGroupSet,
  DEFAULT_TODO_OKTA_GROUP_PRIORITY,
  isSamlRequireTodoGroup,
  getAccessDeniedMessage,
  isAppAccessGrantedForUser,
  resolvedGroupClaimKeys,
};
