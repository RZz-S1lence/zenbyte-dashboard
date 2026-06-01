const { Events, AuditLogEvent } = require('discord.js');
const { getRecentExecutor } = require('../utils/audit');
const antinuke = require('../security/antinuke');

module.exports = {
  name: Events.GuildEmojiDelete,
  async execute(client, emoji) {
    const executor = await getRecentExecutor(emoji.guild, AuditLogEvent.EmojiDelete);
    if (executor) await antinuke.track(client, emoji.guild, 'emojiDelete', executor);
  }
};
