// AutoMod runtime: checks every guild message against the enabled filters and
// applies the configured action (delete / warn / timeout / kick / ban).
const { PermissionFlagsBits } = require('discord.js');
const { FILTERS, WORD_LISTS } = require('./config');
const { isPremium } = require('../premium');
const { COLORS } = require('../config');
const logger = require('../utils/logger');

const LABELS = Object.fromEntries(FILTERS.map(f => [f.key, f.label]));

// ── In-memory tracking ────────────────────────────
const recent = new Map();      // `${guildId}:${userId}` -> [{ ts, id, channelId, norm }]
const lastPunish = new Map();  // `${guildId}:${userId}` -> ts of last non-delete action
const inviteCache = new Map(); // invite code -> { guildId, ts }
const TRACK_MS = 60_000;
const PUNISH_COOLDOWN_MS = 8_000;
const INVITE_TTL_MS = 60 * 60_000;

setInterval(() => {
  const now = Date.now();
  for (const [k, list] of recent) {
    const kept = list.filter(e => now - e.ts < TRACK_MS);
    if (kept.length) recent.set(k, kept); else recent.delete(k);
  }
  for (const [k, ts] of lastPunish) if (now - ts > 60_000) lastPunish.delete(k);
  for (const [k, v] of inviteCache) if (now - v.ts > INVITE_TTL_MS) inviteCache.delete(k);
}, 60_000).unref?.();

// ── Text helpers ──────────────────────────────────
const LEET = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i' };
function normalize(text) {
  return String(text || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[​-‍﻿­]/g, '')
    .replace(/[013457@$!]/g, c => LEET[c] || c)
    .replace(/\s+/g, ' ')
    .trim();
}
const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wholeWordRe = word => new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(normalize(word)).replace(/ /g, '\\s+')}(?![\\p{L}\\p{N}])`, 'u');

const INVITE_RE = /(?:https?:\/\/)?(?:www\.)?(?:discord(?:app)?\.com\/invite|discord\.gg)\/([a-z0-9-]+)/gi;
const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>]+/gi;
const CUSTOM_EMOJI_RE = /<a?:\w+:\d+>/g;
const UNICODE_EMOJI_RE = /\p{Extended_Pictographic}/gu;
const MENTION_RE = /<@[!&]?\d+>/g;
const ALWAYS_OK_DOMAINS = ['discord.com', 'discordapp.com', 'discordapp.net', 'discord.gg'];

// Compiled matchers are cached per config object (a new object is stored on every save).
const compiled = new WeakMap();
function matchersFor(wcfg, isPrem) {
  let m = compiled.get(wcfg);
  if (m && m.isPrem === isPrem) return m;
  const custom = wcfg.words.map(w => wcfg.wholeWord ? wholeWordRe(w) : { test: s => s.includes(normalize(w)) });
  const builtin = [...(wcfg.listDe ? WORD_LISTS.de : []), ...(wcfg.listEn ? WORD_LISTS.en : [])].map(wholeWordRe);
  const regex = isPrem ? wcfg.regex.map(src => { try { return new RegExp(src, 'iu'); } catch { return null; } }).filter(Boolean) : [];
  m = { isPrem, custom, builtin, regex };
  compiled.set(wcfg, m);
  return m;
}

function domainOf(url) {
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : `http://${url}`);
    return u.hostname.toLowerCase().replace(/^www\./, '');
  } catch { return ''; }
}
const domainAllowed = (host, list) => list.some(d => host === d || host.endsWith('.' + d));

// ── Exemptions ────────────────────────────────────
function hasAnyRole(member, ids) { return ids.some(id => member.roles.cache.has(id)); }

function globallyExempt(client, message, cfg) {
  const { member, guild, channel } = message;
  if (!member) return true;
  if (member.id === guild.ownerId) return true;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  if (cfg.ignoreMods && (client.store.isModerator(guild.id, member) || member.permissions.has(PermissionFlagsBits.ManageMessages))) return true;
  const chIds = [channel.id, channel.parentId].filter(Boolean);
  if (chIds.some(id => cfg.exemptChannelIds.includes(id))) return true;
  if (hasAnyRole(member, cfg.exemptRoleIds)) return true;
  return false;
}

function filterExempt(message, fcfg, isPrem) {
  if (!isPrem) return false;
  const chIds = [message.channel.id, message.channel.parentId].filter(Boolean);
  if (chIds.some(id => fcfg.exemptChannelIds.includes(id))) return true;
  return hasAnyRole(message.member, fcfg.exemptRoleIds);
}

// ── Checks ────────────────────────────────────────
// Each returns null or { detail, extraIds? } (extraIds = more messages to delete).
async function checkInvites(client, message, f) {
  const codes = [...message.content.matchAll(INVITE_RE)].map(m => m[1]);
  if (!codes.length) return null;
  for (const code of codes) {
    if (f.allowOwnServer) {
      if (message.guild.vanityURLCode && message.guild.vanityURLCode.toLowerCase() === code.toLowerCase()) continue;
      let hit = inviteCache.get(code);
      if (!hit) {
        const inv = await client.fetchInvite(code).catch(() => null);
        hit = { guildId: inv?.guild?.id || null, ts: Date.now() };
        inviteCache.set(code, hit);
      }
      if (hit.guildId === message.guild.id) continue;
    }
    return { detail: `discord.gg/${code}` };
  }
  return null;
}

