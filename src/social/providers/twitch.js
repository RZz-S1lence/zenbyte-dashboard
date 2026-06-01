const { request } = require('../http');
const { twitch } = require('../../config');
const logger = require('../../utils/logger');

let token = null;       // cached app access token
let tokenExpiry = 0;

const loginOf = input => input.trim()
  .replace(/^https?:\/\/(www\.)?twitch\.tv\//i, '')
  .split(/[/?]/)[0]
  .toLowerCase();

function isConfigured() {
  return !!(twitch.clientId && twitch.clientSecret);
}

async function getToken() {
  if (token && Date.now() < tokenExpiry) return token;
  const url = `https://id.twitch.tv/oauth2/token?client_id=${twitch.clientId}` +
    `&client_secret=${twitch.clientSecret}&grant_type=client_credentials`;
  const res = await request(url, { method: 'POST', json: true });
  if (!res.ok || !res.body?.access_token) { logger.warn('Twitch token request failed.'); return null; }
  token = res.body.access_token;
  tokenExpiry = Date.now() + (res.body.expires_in - 60) * 1000;
  return token;
}

async function helix(path) {
  const t = await getToken();
  if (!t) return null;
  return request(`https://api.twitch.tv/helix/${path}`, {
    json: true, headers: { 'Client-Id': twitch.clientId, Authorization: `Bearer ${t}` }
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
