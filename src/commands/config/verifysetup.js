const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const embeds = require('../../utils/embeds');
const verification = require('../../handlers/verification');

module.exports = {
  category: 'Config',
  adminOnly: true,
  data: new SlashCommandBuilder()
    .setName('verifysetup')
    .setDescription('Set up captcha verification and post the verify panel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(o => o.setName('channel').setDescription('Channel to post the verify panel in')
      .addChannelTypes(ChannelType.GuildText).setRequired(true))
    .addRoleOption(o => o.setName('role').setDescription('Role granted after passing the captcha').setRequired(true))
    .addStringOption(o => o.setName('title').setDescription('Custom panel title').setRequired(false))
    .addStringOption(o => o.setName('description').setDescription('Custom panel description').setRequired(false)),

  async execute(interaction, client) {
    const channel = interaction.options.getChannel('channel');
    const role    = interaction.options.getRole('role');
    const title   = interaction.options.getString('title');
    const desc    = interaction.options.getString('description');

    if (role.managed || role.id === interaction.guild.id)
      return interaction.reply({ embeds: [embeds.error('Pick a normal, assignable role for verification.')], ephemeral: true });

    const me = interaction.guild.members.me;
    if (me && role.position >= me.roles.highest.position)
      return interaction.reply({ embeds: [embeds.error('That role is higher than my top role. Move my role above it so I can assign it.')], ephemeral: true });

    const config = {
      enabled: true,
      channelId: channel.id,
      verifiedRoleId: role.id,
      panelTitle: title || null,
      panelDescription: desc || null
    };
    client.store.verification.set(interaction.guildId, config);
    client.store.saveVerification();

    try {
      await channel.send(verification.buildPanel(config));
    } catch {
      return interaction.reply({ embeds: [embeds.error(`I couldn't post in ${channel}. Check my permissions there.`)], ephemeral: true });
    }

    await interaction.reply({
      embeds: [embeds.success(`Verification enabled. Panel posted in ${channel}; verified members receive ${role}.`)],
      ephemeral: true
    });
  }
};
