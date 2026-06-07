const { ruleMatches, embedHasContent } = require('./config');
const logger = require('../utils/logger');

// Per-rule cooldown tracking: "guildId:ruleId" -> last fire timestamp.
const lastFired = new Map();

// Substitutes the small set of placeholders supported in responses.
function applyPlaceholders(text, message) {
  if (!text) return text;
  return text
    .replace(/\{user\}/g, `<@${message.author.id}>`)
    .replace(/\{username\}/g, message.author.username)
    .replace(/\{server\}/g, message.guild?.name || '')
    .replace(/\{channel\}/g, `<#${message.channel.id}>`)
    .replace(/\{membercount\}/gi, String(message.guild?.memberCount ?? ''));
}

// Converts a stored embed object into the embed Discord expects, dropping empty
// sections so we never send an invalid (empty) embed.
function buildEmbed(embed, message) {
  if (!embedHasContent(embed)) return null;
  const out = { color: parseInt((embed.color || '#5865F2').slice(1), 16) };
  if (embed.title) out.title = applyPlaceholders(embed.title, message);
  if (embed.url) out.url = embed.url;
  if (embed.description) out.description = applyPlaceholders(embed.description, message);
  if (embed.author?.name) {
    out.author = { name: applyPlaceholders(embed.author.name, message) };
    if (embed.author.iconUrl) out.author.icon_url = embed.author.iconUrl;
    if (embed.author.url) out.author.url = embed.author.url;
  }
  if (embed.fields?.length) {
    out.fields = embed.fields.map(f => ({
      name: applyPlaceholders(f.name, message),
      value: applyPlaceholders(f.value, message),
      inline: !!f.inline
    }));
  }
  if (embed.image?.url) out.image = { url: embed.image.url };
  if (embed.thumbnail?.url) out.thumbnail = { url: embed.thumbnail.url };
  if (embed.footer?.text) {
    out.footer = { text: applyPlaceholders(embed.footer.text, message) };
    if (embed.footer.iconUrl) out.footer.icon_url = embed.footer.iconUrl;
  }
  if (embed.timestamp) out.timestamp = new Date().toISOString();
  return out;
}

// Builds the message payload for a matched rule, or null if it has no content.
function buildPayload(rule, message) {
  if (rule.responseType === 'embed') {
    const embed = buildEmbed(rule.embed, message);
    return embed ? { embeds: [embed] } : null;
  }
  const content = applyPlaceholders(rule.text, message);
  return content.trim() ? { content: content.slice(0, 2000), allowedMentions: { parse: ['users'] } } : null;
}

function onCooldown(guildId, rule) {
  if (!rule.cooldownSec) return false;
  const key = `${guildId}:${rule.id}`;
  const last = lastFired.get(key) || 0;
  return Date.now() - last < rule.cooldownSec * 1000;
}

// Runs the configured auto responses against an incoming message. Returns true if
// a response was sent. Designed to bail out as early as possible so guilds with no
// rules pay almost nothing per message.
async function handleMessage(client, message) {
  if (message.author.bot || !message.inGuild()) return false;
  if (!message.content) return false; // nothing to match (e.g. attachment-only)

  const rules = client.autoresponses.enabled(message.guild.id);
  if (!rules.length) return false;

  for (const rule of rules) {
    if (rule.channelIds.length && !rule.channelIds.includes(message.channel.id)) continue;
    if (rule.ignoreRoleIds.length && message.member &&
        rule.ignoreRoleIds.some(id => message.member.roles.cache.has(id))) continue;
    if (!ruleMatches(rule, message.content)) continue;
    if (onCooldown(message.guild.id, rule)) return false;

    const payload = buildPayload(rule, message);
    if (!payload) continue;

    // Verify the bot can actually post before doing any side effects.
    const me = message.guild.members.me;
    if (me && message.channel.permissionsFor?.(me)?.has('SendMessages') === false) return false;

    try {
      if (rule.reply && !rule.deleteTrigger) {
        await message.reply({ ...payload, allowedMentions: { ...(payload.allowedMentions || {}), repliedUser: false } });
      } else {
        await message.channel.send(payload);
      }
      lastFired.set(`${message.guild.id}:${rule.id}`, Date.now());
      if (rule.deleteTrigger) await message.delete().catch(() => {});
      logger.debug(`Auto response "${rule.name || rule.trigger}" fired in ${message.guild.name}.`);
    } catch (e) {
      logger.debug(`Auto response failed in ${message.guild.id}: ${e.message}`);
    }
    return true; // one response per message
  }
  return false;
}

module.exports = { handleMessage, buildPayload, buildEmbed, applyPlaceholders };
