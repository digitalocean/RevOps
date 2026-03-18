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
 * Resolve app global_role from SAML profile using SAML_ROLE_ATTRIBUTE_NAMES and optional SAML_ROLE_MAP_JSON.
 */
function deriveGlobalRoleFromProfile(profile) {
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

module.exports = {
  snapshotSamlAttributes,
  deriveGlobalRoleFromProfile,
};
