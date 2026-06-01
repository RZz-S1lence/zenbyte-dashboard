const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');
const { getModRoleIds, normalizeTicketConfig } = require('../../utils/tickets');

module.exports = {
  category: 'Config',
  adminOnly: true,
  data: new SlashCommandBuilder()
    .setName('setticketmodrole')
    .setDescription('Add or remove a ticket moderator role (multiple roles are supported)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addRoleOption(o => o.setName('role').setDescription('The moderator role').setRequired(true))
    .addStringOption(o => o.setName('action').setDescription('Add or remove (default: add)')
      .addChoices({ name: 'Add', value: 'add' }, { name: 'Remove', value: 'remove' })),

  async execute(interaction, client) {
    const role   = interaction.options.getRole('role');
    const action = interaction.options.getString('action') || 'add';

    const config = client.store.tickets.get(interaction.guildId) || {};
    const ids = new Set(getModRoleIds(config));

    if (action === 'remove') {
      if (!ids.has(role.id))
        return interaction.reply({ embeds: [embeds.error(`${role} is not a ticket moderator role.`)], ephemeral: true });
      ids.delete(role.id);
    } else {
      if (ids.has(role.id))
        return interaction.reply({ embeds: [embeds.error(`${role} is already a ticket moderator role.`)], ephemeral: true });
      ids.add(role.id);
    }

    config.modRoleIds = [...ids];
    normalizeTicketConfig(config);
    client.store.tickets.set(interaction.guildId, config);
    client.store.saveTickets();

    const list = config.modRoleIds.length ? config.modRoleIds.map(id => `<@&${id}>`).join(', ') : 'None';
    await interaction.reply({
      embeds: [embeds.success(`${action === 'add' ? 'Added' : 'Removed'} ${role}.\n**Current ticket mod roles:** ${list}`)]
    });
  }
};
