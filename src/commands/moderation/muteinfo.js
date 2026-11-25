const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');
const { findMuteRole } = require('../../utils/muteRole');
const muteService = require('../../mute/service');

module.exports = {
  category: 'Moderation',
  cooldown: 3,
  modPermission: PermissionFlagsBits.ModerateMembers,
  data: new SlashCommandBuilder()
    .setName('muteinfo')
    .setDescription('Show details about a member’s mute (who, reason, duration)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName('user').setDescription('Member to look up').setRequired(true)),

  async execute(interaction, client) {
    const user = interaction.options.getUser('user');
    if (!user) return interaction.reply({ embeds: [embeds.error('User not found.')], ephemeral: true });

    const record = client.store.getMute(interaction.guildId, user.id);
    if (record) return interaction.reply({ embeds: [muteService.infoEmbed(user.id, record)], ephemeral: true });

    // No tracked record — they may still hold the role (muted manually / before tracking).
    const role = findMuteRole(interaction.guild, client.store);
    const member = interaction.options.getMember('user');
    if (role && member?.roles.cache.has(role.id))
      return interaction.reply({ embeds: [embeds.warn(`**${user.tag}** is muted, but there are no tracked details (muted manually or before tracking).`)], ephemeral: true });

    return interaction.reply({ embeds: [embeds.info(`**${user.tag}** is not muted.`)], ephemeral: true });
  }
};
