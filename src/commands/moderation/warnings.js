const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');

module.exports = {
  category: 'Moderation',
  cooldown: 3,
  modPermission: PermissionFlagsBits.ModerateMembers,
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View the warnings of a member')
    .addUserOption(o => o.setName('user').setDescription('The user to inspect (defaults to yourself)').setRequired(false)),

  async execute(interaction, client) {
    const user = interaction.options.getUser('user') || interaction.user;
    const guildWarnings = client.store.warnings.get(interaction.guildId);
    const list = guildWarnings?.get(user.id) || [];

    if (!list.length)
      return interaction.reply({ embeds: [embeds.success(`**${user.tag}** has no warnings.`)], ephemeral: true });

    const description = list.map((w, i) =>
      `\`#${i + 1}\` <t:${Math.floor(w.timestamp / 1000)}:f> • ${w.moderator} • *${w.reason}*`
    ).join('\n');

    await interaction.reply({
      embeds: [embeds.custom({
        author: { name: `${user.tag} · ${list.length} warning(s)`, icon_url: user.displayAvatarURL() },
        description,
        color: embeds.COLORS.warn,
        footer: { text: `Requested by ${interaction.user.tag}` }
      })],
      ephemeral: true
    });
  }
};
