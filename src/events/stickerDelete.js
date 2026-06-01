const { Events, AuditLogEvent } = require('discord.js');
const { getRecentExecutor } = require('../utils/audit');
const antinuke = require('../security/antinuke');

module.exports = {
  name: Events.GuildStickerDelete,
  async execute(client, sticker) {
    const executor = await getRecentExecutor(sticker.guild, AuditLogEvent.StickerDelete);
    if (executor) await antinuke.track(client, sticker.guild, 'emojiDelete', executor);
  }
};
