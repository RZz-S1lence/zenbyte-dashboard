const { SlashCommandBuilder, PermissionFlagsBits, Role } = require('discord.js');
const embeds = require('../../utils/embeds');

module.exports = {
  category: 'Config',
  adminOnly: true,
  data: new SlashCommandBuilder()
    .setName('removemod')
    .setDescription('Remove a user or role from the bot moderators')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addMentionableOption(o => o.setName('target').setDescription('User or role to remove').setRequired(true)),

  async execute(interaction, client) {
    const target = interaction.options.getMentionable('target');
    const mods = client.store.moderators.get(interaction.guildId);

    if (!mods)
      return interaction.reply({ embeds: [embeds.error('No moderators are configured in this server.')], ephemeral: true });

    const isRole = target instanceof Role;
    const bucket = isRole ? mods.roles : mods.users;
    const index  = bucket.indexOf(target.id);

    if (index === -1)
      return interaction.reply({ embeds: [embeds.error(`${target} is not a moderator.`)], ephemeral: true });

    bucket.splice(index, 1);
    client.store.saveModerators();
    await interaction.reply({ embeds: [embeds.success(`Removed ${isRole ? 'role' : ''} ${target} from moderators.`)] });
  }
};
