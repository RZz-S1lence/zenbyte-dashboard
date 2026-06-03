const logger = require('../utils/logger');
const { TYPE_META } = require('./config');

// Discord rate-limits channel renames to ~2 per 10 minutes per channel. We never
// edit a given counter channel more often than this, and the periodic sweep runs
// just outside it, so we stay comfortably under the limit.
const MIN_EDIT_INTERVAL = 5.5 * 60 * 1000; // 5m30s between edits of the same channel
const SWEEP_INTERVAL    = 6 * 60 * 1000;   // periodic recompute for every guild
const DEBOUNCE_MS       = 45 * 1000;       // collapse bursts of joins/leaves

const pendingUpdates = new Map(); // guildId -> timeout (debounced event-driven updates)

// ── Counting ──────────────────────────────────────
function computeCount(guild, counter) {
  switch (counter.type) {
    case 'all':      return guild.memberCount;
    case 'boosters': return guild.premiumSubscriptionCount || 0;
    case 'channels': return guild.channels.cache.size;
    case 'roles':    return Math.max(0, guild.roles.cache.size - 1); // exclude @everyone
    case 'humans':   return guild.members.cache.filter(m => !m.user.bot).size;
    case 'bots':     return guild.members.cache.filter(m => m.user.bot).size;
    case 'role': {
      if (!counter.roleId) return null;
      const role = guild.roles.cache.get(counter.roleId);
      return role ? role.members.size : null;
    }
    default: return null;
  }
}

function renderName(guild, counter, count) {
  const roleName = (counter.type === 'role' && counter.roleId)
    ? (guild.roles.cache.get(counter.roleId)?.name || 'Role') : '';
  return (counter.template || '{count}')
    .replace(/\{count\}/gi, Number(count).toLocaleString('en-US'))
    .replace(/\{role\}/gi, roleName)
    .replace(/\{server\}/gi, guild.name)
    .slice(0, 100);
}

// ── Updating ──────────────────────────────────────
// Updates every enabled counter channel for a guild. `force` bypasses the per-
// channel cooldown (used by the dashboard "Refresh now" button).
async function updateGuild(client, guildId, { force = false } = {}) {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;

  const counters = client.memberCounters.list(guildId).filter(c => c.enabled);
  if (!counters.length) return;

  // Fetch the member list once if any counter needs per-member data.
  if (counters.some(c => TYPE_META[c.type]?.needsMembers))
    await guild.members.fetch().catch(() => {});

  const now = Date.now();
  for (const counter of counters) {
    const channel = guild.channels.cache.get(counter.channelId);
    if (!channel || typeof channel.setName !== 'function') continue;

    const count = computeCount(guild, counter);
    if (count === null) continue;

    const name = renderName(guild, counter, count);
    if (channel.name === name) continue;                                  // already correct
    if (!force && counter.lastEdit && now - counter.lastEdit < MIN_EDIT_INTERVAL) continue;

    await channel.setName(name, 'Member counter update')
      .then(() => client.memberCounters.recordEdit(counter.id, count, Date.now()))
      .catch(e => logger.error(`Member counter rename failed (${channel.id}): ${e.message}`));
  }
}

// Recomputes counters for every guild that has any. Runs on a timer.
async function sweep(client) {
  for (const guildId of client.memberCounters.activeGuildIds())
    await updateGuild(client, guildId).catch(() => {});
}

// Collapses bursts of member events into a single delayed update per guild.
function scheduleGuildUpdate(client, guildId) {
  if (pendingUpdates.has(guildId)) return;
  const t = setTimeout(() => {
    pendingUpdates.delete(guildId);
    updateGuild(client, guildId).catch(() => {});
  }, DEBOUNCE_MS);
  t.unref?.();
  pendingUpdates.set(guildId, t);
}

// Starts the periodic sweep and does one warm-up pass shortly after login.
function start(client) {
  setTimeout(() => sweep(client).catch(() => {}), 20 * 1000);
  const timer = setInterval(() => sweep(client).catch(() => {}), SWEEP_INTERVAL);
  timer.unref?.();
  return timer;
}

module.exports = { computeCount, renderName, updateGuild, sweep, scheduleGuildUpdate, start, SWEEP_INTERVAL };
