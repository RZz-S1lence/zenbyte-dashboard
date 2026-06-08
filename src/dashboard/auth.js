const { PermissionFlagsBits } = require('discord.js');
const { oauth } = require('../config');

const API = 'https://discord.com/api/v10';
const ADMIN = PermissionFlagsBits.Administrator; // 0x8

const isConfigured = () => !!(oauth.clientId && oauth.clientSecret);

// ── OAuth2 flow ───────────────────────────────────
function getAuthorizeUrl(redirectUri, state) {
  const params = new URLSearchParams({
    client_id:     oauth.clientId,
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope:         oauth.scopes.join(' '),
    state
  });
  return `https://discord.com/oauth2/authorize?${params}`;
}

// Public "add the bot" link. Requests the bot + slash-command scopes with the
// Administrator permission, matching ZenByte's role/moderation feature set.
function getBotInviteUrl() {
  if (!oauth.clientId) return null;
  const params = new URLSearchParams({
    client_id:   oauth.clientId,
    permissions: '8',
    scope:       'bot applications.commands'
  });
  return `https://discord.com/oauth2/authorize?${params}`;
}

async function exchangeCode(code, redirectUri) {
  const res = await fetch(`${API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     oauth.clientId,
      client_secret: oauth.clientSecret,
      grant_type:    'authorization_code',
      code,
      redirect_uri:  redirectUri
    })
  });
  if (!res.ok) throw new Error(`Token exchange failed (${res.status})`);
  return res.json();
}

async function fetchDiscordUser(accessToken) {
  const res = await fetch(`${API}/users/@me`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Fetch user failed (${res.status})`);
  return res.json();
}

async function fetchUserGuilds(accessToken) {
  const res = await fetch(`${API}/users/@me/guilds`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Fetch guilds failed (${res.status})`);
  return res.json();
}

// A guild from the OAuth list counts as admin if the user owns it or has the
// Administrator permission bit set in their permissions there.
function hasAdminInOAuthGuild(g) {
  if (g.owner) return true;
  try { return (BigInt(g.permissions) & ADMIN) === ADMIN; }
  catch { return false; }
}

// ── Live, authoritative per-guild access check (via the bot) ──
// Short TTL cache to dedupe rapid checks; writes bypass it with { fresh:true }.
const accessCache = new Map(); // "userId:guildId" -> { ok, exp }
const TTL = 20000;

async function assertGuildAccess(client, session, guildId, { fresh = false } = {}) {
  const userId = session?.userId;
  if (!userId || !guildId) return false;

  const key = `${userId}:${guildId}`;
  if (!fresh) {
    const cached = accessCache.get(key);
    if (cached && cached.exp > Date.now()) return cached.ok;
  }

  const ok = await computeAccess(client, userId, guildId);
  accessCache.set(key, { ok, exp: Date.now() + TTL });
  return ok;
}

async function computeAccess(client, userId, guildId) {
  const guild = client.guilds.cache.get(guildId);       // bot must be in the guild
  if (!guild) return false;
  let member = guild.members.cache.get(userId);
  if (!member) member = await guild.members.fetch(userId).catch(() => null); // user must be in the guild
  if (!member) return false;
  return member.permissions.has(ADMIN);                 // user must be admin there
}

// Returns the guilds the session user may manage: bot is in, user is in, user is admin.
// We check every guild the bot is in via the live, authoritative check rather than
// gating on session.adminGuildIds — that list is only a login-time snapshot, so a
// guild the user gained access to (or added the bot to) after logging in would
// otherwise stay hidden until the next login.
async function listAccessibleGuilds(client, session) {
  const result = [];
  for (const guild of client.guilds.cache.values()) {
    if (!(await assertGuildAccess(client, session, guild.id))) continue; // bot in guild + user is admin member
    result.push({
      id:          guild.id,
      name:        guild.name,
      icon:        guild.iconURL({ size: 128 }) || null,
      memberCount: guild.memberCount
    });
  }
  return result.sort((a, b) => a.name.localeCompare(b.name));
}

function invalidateUser(userId) {
  for (const key of accessCache.keys()) if (key.startsWith(`${userId}:`)) accessCache.delete(key);
}

module.exports = {
  isConfigured, getAuthorizeUrl, getBotInviteUrl, exchangeCode, fetchDiscordUser, fetchUserGuilds,
  hasAdminInOAuthGuild, assertGuildAccess, listAccessibleGuilds, invalidateUser
};
