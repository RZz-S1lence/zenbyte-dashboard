const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const embeds = require('../../utils/embeds');
const leveling = require('../../leveling/service');
const { renderRankCard } = require('../../leveling/rankcard');

module.exports = {
  category: 'Leveling',
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Show your level, XP and rank')
    .addUserOption(o => o.setName('user').setDescription('Member to view').setRequired(false)),

  async execute(interaction, client) {
    const target = interaction.options.getUser('user') || interaction.user;
    if (target.bot)
      return interaction.reply({ embeds: [embeds.error('Bots do not earn XP.')], ephemeral: true });

    const cfg  = client.levels.getConfig(interaction.guildId);
    const info = leveling.rankOf(client, interaction.guild, target.id);

    await interaction.deferReply();
    try {
      const buffer = await renderRankCard({
        username:  target.username,
        avatarUrl: target.displayAvatarURL({ extension: 'png', size: 128 }),
        level:     info.level,
        rank:      info.rank,
        current:   info.current,
        required:  info.required,
        accent:    cfg.rankCard.accent
      });
      await interaction.editReply({ files: [new AttachmentBuilder(buffer, { name: 'rank.png' })] });
    } catch {
      await interaction.editReply({
        embeds: [embeds.custom({
          title: `📊 ${target.username}`,
          color: embeds.COLORS.brand,
          fields: [
            { name: 'Level', value: String(info.level), inline: true },
            { name: 'Rank',  value: info.rank ? `#${info.rank}` : 'Unranked', inline: true },
            { name: 'XP',    value: `${info.current} / ${info.required}`, inline: true }
          ]
        })]
      });
    }
  }
};
