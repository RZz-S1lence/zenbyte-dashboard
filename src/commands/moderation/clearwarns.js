const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const embeds = require('../../utils/embeds');

module.exports = {
  category: 'Moderation',
  cooldown: 3,
  adminOnly: true,
  data: new SlashCommandBuilder()
    .setName('clearwarns')
    .setDescription('Clear warnings for a member, or purge warnings from members who left')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(o => o.setName('user').setDescription('User to clear (leave empty to purge members who left)').setRequired(false)),

  async execute(interaction, client) {
    const user = interaction.options.getUser('user');
    const guildWarnings = client.store.warnings.get(interaction.guildId);

    if (!guildWarnings || guildWarnings.size === 0)
      return interaction.reply({ embeds: [embeds.success('No warnings exist in this server.')], ephemeral: true });

    // No user → purge warnings belonging to members who have left.
    if (!user) {
      const members = await interaction.guild.members.fetch();
      let cleared = 0;
      for (const [userId, warns] of guildWarnings) {
        if (!members.has(userId)) { cleared += warns.length; guildWarnings.delete(userId); }
      }
      client.store.saveWarnings();
      return interaction.reply({
        embeds: [embeds.success(cleared === 0
          ? 'No warnings from departed members were found.'
          : `Purged **${cleared}** warning(s) from members who have left.`)]
      });
    }

    const list = guildWarnings.get(user.id) || [];
    if (!list.length)
      return interaction.reply({ embeds: [embeds.success(`**${user.tag}** has no warnings to clear.`)], ephemeral: true });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`clearwarns:confirm:${user.id}:${interaction.user.id}`)
        .setLabel(`Clear ${list.length} warning(s)`).setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`clearwarns:cancel:${user.id}:${interaction.user.id}`)
        .setLabel('Cancel').setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({
      embeds: [embeds.warn(`Clear **${list.length}** warning(s) for **${user.tag}**? This cannot be undone.`)],
      components: [row]
    });
  },

  // Routed from componentRouter for customIds beginning with "clearwarns:"
  async handleComponent(interaction, client) {
    const [, action, targetId, modId] = interaction.customId.split(':');

    if (interaction.user.id !== modId)
      return interaction.reply({ embeds: [embeds.error('Only the moderator who ran the command can confirm this.')], ephemeral: true });

    if (action === 'cancel')
      return interaction.update({ embeds: [embeds.error('Cancelled. No warnings were cleared.')], components: [] });

    const guildWarnings = client.store.warnings.get(interaction.guildId);
    const count = guildWarnings?.get(targetId)?.length || 0;
    guildWarnings?.delete(targetId);
    client.store.saveWarnings();

    await interaction.update({
      embeds: [embeds.success(`Cleared **${count}** warning(s) for <@${targetId}>.`)],
      components: []
    });
  }
};
