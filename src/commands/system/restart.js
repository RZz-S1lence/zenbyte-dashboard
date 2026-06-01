const { SlashCommandBuilder } = require('discord.js');
const { spawn } = require('child_process');
const fs   = require('fs');
const path = require('path');
const embeds = require('../../utils/embeds');
const logger = require('../../utils/logger');

const ROOT = path.join(__dirname, '..', '..', '..');

module.exports = {
  category: 'System',
  ownerOnly: true,
  data: new SlashCommandBuilder()
    .setName('restart')
    .setDescription('Restart the bot (owner only)'),

  async execute(interaction, client) {
    await interaction.reply({ embeds: [embeds.info('🔄 **Restarting bot...**')] });
    client.levels.flush(); client.activity.flush(); client.altdetect.flush(); client.polls.flush(); client.social.flush();

    fs.writeFileSync(
      path.join(ROOT, 'restart-data.json'),
      JSON.stringify({ channelId: interaction.channelId, timestamp: Date.now() })
    );

    await new Promise(r => setTimeout(r, 500));

    const managed = !!(process.env.MANAGED_BY_STARTER || process.env.PM2_HOME || process.env.pm_id);
    if (!managed) {
      // Started directly (e.g. `node bot.js`). Spawn the watcher detached so it can relaunch us.
      spawn(process.execPath, [path.join(ROOT, 'start.js')], { cwd: ROOT, detached: true, stdio: 'ignore' }).unref();
    }

    logger.warn(`Restart triggered by ${interaction.user.tag}.`);
    process.exit(1);
  }
};
