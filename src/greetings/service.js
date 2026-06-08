const { PermissionFlagsBits } = require('discord.js');
const logger = require('../utils/logger');

const colorInt = hex => parseInt(String(hex || '#5865F2').replace('#', ''), 16);

// Substitutes the supported placeholders. `member` only needs id + user here, so a
// lightweight stand-in (e.g. the bot user, for test sends) works too.
function applyPlaceholders(text, member, guild) {
  if (!text) return text;
  return text
    .replace(/{user}/g, `<@${member.id}>`)
    .replace(/{username}/g, member.user.username)
    .replace(/{tag}/g, member.user.tag)
    .replace(/{server}/g, guild.name)
    .replace(/{membercount}/g, String(guild.memberCount ?? guild.members?.cache?.size ?? 0));
}

// Builds the message payload for a configured greeting, or null when there is
// nothing to send (disabled elsewhere; here we only guard against empty content).
function buildPayload(msg, member, guild) {
  if (msg.mode === 'text') {
    const content = applyPlaceholders(msg.text, member, guild).trim();
    if (!content) return null;
    return { content: content.slice(0, 2000), allowedMentions: { parse: ['users'] } };
  }

  const e = msg.embed;
  const embed = { color: colorInt(e.color) };
  if (e.title)       embed.title = applyPlaceholders(e.title, member, guild).slice(0, 256);
  if (e.description) embed.description = applyPlaceholders(e.description, member, guild).slice(0, 4000);
  const thumb = e.thumbnail === 'avatar' ? member.user.displayAvatarURL() : e.thumbnail;
  if (thumb) embed.thumbnail = { url: thumb };
  if (e.image)  embed.image = { url: e.image };
  if (e.footer) embed.footer = { text: applyPlaceholders(e.footer, member, guild).slice(0, 2048) };
  if (e.showTimestamp) embed.timestamp = new Date();

  if (!embed.title && !embed.description && !embed.image && !embed.thumbnail && !embed.footer) return null;

  const payload = { embeds: [embed], allowedMentions: { parse: ['users'] } };
  // An optional text line is posted above the embed, handy for pinging the member.
  const content = applyPlaceholders(msg.text, member, guild).trim();
  if (content) payload.content = content.slice(0, 2000);
  return payload;
}

async function send(client, member, which) {
  try {
    const cfg = client.store.getGreetingsConfig(member.guild.id)[which];
    if (!cfg?.enabled || !cfg.channelId) return;
    const channel = member.guild.channels.cache.get(cfg.channelId);
    if (!channel || typeof channel.send !== 'function') return;
    const me = member.guild.members.me;
    if (me && !channel.permissionsFor(me)?.has(PermissionFlagsBits.SendMessages)) return;

    const payload = buildPayload(cfg, member, member.guild);
    if (!payload) return;
    await channel.send(payload);
  } catch (e) {
    logger.debug(`Greeting (${which}) failed in ${member.guild?.id}: ${e.message}`);
  }
}

module.exports = {
  applyPlaceholders,
  buildPayload,
  sendWelcome: (client, member) => send(client, member, 'welcome'),
  sendLeave:   (client, member) => send(client, member, 'leave')
};
