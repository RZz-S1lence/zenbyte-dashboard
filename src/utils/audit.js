async function sendLog(client, guild, logType, payload) {
  const guildLogs = client.store.logChannels.get(guild.id);
  if (!guildLogs || !guildLogs[logType]) return;
  const channel = guild.channels.cache.get(guildLogs[logType]);
  if (!channel) return;
  // payload may be a raw embed object or a full message payload ({ content, embeds })
  const message = payload.embeds ? payload : { embeds: [payload] };
  await channel.send(message).catch(() => {});
}

async function getAuditLogExecutor(guild, type, targetId) {
  try {
    const logs = await guild.fetchAuditLogs({ type, limit: 5 });
    const entry = logs.entries.find(e => e.target?.id === targetId && Date.now() - e.createdTimestamp < 10000);
    return entry?.executor || null;
  } catch { return null; }
}

// Returns the executor of the most recent audit-log entry of `type`, regardless of target.
async function getRecentExecutor(guild, type, maxAgeMs = 10000) {
  try {
    const logs = await guild.fetchAuditLogs({ type, limit: 1 });
    const entry = logs.entries.first();
    if (entry && Date.now() - entry.createdTimestamp < maxAgeMs) return entry.executor || null;
    return null;
  } catch { return null; }
}

module.exports = { sendLog, getAuditLogExecutor, getRecentExecutor };
