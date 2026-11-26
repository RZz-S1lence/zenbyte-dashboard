const { Events } = require('discord.js');
const automod = require('../automod/service');
const logger = require('../utils/logger');

module.exports = {
  name: Events.MessageCreate,
  async execute(client, message) {
    try { await automod.onMessage(client, message); }
    catch (e) { logger.error('AutoMod error:', e.message); }
  }
};
