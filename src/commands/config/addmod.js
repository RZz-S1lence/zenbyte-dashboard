const { SlashCommandBuilder, PermissionFlagsBits, Role } = require('discord.js');
const embeds = require('../../utils/embeds');

module.exports = {
  category: 'Config',
  adminOnly: true,
  data: new SlashCommandBuilder()
    .setName('addmod')
    .setDescription('Add a user or role as a bot moderator')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addMentionableOption(o => o.setName('target').setDescription('User or role to add').setRequired(true)),

  async execute(interaction, client) {
    const target = interaction.options.getMentionable('target');
    const { moderators } = client.store;

    if (!moderators.has(interaction.guildId)) moderators.set(interaction.guildId, { users: [], roles: [] });
    const mods = moderators.get(interaction.guildId);
    const isRole = target instanceof Role;
    const bucket = isRole ? mods.roles : mods.users;

    if (bucket.includes(target.id))
      return interaction.reply({ embeds: [embeds.error(`${target} is already a moderator.`)], ephemeral: true });

    bucket.push(target.id);
    client.store.saveModerators();
    await interaction.reply({ embeds: [embeds.success(`Added ${isRole ? 'role' : ''} ${target} as a moderator.`)] });
  }
};
