const { levelFromXp, levelProgress, totalXpForLevel } = require('./formula');
const { weekKey, monthKey } = require('./store');

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function isNoXp(member, channelId, cfg) {
  if (!member) return true;
  if (cfg.noXpChannels.includes(channelId)) return true;
  if (cfg.noXpRoles.some(r => member.roles.cache.has(r))) return true;
  return false;
}

function multiplierFor(member, channelId, cfg) {
  let mult = cfg.multiplier;
  const roleBoosts = cfg.roleBoosts.filter(b => member.roles.cache.has(b.id)).map(b => b.multiplier);
  if (roleBoosts.length) mult *= Math.max(...roleBoosts);
  const channelBoost = cfg.channelBoosts.find(b => b.id === channelId);
  if (channelBoost) mult *= channelBoost.multiplier;
  return mult;
}

async function applyRewards(member, cfg, level) {
  if (!cfg.roleRewards.length) return;
  const me = member.guild.members.me;
  if (!me) return;
  const eligible = cfg.roleRewards.filter(r => r.level <= level);
  const canManage = rid => {
    const role = member.guild.roles.cache.get(rid);
    return role && role.position < me.roles.highest.position && !role.managed;
  };

  let keep;
  if (cfg.stackRewards) keep = eligible.map(r => r.roleId);
  else {
    const top = eligible.length ? Math.max(...eligible.map(r => r.level)) : 0;
    keep = eligible.filter(r => r.level === top).map(r => r.roleId);
  }

  for (const rid of keep)
    if (canManage(rid) && !member.roles.cache.has(rid))
      await member.roles.add(rid, 'Leveling role reward').catch(() => {});

  if (!cfg.stackRewards) {
    for (const r of cfg.roleRewards)
      if (!keep.includes(r.roleId) && member.roles.cache.has(r.roleId) && canManage(r.roleId))
        await member.roles.remove(r.roleId, 'Leveling reward replaced').catch(() => {});
  }
}

async function announce(client, guild, member, level, cfg, currentChannel) {
  if (cfg.announce.mode === 'off') return;
  const text = cfg.announce.message
    .replaceAll('{user}', `<@${member.id}>`)
    .replaceAll('{username}', member.user.username)
    .replaceAll('{level}', String(level))
    .replaceAll('{server}', guild.name);

  if (cfg.announce.mode === 'dm') return void member.send(text).catch(() => {});
  const channel = cfg.announce.mode === 'current' ? currentChannel : guild.channels.cache.get(cfg.announce.channelId);
  if (channel?.isTextBased?.())
    await channel.send({ content: text, allowedMentions: { users: [member.id] } }).catch(() => {});
}

// Core XP grant. Applies level-ups, rewards and announcements. `amount` may be
// negative for manual deductions (no announcement on decrease).
async function grantXp(client, guild, member, amount, cfg, { announceChannel = null } = {}) {
  const store = client.levels;
  const u = store.getUser(guild.id, member.id);
  const before = u.xp;
  const delta = Math.round(amount);

  u.xp = Math.max(0, u.xp + delta);
  if (delta > 0) { u.weeklyXp += delta; u.monthlyXp += delta; }
  store.markDirty();

  const oldLevel = levelFromXp(before, cfg.formula, cfg.maxLevel);
  const newLevel = levelFromXp(u.xp, cfg.formula, cfg.maxLevel);

  if (newLevel !== oldLevel) await applyRewards(member, cfg, newLevel);
  if (newLevel > oldLevel)   await announce(client, guild, member, newLevel, cfg, announceChannel);

  return { oldLevel, newLevel, leveledUp: newLevel > oldLevel, xp: u.xp };
}

// ── Event-driven gains ────────────────────────────
async function onMessage(client, message) {
  const cfg = client.levels.getConfig(message.guild.id);
  if (!cfg.enabled || !cfg.message.enabled) return;
  if (!message.member || isNoXp(message.member, message.channel.id, cfg)) return;

  const u = client.levels.getUser(message.guild.id, message.author.id);
  u.messages++;
  const now = Date.now();
  if (now - u.lastMsg < cfg.message.cooldown * 1000) { client.levels.markDirty(); return; }
  u.lastMsg = now;

  const amount = randInt(cfg.message.min, cfg.message.max) * multiplierFor(message.member, message.channel.id, cfg);
  await grantXp(client, message.guild, message.member, amount, cfg, { announceChannel: message.channel });
}

async function onReaction(client, reaction, user) {
  const guild = reaction.message.guild;
  if (!guild) return;
  const cfg = client.levels.getConfig(guild.id);
  if (!cfg.enabled || !cfg.reaction.enabled) return;

  const member = guild.members.cache.get(user.id) || await guild.members.fetch(user.id).catch(() => null);
  if (!member || isNoXp(member, reaction.message.channelId, cfg)) return;

  const u = client.levels.getUser(guild.id, user.id);
  const now = Date.now();
  if (now - u.lastReact < cfg.reaction.cooldown * 1000) return;
  u.lastReact = now; u.reactions++;

  const amount = cfg.reaction.xp * multiplierFor(member, reaction.message.channelId, cfg);
  await grantXp(client, guild, member, amount, cfg, { announceChannel: reaction.message.channel });
}

