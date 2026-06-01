const logger = require('../utils/logger');
const { reactArg, emojiMatches, DEFAULT_COLOR } = require('./config');

// Builds the message payload for a bot-managed panel (embed or plain text).
function buildPanel(menu, guild) {
  const lines = menu.mappings.map(m => {
    const role = guild.roles.cache.get(m.roleId);
    return `${m.emoji} — ${role ? role.toString() : '*(deleted role)*'}`;
  });
  const body = lines.length ? lines.join('\n') : '*No roles configured yet.*';

  if (menu.embed) {
    const color = parseInt((menu.color || DEFAULT_COLOR).slice(1), 16);
    return {
      embeds: [{
        title: menu.title || '🎭 Reaction Roles',
        description: (menu.description ? `${menu.description}\n\n` : '') + body,
        color
      }],
      allowedMentions: { parse: [] }
    };
  }

  const header = (menu.title ? `**${menu.title}**\n` : '') + (menu.description ? `${menu.description}\n\n` : '');
  return { content: header + body, allowedMentions: { parse: [] } };
}

// Posts (managed) or fetches (existing) the panel message, then makes sure the
// bot has reacted with every configured emoji. Mutates menu.messageId when it
// posts a fresh managed message. Returns { message } or { error }.
async function syncPanel(client, guild, menu) {
  const channel = guild.channels.cache.get(menu.channelId);
  if (!channel || typeof channel.send !== 'function')
    return { error: 'That channel no longer exists or is not a text channel.' };

  let message = null;
  if (menu.messageId) message = await channel.messages.fetch(menu.messageId).catch(() => null);

  if (menu.managed) {
    const payload = buildPanel(menu, guild);
    if (message) {
      await message.edit(payload).catch(() => {});
    } else {
      message = await channel.send(payload).catch(e => { logger.debug?.(`RR post failed: ${e.message}`); return null; });
      if (message) menu.messageId = message.id;
    }
  } else if (!message) {
    return { error: 'I could not find that message. Check the message ID and that it is in that channel.' };
  }

  if (!message) return { error: 'I could not post the panel. Check that I can send messages in that channel.' };

  // Add any missing reactions in order.
  for (const m of menu.mappings) {
    const has = message.reactions.cache.some(r => emojiMatches(m, r.emoji));
    if (!has) {
      try { await message.react(reactArg(m)); }
      catch (e) { logger.debug?.(`RR react failed for ${m.emoji}: ${e.message}`); }
    }
  }

  return { message };
}

// Removes the bot's reaction for a mapping that was just deleted (best effort).
async function removeReaction(client, guild, menu, mapping) {
  if (!menu.messageId) return;
  const channel = guild.channels.cache.get(menu.channelId);
  const message = channel && await channel.messages.fetch(menu.messageId).catch(() => null);
  if (!message) return;
  const reaction = message.reactions.cache.find(r => emojiMatches(mapping, r.emoji));
  if (reaction) await reaction.remove().catch(() => {});
}

// Core add/remove logic, shared by the reaction add and remove events.
async function handleReaction(client, reaction, user, added) {
  if (user.bot) return;
  const message = reaction.message;
  const guild = message.guild;
  if (!guild) return;

  const menu = client.reactionroles.findByMessage(guild.id, message.id);
  if (!menu) return;

  const mapping = menu.mappings.find(m => emojiMatches(m, reaction.emoji));
  if (!mapping) return;

  const member = await guild.members.fetch(user.id).catch(() => null);
  if (!member) return;

  const role = guild.roles.cache.get(mapping.roleId);
  if (!role) return;

  const me = guild.members.me;
  if (me && role.position >= me.roles.highest.position) {
    logger.debug?.(`RR: cannot assign ${role.name}; it is above my top role.`);
    return;
  }

  // Decide whether this event should grant or remove the role, per mode.
  const grant  = (added  && (menu.mode === 'normal' || menu.mode === 'unique' || menu.mode === 'verify'))
              || (!added && menu.mode === 'reversed');
  const revoke = (!added && (menu.mode === 'normal' || menu.mode === 'unique'))
              || (added  && menu.mode === 'reversed');

  try {
    if (grant && !member.roles.cache.has(role.id)) await member.roles.add(role, 'Reaction role');
    if (revoke && member.roles.cache.has(role.id)) await member.roles.remove(role, 'Reaction role');
  } catch (e) {
    logger.debug?.(`RR role change failed for ${member.user.tag}: ${e.message}`);
  }

  // Unique mode: when a role is granted, clear the member's other roles and
  // reactions from this same panel so only one stays selected.
  if (added && grant && menu.mode === 'unique') {
    for (const other of menu.mappings) {
      if (other === mapping || other.roleId === mapping.roleId) continue;
      const otherRole = guild.roles.cache.get(other.roleId);
      if (otherRole && member.roles.cache.has(otherRole.id))
        await member.roles.remove(otherRole, 'Reaction role (unique)').catch(() => {});
      const otherReaction = message.reactions.cache.find(r => emojiMatches(other, r.emoji));
      if (otherReaction) await otherReaction.users.remove(user.id).catch(() => {});
    }
  }
}

module.exports = { buildPanel, syncPanel, removeReaction, handleReaction };