function checkLinks(message, f) {
  const urls = message.content.match(URL_RE) || [];
  for (const url of urls) {
    if (/discord(?:app)?\.com\/invite|discord\.gg\//i.test(url)) continue; // the invite filter handles these
    const host = domainOf(url);
    if (!host) continue;
    if (domainAllowed(host, ALWAYS_OK_DOMAINS) || domainAllowed(host, f.allowedDomains)) continue;
    return { detail: host };
  }
  return null;
}

function checkWords(message, f, isPrem) {
  const text = normalize(message.content);
  if (!text) return null;
  const m = matchersFor(f, isPrem);
  for (const re of m.custom) if (re.test(text)) return { detail: 'custom word' };
  for (const re of m.builtin) if (re.test(text)) return { detail: 'insult list' };
  for (const re of m.regex) if (re.test(message.content)) return { detail: `pattern ${re.source.slice(0, 40)}` };
  return null;
}

function checkCaps(message, f) {
  const letters = message.content.replace(CUSTOM_EMOJI_RE, '').replace(MENTION_RE, '').match(/\p{L}/gu) || [];
  if (letters.length < f.minLength) return null;
  const upper = letters.filter(c => c !== c.toLowerCase()).length;
  const pct = Math.round((upper / letters.length) * 100);
  return pct >= f.percent ? { detail: `${pct}% caps` } : null;
}

function checkMentions(message, f) {
  const count = (message.content.match(MENTION_RE) || []).length;
  if (count > f.maxMentions) return { detail: `${count} mentions` };
  if (f.blockEveryone && /@(everyone|here)\b/i.test(message.content)
      && !message.member.permissions.has(PermissionFlagsBits.MentionEveryone))
    return { detail: '@everyone / @here' };
  return null;
}

function checkEmojis(message, f) {
  const count = (message.content.match(CUSTOM_EMOJI_RE) || []).length
    + (message.content.replace(CUSTOM_EMOJI_RE, '').match(UNICODE_EMOJI_RE) || []).length;
  return count > f.maxEmojis ? { detail: `${count} emojis` } : null;
}

function checkChars(message, f) {
  const lines = message.content.split('\n').length;
  if (lines > f.maxLines) return { detail: `${lines} lines` };
  const run = message.content.match(/(.)\1+/gsu)?.reduce((max, r) => Math.max(max, [...r].length), 0) || 0;
  return run > f.maxRepeat ? { detail: `${run}x repeated character` } : null;
}

function checkSpam(entries, f) {
  const now = Date.now();
  const burst = entries.filter(e => now - e.ts <= f.perSeconds * 1000);
  return burst.length >= f.maxMessages
    ? { detail: `${burst.length} messages in ${f.perSeconds}s`, extra: burst } : null;
}

function checkDuplicates(entries, f) {
  const last = entries[entries.length - 1];
  if (!last?.norm) return null;
  const run = [];
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].norm !== last.norm || Date.now() - entries[i].ts > 30_000) break;
    run.push(entries[i]);
  }
  return run.length >= f.maxDuplicates ? { detail: `${run.length}x the same message`, extra: run } : null;
}

// ── Actions ───────────────────────────────────────
function resolveAction(member, fcfg, cfg, isPrem) {
  if (isPrem) {
    const o = cfg.roleOverrides.find(x => member.roles.cache.has(x.roleId));
    if (o) return { action: o.action, timeoutMinutes: o.timeoutMinutes };
  }
  return { action: fcfg.action, timeoutMinutes: fcfg.timeoutMinutes };
}

async function deleteMessages(message, extra) {
  const ids = [...new Set([message.id, ...(extra || []).map(e => e.id)])];
  const byChannel = new Map();
  for (const e of extra || []) {
    if (!byChannel.has(e.channelId)) byChannel.set(e.channelId, []);
    byChannel.get(e.channelId).push(e.id);
  }
  if (!byChannel.size) byChannel.set(message.channel.id, ids);
  for (const [chId, list] of byChannel) {
    const ch = message.guild.channels.cache.get(chId);
    if (!ch) continue;
    if (list.length === 1) await ch.messages.delete(list[0]).catch(() => {});
    else await ch.bulkDelete(list, true).catch(() => {});
  }
}

const ACTION_TEXT = { delete: 'Message deleted', warn: 'Warned', timeout: 'Timed out', kick: 'Kicked', ban: 'Banned' };

