const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');
const altdetect = require('../../altdetect/service');
const { isPrivileged } = require('../../utils/moderation');

module.exports = {
  category: 'Security',
  cooldown: 3,
  modPermission: PermissionFlagsBits.ModerateMembers,
  data: new SlashCommandBuilder()
    .setName('altcheck')
    .setDescription('Run alt / suspicious-account detection on a member')
    .addUserOption(o => o.setName('user').setDescription('Member to analyze').setRequired(true)),

  async execute(interaction, client) {
    const member = interaction.options.getMember('user');
    if (!member)
      return interaction.reply({ embeds: [embeds.error('That user is not a member of this server.')], ephemeral: true });

    const result = await altdetect.analyze(client, interaction.guild, member);
    await interaction.reply({
      embeds: [altdetect.buildFlagEmbed(member, result)],
      components: result.level === 'clear' ? [] : altdetect.reviewComponents(member.id, result.config),
      ephemeral: true
    });
  },

  // Routed for customIds beginning with "altcheck:" for moderator review actions.
  async handleComponent(interaction, client) {
    if (!isPrivileged(interaction.member, client.store))
      return interaction.reply({ embeds: [embeds.error('You need moderator permissions to review flagged accounts.')], ephemeral: true });

    const [, action, userId] = interaction.customId.split(':');
    const reason = `Alt detection review by ${interaction.user.tag}`;

    if (action === 'clear') {
      client.altdetect.setFlagStatus(interaction.guildId, userId, 'cleared', interaction.user.id);
      return interaction.update({
        embeds: [{ ...interaction.message.embeds[0].toJSON(), footer: { text: `Cleared by ${interaction.user.tag}` } }],
        components: []
      });
    }

    const member = await interaction.guild.members.fetch(userId).catch(() => null);
    let outcome;
    if (action === 'ban' && !member) {
      outcome = await interaction.guild.members.ban(userId, { reason }).then(() => 'banned').catch(() => 'failed (ban)');
    } else if (!member) {
      return interaction.reply({ embeds: [embeds.error('That member is no longer in the server.')], ephemeral: true });
    } else {
      outcome = await altdetect.applyAction(client, interaction.guild, member, action, reason);
    }

    client.altdetect.setFlagStatus(interaction.guildId, userId, 'actioned', interaction.user.id);
    await interaction.update({
      embeds: [{ ...interaction.message.embeds[0].toJSON(), footer: { text: `${action} by ${interaction.user.tag} → ${outcome}` } }],
      components: []
    });
  }
};
