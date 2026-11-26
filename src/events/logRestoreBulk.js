const { Events, AuditLogEvent } = require('discord.js');
const history = require('../logging/history');
const { getRecentExecutor } = require('../utils/audit');
const logger = require('../utils/logger');

// Restores log messages removed by a bulk delete (e.g. a purge command).
module.exports = {
  name: Events.MessageBulkDelete,
  async execute(client, messages, channel) {
    try {
      const guild = channel?.guild;
      if (!guild) return;
      const executor = await getRecentExecutor(guild, AuditLogEvent.MessageBulkDelete, 15000);
      // Oldest first so restored logs keep their original order.
      const ids = [...messages.keys()].sort((a, b) => (BigInt(a) < BigInt(b) ? -1 : 1));
      for (const id of ids) {
        const m = messages.get(id);
        if (m?.author && m.author.id !== client.user.id) continue;
        await history.onLogDeleted(client, guild, id, executor);
      }
    } catch (e) { logger.error('Log restore (bulk) failed:', e.message); }
  }
};
