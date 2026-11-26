// Log history: keeps a copy of every log message the bot posts (SQLite), lets the
// dashboard browse it, and restores log messages that someone deletes in Discord.
const { AuditLogEvent } = require('discord.js');
const { getDb } = require('../database/db');
const logger = require('../utils/logger');

const RETENTION_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

let stmts = null;
function q() {
  if (stmts) return stmts;
  const d = getDb();
  stmts = {
    insert: d.prepare(`INSERT INTO log_history (guild_id, log_type, channel_id, message_id, payload, search, created_at)
                       VALUES (@guildId, @type, @channelId, @messageId, @payload, @search, @createdAt)`),
    byMessage: d.prepare(`SELECT * FROM log_history WHERE guild_id = ? AND message_id = ?`),
    restored: d.prepare(`UPDATE log_history SET message_id = ?, deleted_count = deleted_count + 1,
                         last_deleted_by = ?, last_deleted_at = ? WHERE id = ?`),
    prune: d.prepare(`DELETE FROM log_history WHERE created_at < ?`),
    purge: d.prepare(`DELETE FROM log_history WHERE guild_id = ?`)
  };
  return stmts;
}

// Plain text of a payload, used for the dashboard search.
function searchText(payload) {
  const parts = [payload.content || ''];
  for (const e of payload.embeds || []) {
    parts.push(e.title || '', e.description || '', e.author?.name || '', e.footer?.text || '');
    for (const f of e.fields || []) parts.push(f.name || '', f.value || '');
  }
  return parts.join(' ').toLowerCase().slice(0, 4000);
}

// Normalises any embed (plain object or EmbedBuilder) to plain JSON.
function plainPayload(message) {
  const embeds = (message.embeds || []).map(e => (typeof e?.toJSON === 'function' ? e.toJSON() : e));
  return JSON.parse(JSON.stringify({ content: message.content || undefined, embeds }));
}

function record({ guildId, type, channelId, messageId, message }) {
  try {
    const payload = plainPayload(message);
    q().insert.run({
      guildId, type, channelId: channelId || null, messageId: messageId || null,
      payload: JSON.stringify(payload), search: searchText(payload), createdAt: Date.now()
    });
  } catch (e) { logger.error('Failed to record log history:', e.message); }
}

function rowOut(r) {
  return {
    id: r.id, type: r.log_type, channelId: r.channel_id, createdAt: r.created_at,
    payload: JSON.parse(r.payload), deletedCount: r.deleted_count,
    lastDeletedBy: r.last_deleted_by, lastDeletedAt: r.last_deleted_at
  };
}

// Newest first, keyset-paginated with `before` (row id).
function list(guildId, { type = '', search = '', before = 0, limit = 50 } = {}) {
  const where = ['guild_id = ?'];
  const args = [guildId];
  if (type) { where.push('log_type = ?'); args.push(type); }
  if (search) { where.push('search LIKE ?'); args.push(`%${String(search).toLowerCase().slice(0, 100).replace(/[%_]/g, '')}%`); }
  if (before) { where.push('id < ?'); args.push(Number(before)); }
  const lim = Math.min(100, Math.max(1, Number(limit) || 50));
  const rows = getDb().prepare(`SELECT * FROM log_history WHERE ${where.join(' AND ')} ORDER BY id DESC LIMIT ${lim + 1}`).all(...args);
  return { entries: rows.slice(0, lim).map(rowOut), hasMore: rows.length > lim };
}

// Called for every deleted message. If it was one of our log messages, post it
// again and note who deleted it. Returns true when the message was a log entry.
async function onLogDeleted(client, guild, messageId, executorHint) {
  let row;
  try { row = q().byMessage.get(guild.id, messageId); } catch { return false; }
  if (!row) return false;

  let executor = executorHint;
  if (executor === undefined) {
    try {
      const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.MessageDelete, limit: 5 });
      const entry = logs.entries.find(e => e.target?.id === client.user.id && Date.now() - e.createdTimestamp < 15000);
      executor = entry?.executor || null;
    } catch { executor = null; }
  }
  if (executor?.id === client.user.id) return true; // the bot cleaned up its own message

  const channel = guild.channels.cache.get(row.channel_id);
  if (!channel?.isTextBased?.()) return true;
  const payload = JSON.parse(row.payload);
  const who = executor ? `${executor} (\`${executor.id}\`)` : 'an unknown user';
  const notice = `⚠️ This log entry was deleted by ${who} and has been restored.`;
  const sent = await channel.send({
    content: payload.content ? `${notice}\n${payload.content}` : notice,
    embeds: payload.embeds || [],
    allowedMentions: { parse: [] }
  }).catch(() => null);
  if (sent) q().restored.run(sent.id, executor?.id || null, Date.now(), row.id);
  return true;
}

function prune() {
  try {
    const n = q().prune.run(Date.now() - RETENTION_DAYS * DAY_MS).changes;
    if (n) logger.info(`Log history: pruned ${n} entr${n === 1 ? 'y' : 'ies'} older than ${RETENTION_DAYS} days.`);
  } catch (e) { logger.error('Log history prune failed:', e.message); }
}

function purgeGuild(guildId) {
  try { q().purge.run(guildId); } catch {}
}

// Prune shortly after start-up, then every 6 hours.
setTimeout(prune, 30_000).unref?.();
setInterval(prune, 6 * 60 * 60 * 1000).unref?.();

module.exports = { record, list, onLogDeleted, prune, purgeGuild, RETENTION_DAYS };
