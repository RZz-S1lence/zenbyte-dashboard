const { SlashCommandBuilder } = require('discord.js');
const help = require('../../help/service');

module.exports = {
  category: 'System',
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Browse every command by category'),

  async execute(interaction, client) {
    const prefix = client.store.getPrefix(interaction.guildId);
    const view = help.homeView(client, interaction.user.id, interaction.guildId, prefix);
    await interaction.reply({ ...view, ephemeral: true });
  },

  // Routed for customIds beginning with "help:" for category and command navigation.
  async handleComponent(interaction, client) {
    const [, action, viewerId, category] = interaction.customId.split(':');

    if (viewerId && viewerId !== interaction.user.id)
      return interaction.reply({ content: 'This menu belongs to someone else. Run `/help` to open your own.', ephemeral: true });

    const prefix = client.store.getPrefix(interaction.guildId);
    const gid = interaction.guildId;
    let view;
    if (action === 'home')      view = help.homeView(client, interaction.user.id, gid, prefix);
    else if (action === 'cat')  view = help.categoryView(client, interaction.user.id, gid, interaction.values[0], prefix);
    else if (action === 'back') view = help.categoryView(client, interaction.user.id, gid, category, prefix);
    else if (action === 'cmd')  view = help.commandView(client, interaction.user.id, gid, category, interaction.values[0], prefix);
    else return;

    await interaction.update(view);
  }
};
