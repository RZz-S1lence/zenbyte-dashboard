const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');

module.exports = {
  category: 'Config',
  cooldown: 3,
  adminOnly: true,
  data: new SlashCommandBuilder()
    .setName('modlist')
    .setDescription('List all bot moderators')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    const mods = client.store.moderators.get(interaction.guildId);

    if (!mods || (mods.users.length === 0 && mods.roles.length === 0))
      return interaction.reply({ embeds: [embeds.info('No moderators are configured. Use `/addmod` to add some.')], ephemeral: true });

    await interaction.reply({
      embeds: [embeds.custom({
        title: '🛡️ Server Moderators',
        color: embeds.COLORS.brand,
        fields: [
          { name: 'Users', value: mods.users.length ? mods.users.map(id => `<@${id}>`).join('\n') : 'None', inline: true },
          { name: 'Roles', value: mods.roles.length ? mods.roles.map(id => `<@&${id}>`).join('\n') : 'None', inline: true }
        ]
      })],
      ephemeral: true
    });
  }
};
