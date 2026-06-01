function isIgnored(member, channelId, cfg) {
  if (!member) return true;
  if (cfg.ignoredChannels.includes(channelId)) return true;
  if (cfg.ignoredRoles.some(r => member.roles.cache.has(r))) return true;
  return false;
}

function scoreOf(counts, weights) {
  return Math.round(
    counts.messages * weights.message +
    counts.voiceMinutes * weights.voicePerMinute +
    counts.reactions * weights.reaction
  );
}

function onMessage(client, message) {
  const cfg = client.activity.getConfig(message.guild.id);
  if (!cfg.enabled) return;
  if (message.author.bot && !cfg.countBots) return;
  if (isIgnored(message.member, message.channel.id, cfg)) return;
  const u = client.activity.getUser(message.guild.id, message.author.id);
  u.messages++; u.weekly.messages++; u.monthly.messages++; u.lastSeen = Date.now();
  client.activity.markDirty();
}

async function onReaction(client, reaction, user) {
  const guild = reaction.message.guild;
  if (!guild) return;
  const cfg = client.activity.getConfig(guild.id);
  if (!cfg.enabled) return;
  if (user.bot && !cfg.countBots) return;
  const member = guild.members.cache.get(user.id) || await guild.members.fetch(user.id).catch(() => null);
  if (isIgnored(member, reaction.message.channelId, cfg)) return;
  const u = client.activity.getUser(guild.id, user.id);
  u.reactions++; u.weekly.reactions++; u.monthly.reactions++; u.lastSeen = Date.now();
  client.activity.markDirty();
}

function runVoiceTick(client) {
  for (const guild of client.guilds.cache.values()) {
    const cfg = client.activity.getConfig(guild.id);
    if (!cfg.enabled) continue;
    for (const state of guild.voiceStates.cache.values()) {
      if (!state.channelId || !state.member) continue;
      if (state.member.user.bot && !cfg.countBots) continue;
      if (state.channelId === guild.afkChannelId) continue;
      if (isIgnored(state.member, state.channelId, cfg)) continue;
      const u = client.activity.getUser(guild.id, state.id);
      u.voiceMinutes++; u.weekly.voiceMinutes++; u.monthly.voiceMinutes++; u.lastSeen = Date.now();
      client.activity.markDirty();
    }
  }
}

function countsFor(u, scope) {
  if (scope === 'weekly')  return { messages: u.weekly.messages, voiceMinutes: u.weekly.voiceMinutes, reactions: u.weekly.reactions };
  if (scope === 'monthly') return { messages: u.monthly.messages, voiceMinutes: u.monthly.voiceMinutes, reactions: u.monthly.reactions };
  return { messages: u.messages, voiceMinutes: u.voiceMinutes, reactions: u.reactions };
}

function leaderboard(client, guild, scope = 'all') {
  const cfg = client.activity.getConfig(guild.id);
  return [...client.activity.guildUsers(guild.id).entries()]
    .map(([userId, u]) => {
      const counts = countsFor(client.activity.getUser(guild.id, userId), scope);
      return { userId, ...counts, score: scoreOf(counts, cfg.weights) };
    })
    .filter(e => e.score > 0)
    .sort((a, b) => b.score - a.score);
}

function activityOf(client, guild, userId, scope = 'all') {
  const cfg = client.activity.getConfig(guild.id);
  const u = client.activity.getUser(guild.id, userId);
  const counts = countsFor(u, scope);
  const board = leaderboard(client, guild, scope);
  const idx = board.findIndex(e => e.userId === userId);
  return {
    ...counts,
    score: scoreOf(counts, cfg.weights),
    rank: idx === -1 ? null : idx + 1,
    total: board.length,
    lastSeen: u.lastSeen,
    weights: cfg.weights
  };
}

function resetMember(client, guild, userId) { client.activity.deleteUser(guild.id, userId); }
function resetGuild(client, guild) { client.activity.resetGuild(guild.id); }

module.exports = { onMessage, onReaction, runVoiceTick, leaderboard, activityOf, resetMember, resetGuild, scoreOf };
