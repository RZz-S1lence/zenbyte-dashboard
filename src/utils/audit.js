const { AuditLogEvent } = require('discord.js');
const history = require('../logging/history');

async function sendLog(client, guild, logType, payload) {
  const guildLogs = client.store.logChannels.get(guild.id);
  if (!guildLogs || !guildLogs[logType]) return;
  const channel = guild.channels.cache.get(guildLogs[logType]);
  if (!channel) return;
  // payload may be a raw embed object or a full message payload ({ content, embeds })
  const message = payload.embeds ? payload : { embeds: [payload] };
  const sent = await channel.send(message).catch(() => null);
  // Keep a copy so the log survives being deleted in Discord (see logging/history).
  history.record({ guildId: guild.id, type: logType, channelId: channel.id, messageId: sent?.id, message });
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

// Works out who deleted a message. Discord merges repeated deletes by the same
// person (same author + channel) into one audit entry and only bumps its count,
// so we remember counts and treat a bumped count as a fresh delete.
// Returns { executor } (a User), { self: true } when nobody else did it, or
// { unknown: true } when the audit log can't be read (missing permission).
const seenCounts = new Map(); // auditEntryId -> count
const credits = new Map();    // auditEntryId -> deletes not yet matched to a message
// Runs one lookup at a time per guild so two quick deletes can't both read
// the same count bump.
const queues = new Map(); // guildId -> Promise
function findMessageDeleter(guild, message) {
  const prev = queues.get(guild.id) || Promise.resolve();
  const run = prev.then(() => lookupDeleter(guild, message));
  const tail = run.catch(() => {});
  queues.set(guild.id, tail);
  tail.then(() => { if (queues.get(guild.id) === tail) queues.delete(guild.id); });
  return run;
}
async function lookupDeleter(guild, message) {
  await new Promise(r => setTimeout(r, 1200)); // the audit entry shows up a bit after the event
  let logs;
  try { logs = await guild.fetchAuditLogs({ type: AuditLogEvent.MessageDelete, limit: 10 }); }
  catch { return { unknown: true }; }
  let found = null;
  for (const e of logs.entries.values()) {
    const count = Number(e.extra?.count) || 1;
    const prev = seenCounts.get(e.id);
    seenCounts.set(e.id, count);
    // Each new delete in this entry gives one "credit" we can hand to a deleted message.
    const fresh = Date.now() - e.createdTimestamp < 15000;
    const delta = prev === undefined ? (fresh ? count : 0) : Math.max(0, count - prev);
    if (delta) credits.set(e.id, (credits.get(e.id) || 0) + delta);
    if (found) continue;
    if (e.target?.id !== message.author?.id) continue;
    if (e.extra?.channel?.id && e.extra.channel.id !== message.channelId) continue;
    if ((credits.get(e.id) || 0) > 0) { credits.set(e.id, credits.get(e.id) - 1); found = e; }
  }
  if (seenCounts.size > 2000) { seenCounts.clear(); credits.clear(); }
  return found?.executor ? { executor: found.executor } : { self: true };
}

module.exports = { sendLog, getAuditLogExecutor, getRecentExecutor, findMessageDeleter };
