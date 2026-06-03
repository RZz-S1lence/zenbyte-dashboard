const { Events, ActivityType } = require('discord.js');
const fs   = require('fs');
const path = require('path');
const deployCommands = require('../core/deploy');
const leveling = require('../leveling/service');
const activity = require('../activity/service');
const polls = require('../polls/service');
const social = require('../social/service');
const memberCounter = require('../membercounter/service');
const ticketHandler = require('../handlers/tickets');
const logger = require('../utils/logger');

const ROOT = path.join(__dirname, '..', '..');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    logger.success(`Logged in as ${client.user.tag}`);
    client.user.setActivity('Moderation • /help', { type: ActivityType.Watching });

    await deployCommands(client);

    // Voice tick. XP + activity tracking once per minute for voice members.
    const voiceTimer = setInterval(() => {
      leveling.runVoiceTick(client).catch(() => {});
      try { activity.runVoiceTick(client); } catch {}
    }, 60000);
    voiceTimer.unref?.();

    // Ticket auto-close sweep every 5 minutes.
    const ticketTimer = setInterval(() => ticketHandler.autoCloseSweep(client).catch(() => {}), 300000);
    ticketTimer.unref?.();

    // Poll sweep. post scheduled polls and end timed polls every 30 seconds.
    polls.sweep(client).catch(() => {});
    const pollTimer = setInterval(() => polls.sweep(client).catch(() => {}), 30000);
    pollTimer.unref?.();

    // Social media sweep. check followed creators every 3 minutes.
    const socialTimer = setInterval(() => social.sweep(client).catch(() => {}), 180000);
    socialTimer.unref?.();
    setTimeout(() => social.sweep(client).catch(() => {}), 15000);

    // Live member counters: warm-up pass + periodic refresh (rate-limit aware).
    memberCounter.start(client);

    const tempFile = path.join(ROOT, 'restart-data.json');
    if (!fs.existsSync(tempFile)) return;
    try {
      const data = JSON.parse(fs.readFileSync(tempFile, 'utf8'));
      if (Date.now() - data.timestamp < 60000) {
        const channel = await client.channels.fetch(data.channelId).catch(() => null);
        if (channel) {
          const msgs = await channel.messages.fetch({ limit: 10 });
          for (const [, m] of msgs.filter(m => m.author.id === client.user.id && /restart/i.test(m.embeds[0]?.description || m.content)))
            await m.delete().catch(() => {});
          const ok = await channel.send('✅ **Restart successful!**');
          setTimeout(() => ok.delete().catch(() => {}), 3000);
        }
      }
    } catch (e) {
      logger.error('Restart-data handling failed:', e.message);
    } finally {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    }
  }
};