async function runVoiceTick(client) {
  for (const guild of client.guilds.cache.values()) {
    const cfg = client.levels.getConfig(guild.id);
    if (!cfg.enabled || !cfg.voice.enabled) continue;

    const byChannel = new Map();
    for (const state of guild.voiceStates.cache.values()) {
      if (!state.channelId || !state.member || state.member.user.bot) continue;
      if (!byChannel.has(state.channelId)) byChannel.set(state.channelId, []);
      byChannel.get(state.channelId).push(state);
    }

    for (const [channelId, states] of byChannel) {
      if (states.length < cfg.voice.minUsers) continue;
      for (const state of states) {
        if (cfg.voice.ignoreAfk && channelId === guild.afkChannelId) continue;
        if (cfg.voice.ignoreMuted && (state.mute || state.selfMute)) continue;
        if (cfg.voice.ignoreDeafened && (state.deaf || state.selfDeaf)) continue;
        if (isNoXp(state.member, channelId, cfg)) continue;

        const u = client.levels.getUser(guild.id, state.id);
        u.voiceMinutes++;
        const amount = cfg.voice.xpPerMinute * multiplierFor(state.member, channelId, cfg);
        await grantXp(client, guild, state.member, amount, cfg).catch(() => {});
      }
    }
  }
}

async function syncRewards(client, member) {
  const cfg = client.levels.getConfig(member.guild.id);
  if (!cfg.enabled) return;
  if (!client.levels.hasUser(member.guild.id, member.id)) return;
  const u = client.levels.getUser(member.guild.id, member.id);
  await applyRewards(member, cfg, levelFromXp(u.xp, cfg.formula, cfg.maxLevel)).catch(() => {});
}

// ── Manual management ─────────────────────────────
async function setLevel(client, guild, member, level) {
  const cfg = client.levels.getConfig(guild.id);
  const u = client.levels.getUser(guild.id, member.id);
  const target = totalXpForLevel(Math.max(0, level), cfg.formula);
  return grantXp(client, guild, member, target - u.xp, cfg);
}
async function addXp(client, guild, member, amount) {
  return grantXp(client, guild, member, amount, client.levels.getConfig(guild.id));
}
async function setXp(client, guild, member, xp) {
  const u = client.levels.getUser(guild.id, member.id);
  return grantXp(client, guild, member, Math.max(0, xp) - u.xp, client.levels.getConfig(guild.id));
}

async function resetMember(client, guild, member) {
  const cfg = client.levels.getConfig(guild.id);
  if (cfg.removeRewardsOnReset && member) {
    const me = guild.members.me;
    for (const r of cfg.roleRewards) {
      const role = guild.roles.cache.get(r.roleId);
      if (role && member.roles.cache.has(r.roleId) && me && role.position < me.roles.highest.position)
        await member.roles.remove(role, 'Leveling reset').catch(() => {});
    }
  }
  client.levels.deleteUser(guild.id, member.id);
}
function resetGuild(client, guild) { client.levels.resetGuild(guild.id); }

// ── Queries ───────────────────────────────────────
function scopedXp(u, scope) {
  if (scope === 'weekly')  return u.weeklyKey === weekKey() ? u.weeklyXp : 0;
  if (scope === 'monthly') return u.monthlyKey === monthKey() ? u.monthlyXp : 0;
  return u.xp;
}

function leaderboard(client, guild, scope = 'all') {
  const cfg = client.levels.getConfig(guild.id);
  return [...client.levels.guildUsers(guild.id).entries()]
    .map(([userId, u]) => ({
      userId,
      xp: scopedXp(u, scope),
      totalXp: u.xp,
      level: levelFromXp(u.xp, cfg.formula, cfg.maxLevel),
      messages: u.messages,
      voiceMinutes: u.voiceMinutes
    }))
    .filter(e => e.xp > 0)
    .sort((a, b) => b.xp - a.xp);
}

function rankOf(client, guild, userId) {
  const cfg = client.levels.getConfig(guild.id);
  const board = leaderboard(client, guild, 'all');
  const idx = board.findIndex(e => e.userId === userId);
  const u = client.levels.getUser(guild.id, userId);
  const prog = levelProgress(u.xp, cfg.formula, cfg.maxLevel);
  return {
    rank: idx === -1 ? null : idx + 1,
    total: board.length,
    level: prog.level,
    xp: u.xp,
    current: prog.current,
    required: prog.required,
    messages: u.messages,
    voiceMinutes: u.voiceMinutes,
    reactions: u.reactions
  };
}

module.exports = {
  onMessage, onReaction, runVoiceTick, syncRewards,
  setLevel, addXp, setXp, resetMember, resetGuild,
  leaderboard, rankOf, isNoXp, multiplierFor
};
