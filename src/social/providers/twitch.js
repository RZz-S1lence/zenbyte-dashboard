const { request } = require('../http');
const { twitch } = require('../../config');
const logger = require('../../utils/logger');

let token = null;       // cached app access token
let tokenExpiry = 0;

const loginOf = input => input.trim()
  .replace(/^https?:\/\/(www\.)?twitch\.tv\//i, '')
  .split(/[/?]/)[0]
  .toLowerCase();

// Placeholder values shipped in .env.example. Treat them as "not configured" so a
// half-filled .env never looks like working credentials.
const PLACEHOLDERS = new Set(['your-client-id', 'your-client-secret', 'changeme', 'xxx']);
const cleanCred = v => (typeof v === 'string' ? v.trim() : '');

// The trimmed Client ID / Secret, or empty strings. Reading these lazily (rather
// than at module load) means a key added to the environment is picked up without
// having to touch this file, and surrounding whitespace never breaks detection.
function credentials() {
  return { clientId: cleanCred(twitch.clientId), clientSecret: cleanCred(twitch.clientSecret) };
}

function isConfigured() {
  const { clientId, clientSecret } = credentials();
  if (!clientId || !clientSecret) return false;
  return !PLACEHOLDERS.has(clientId.toLowerCase()) && !PLACEHOLDERS.has(clientSecret.toLowerCase());
}

async function getToken() {
  if (token && Date.now() < tokenExpiry) return token;
  const { clientId, clientSecret } = credentials();
  if (!clientId || !clientSecret) return null;
  const url = `https://id.twitch.tv/oauth2/token?client_id=${encodeURIComponent(clientId)}` +
    `&client_secret=${encodeURIComponent(clientSecret)}&grant_type=client_credentials`;
  const res = await request(url, { method: 'POST', json: true });
  if (!res.ok || !res.body?.access_token) { logger.warn('Twitch token request failed.'); return null; }
  token = res.body.access_token;
  tokenExpiry = Date.now() + (res.body.expires_in - 60) * 1000;
  return token;
}

// Live credential check: confirms the configured keys actually authenticate with
// Twitch, not just that two non-empty strings are present. Returns { ok } or
// { ok:false, error } with a message safe to show an admin.
async function validate() {
  if (!isConfigured())
    return { ok: false, error: 'Twitch Client ID and Client Secret are not set on the bot.' };
  // Force a fresh token so a stale cache cannot mask rotated/invalid keys.
  token = null; tokenExpiry = 0;
  const t = await getToken();
  if (!t) return { ok: false, error: 'Twitch rejected these credentials. Re-check the Client ID and Secret, then restart the bot.' };
  return { ok: true };
}

async function helix(path) {
  const t = await getToken();
  if (!t) return null;
  return request(`https://api.twitch.tv/helix/${path}`, {
    json: true, headers: { 'Client-Id': credentials().clientId, Authorization: `Bearer ${t}` }
  });
}

module.exports = {
  id: 'twitch',
  label: 'Twitch',
  kind: 'live',
  needsAuth: true,
  example: 'a Twitch username or channel URL',
  defaultTemplate: '🔴 **{name}** is now live on Twitch!\n{title}\n{url}',
  emoji: '🟣',
  isConfigured,
  validate,

  async resolve(input) {
    const login = loginOf(input);
    if (!login) return { error: 'Provide a Twitch username or channel URL.' };
    if (!isConfigured()) return { key: login, name: login }; // accept now, validate once keys exist
    const res = await helix(`users?login=${login}`);
    const user = res?.body?.data?.[0];
    if (!user) return { error: 'Could not find that Twitch channel.' };
    return { key: user.login, name: user.display_name || user.login };
  },

  async fetch(key) {
    if (!isConfigured()) return null;
    const res = await helix(`streams?user_login=${key}`);
    if (!res?.ok) return null;
    const stream = res.body?.data?.[0];
    if (!stream) return { live: false };
    return {
      live: true,
      id: stream.id,
      title: stream.title || 'Live now',
      url: `https://twitch.tv/${key}`,
      game: stream.game_name,
      viewers: stream.viewer_count,
      startedAt: stream.started_at || null
    };
  }
};
