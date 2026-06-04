// ── Lemon Squeezy License API client ──
// The /licenses/* endpoints authenticate with the license key itself, so no API
// key is required here. We send JSON and ask for JSON back. Each call resolves to
// the parsed body (or throws on a network error). LS always returns a JSON object
// with `valid`/`activated`/`deactivated`, an `error` string, and a `license_key`
// + `meta` block describing the product/variant.
const BASE = 'https://api.lemonsqueezy.com/v1';

async function lsPost(path, body) {
  if (typeof fetch !== 'function') throw new Error('global fetch unavailable (Node 18+ required)');
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  let json = null;
  try { json = await res.json(); } catch { /* non-JSON body */ }
  if (!json) throw new Error(`LS ${path} returned ${res.status} with no JSON body`);
  return json;
}

// Returns { valid, error, license_key:{ id, status, key, activation_limit, activation_usage, expires_at, ... }, instance, meta:{ variant_id, ... } }
function validateLicense(licenseKey, instanceId) {
  const body = { license_key: licenseKey };
  if (instanceId) body.instance_id = instanceId;
  return lsPost('/licenses/validate', body);
}

// Returns { activated, error, license_key, instance:{ id, name }, meta }
function activateLicense(licenseKey, instanceName) {
  return lsPost('/licenses/activate', { license_key: licenseKey, instance_name: instanceName });
}

// Returns { deactivated, error }
function deactivateLicense(licenseKey, instanceId) {
  return lsPost('/licenses/deactivate', { license_key: licenseKey, instance_id: instanceId });
}

module.exports = { validateLicense, activateLicense, deactivateLicense };