async function punish(client, message, key, action, timeoutMinutes) {
  const { member, guild } = message;
  const reason = `AutoMod: ${LABELS[key]}`;
  try {
    if (action === 'warn') {
      const w = client.store.warnings;
      if (!w.has(guild.id)) w.set(guild.id, new Map());
      const gw = w.get(guild.id);
      if (!gw.has(member.id)) gw.set(member.id, []);
      gw.get(member.id).push({ moderator: 'AutoMod', moderatorId: client.user.id, reason, timestamp: Date.now() });
      client.store.saveWarnings();
    } else if (action === 'timeout') {
      if (member.moderatable) await member.timeout(timeoutMinutes * 60_000, reason);
      else return 'delete';
    } else if (action === 'kick') {
      if (member.kickable) await member.kick(reason);
      else return 'delete';
    } else if (action === 'ban') {
      if (member.bannable) await guild.members.ban(member.id, { reason });
      else return 'delete';
    }
  } catch (e) {
    logger.warn(`AutoMod could not ${action} ${member.id} in ${guild.id}: ${e.message}`);
    return 'delete';
  }
  return action;
}

async function notify(message, key, done, timeoutMinutes) {
  const extra = done === 'timeout' ? ` You were timed out for ${timeoutMinutes} min.`
    : done === 'warn' ? ' You received a warning.' : '';
  const sent = await message.channel.send({
    content: `${message.author}, your message was removed by AutoMod (${LABELS[key]}).${extra}`,
    allowedMentions: { users: [message.author.id] }
  }).catch(() => null);
  if (sent) setTimeout(() => sent.delete().catch(() => {}), 6000);
}

async function log(client, message, cfg, key, detail, done, timeoutMinutes) {
  if (!cfg.logChannelId) return;
  const ch = message.guild.channels.cache.get(cfg.logChannelId);
  if (!ch?.isTextBased?.()) return;
  const content = message.content ? message.content.slice(0, 1000) : '*(no text)*';
  await ch.send({ embeds: [{
    title: `AutoMod: ${LABELS[key]}`,
    color: done === 'delete' ? COLORS.warn : COLORS.error,
    fields: [
      { name: 'User', value: `${message.author.tag} (\`${message.author.id}\`)`, inline: true },
      { name: 'Channel', value: `<#${message.channel.id}>`, inline: true },
      { name: 'Action', value: done === 'timeout' ? `Timed out (${timeoutMinutes} min)` : ACTION_TEXT[done], inline: true },
      { name: 'Reason', value: detail || LABELS[key] },
      { name: 'Message', value: content }
    ],
    timestamp: new Date().toISOString()
  }] }).catch(() => {});
}

// ── Entry point ───────────────────────────────────
// `edited` = true for message edits: only the content filters run then.
async function onMessage(client, message, { edited = false } = {}) {
  if (!message.inGuild() || message.author?.bot || message.webhookId || !client.automod) return false;
  const cfg = client.automod.get(message.guild.id);
  if (!cfg.enabled) return false;
  if (!message.member || globallyExempt(client, message, cfg)) return false;

  const isPrem = await isPremium(message.guild.id).catch(() => false);
  const F = cfg.filters;
  const key = `${message.guild.id}:${message.author.id}`;

  let entries = [];
  if (!edited) {
    entries = recent.get(key) || [];
    entries.push({ ts: Date.now(), id: message.id, channelId: message.channel.id, norm: normalize(message.content) });
    if (entries.length > 30) entries.splice(0, entries.length - 30);
    recent.set(key, entries);
  }

  const order = edited
    ? ['mentions', 'invites', 'links', 'words', 'caps', 'emojis', 'chars']
    : ['mentions', 'invites', 'links', 'words', 'spam', 'duplicates', 'caps', 'emojis', 'chars'];

  for (const k of order) {
    const f = F[k];
    if (!f?.enabled || filterExempt(message, f, isPrem)) continue;
    let hit = null;
    if (k === 'invites') hit = await checkInvites(client, message, f);
    else if (k === 'links') hit = checkLinks(message, f);
    else if (k === 'words') hit = checkWords(message, f, isPrem);
    else if (k === 'caps') hit = checkCaps(message, f);
    else if (k === 'mentions') hit = checkMentions(message, f);
    else if (k === 'emojis') hit = checkEmojis(message, f);
    else if (k === 'chars') hit = checkChars(message, f);
    else if (k === 'spam') hit = checkSpam(entries, f);
    else if (k === 'duplicates') hit = checkDuplicates(entries, f);
    if (!hit) continue;

    await deleteMessages(message, hit.extra);
    if (hit.extra) recent.set(key, entries.filter(e => !hit.extra.includes(e)));

    let { action, timeoutMinutes } = resolveAction(message.member, f, cfg, isPrem);
    // A burst of messages must not stack several punishments.
    const recentlyPunished = Date.now() - (lastPunish.get(key) || 0) < PUNISH_COOLDOWN_MS;
    let done = 'delete';
    if (action !== 'delete' && !recentlyPunished) {
      done = await punish(client, message, k, action, timeoutMinutes);
      if (done !== 'delete') lastPunish.set(key, Date.now());
    }
    if (cfg.notify && !(recentlyPunished && action !== 'delete')) await notify(message, k, done, timeoutMinutes);
    await log(client, message, cfg, k, hit.detail, done, timeoutMinutes);
    return true;
  }
  return false;
}

module.exports = { onMessage, normalize };
