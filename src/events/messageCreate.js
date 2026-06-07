const { Events } = require('discord.js');
const cooldowns   = require('../middleware/cooldowns');
const permissions = require('../middleware/permissions');
const embeds = require('../utils/embeds');
const logger = require('../utils/logger');
const { buildPrefixContext, PrefixUsageError } = require('../handlers/prefixContext');
const autoresponse = require('../autoresponse/service');
const { prefixEnabled } = require('../config');

let warnedNoContent = false;

module.exports = {
  name: Events.MessageCreate,
  async execute(client, message) {
    if (message.author.bot || !message.inGuild()) return;

    // Auto responses run on every message, independent of the prefix system.
    try { await autoresponse.handleMessage(client, message); }
    catch (e) { logger.debug('Auto-response handling failed:', e.message); }

    if (!prefixEnabled) return;

    // One-time diagnostic: a normal message with no readable content means the
    // privileged Message Content intent is not granted, which silently breaks
    // prefix commands. Surface it once so the operator knows why.
    if (!warnedNoContent && !message.content && !message.attachments.size && !message.embeds.length && !message.stickers.size) {
      warnedNoContent = true;
      logger.warn('Messages are arriving with no content. The "Message Content" intent is likely disabled, so prefix commands will not work. Enable it in the Discord Developer Portal, or set ENABLE_PREFIX_COMMANDS=false to run slash-only.');
    }

    const prefix = client.store.getPrefix(message.guild.id);
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/\s+/);
    const name = args.shift()?.toLowerCase();
    if (!name) return;

    const command = client.commands.get(name)
      || client.commands.find(c => Array.isArray(c.aliases) && c.aliases.includes(name));
    if (!command) return;

    // Owner-only commands silently do nothing for everyone else, as if they do not exist.
    if (command.ownerOnly && !permissions.isOwner(message.author.id)) return;

    if (client.store.isCommandDisabled(message.guild.id, command.data.name))
      return message.reply({ embeds: [embeds.error('This command is disabled in this server.')] }).catch(() => {});

    const perm = permissions.check(command, {
      member: message.member, user: message.author, client, guildId: message.guild.id
    });
    if (!perm.ok) return message.reply({ embeds: [embeds.error(perm.reason)] }).catch(() => {});

    const cd = cooldowns.check(client, command, message.author.id);
    if (!cd.ok)
      return message.reply({ embeds: [embeds.error(`Please wait **${cd.remaining}s** before using \`${prefix}${command.data.name}\` again.`)] }).catch(() => {});

    let ctx;
    try {
      ctx = await buildPrefixContext(message, command, args, client);
    } catch (e) {
      if (e instanceof PrefixUsageError) return message.reply({ embeds: [embeds.error(e.message)] }).catch(() => {});
      logger.error(`Failed to build context for ${prefix}${name}:`, e);
      return;
    }

    try {
      await command.execute(ctx, client);
      logger.debug(`${prefix}${name} used by ${message.author.tag}`);
    } catch (e) {
      logger.error(`${prefix}${name} failed:`, e);
      message.reply({ embeds: [embeds.error('Something went wrong executing that command.')] }).catch(() => {});
    }
  }
};
