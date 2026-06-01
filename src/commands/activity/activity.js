const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../utils/embeds');
const activity = require('../../activity/service');
const { formatDuration } = require('../../utils/time');

const SCOPE_LABEL = { all: 'All-Time', weekly: 'This Week', monthly: 'This Month' };

module.exports = {
  category: 'Activity',
  cooldown: 5,
  aliases: ['act'],
  data: new SlashCommandBuilder()
    .setName('activity')
    .setDescription('Show a member’s activity (messages, voice, reactions)')
    .addUserOption(o => o.setName('user').setDescription('Member to view').setRequired(false))
    .addStringOption(o => o.setName('scope').setDescription('Time range').setRequired(false)
      .addChoices(
        { name: 'All-Time', value: 'all' },
        { name: 'This Week', value: 'weekly' },
        { name: 'This Month', value: 'monthly' }
      )),

  async execute(interaction, client) {
    const target = interaction.options.getUser('user') || interaction.user;
    const scope  = (interaction.options.getString('scope') || 'all').toLowerCase();
    if (target.bot)
      return interaction.reply({ embeds: [embeds.error('Bots are not tracked.')], ephemeral: true });

    const a = activity.activityOf(client, interaction.guild, target.id, scope);
    await interaction.reply({
      embeds: [embeds.custom({
        title: `📈 Activity · ${target.username}`,
        description: `**${SCOPE_LABEL[scope]}**`,
        color: embeds.COLORS.brand,
        thumbnail: { url: target.displayAvatarURL() },
        fields: [
          { name: 'Activity Score', value: `**${a.score.toLocaleString()}**`, inline: true },
          { name: 'Rank', value: a.rank ? `#${a.rank} / ${a.total}` : 'Unranked', inline: true },
          { name: '​', value: '​', inline: true },
          { name: '💬 Messages', value: a.messages.toLocaleString(), inline: true },
          { name: '🔊 Voice Time', value: a.voiceMinutes ? formatDuration(a.voiceMinutes * 60000) : '0m', inline: true },
          { name: '⭐ Reactions', value: a.reactions.toLocaleString(), inline: true }
        ],
        footer: a.lastSeen ? { text: 'Last active' } : undefined,
        timestamp: a.lastSeen ? new Date(a.lastSeen) : undefined
      })]
    });
  }
};
