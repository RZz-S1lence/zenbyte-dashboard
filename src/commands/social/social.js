const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');
const social = require('../../social/service');
const { PROVIDERS, BY_ID } = require('../../social/providers');

const platformChoices = PROVIDERS.map(p => ({ name: p.label, value: p.id }));
const platformOption = o => o.setName('platform').setDescription('Which platform').setRequired(true).addChoices(...platformChoices);

module.exports = {
  category: 'Social',
  cooldown: 3,
  permissions: [PermissionFlagsBits.ManageGuild],
  data: new SlashCommandBuilder()
    .setName('social')
    .setDescription('Manage live and post notifications for social media creators')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(s => s.setName('add').setDescription('Follow a creator')
      .addStringOption(platformOption)
      .addStringOption(o => o.setName('account').setDescription('Username, handle, subreddit or URL').setRequired(true)))
    .addSubcommand(s => s.setName('remove').setDescription('Stop following a creator')
      .addStringOption(platformOption)
      .addStringOption(o => o.setName('account').setDescription('The creator name or key shown in /social list').setRequired(true)))
    .addSubcommand(s => s.setName('channel').setDescription('Set the channel notifications are posted to, and enable the platform')
      .addStringOption(platformOption)
      .addChannelOption(o => o.setName('channel').setDescription('Channel for notifications').setRequired(true))
      .addRoleOption(o => o.setName('role').setDescription('Role to mention (optional)').setRequired(false)))
    .addSubcommand(s => s.setName('list').setDescription('Show the current notification setup'))
    .addSubcommand(s => s.setName('test').setDescription('Send a sample notification')
      .addStringOption(platformOption)),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'add') {
      const platform = interaction.options.getString('platform');
      const res = await social.addCreator(client, interaction.guildId, platform, interaction.options.getString('account'));
      if (res.error) return interaction.reply({ embeds: [embeds.error(res.error)], ephemeral: true });
      const pc = client.social.getConfig(interaction.guildId).platforms[platform];
      const note = pc.channelId ? '' : `\n\nSet a channel with \`/social channel ${platform} #channel\` so alerts can be posted.`;
      return interaction.reply({ embeds: [embeds.success(`Now following **${res.name}** on ${BY_ID[platform].label}.${note}`)], ephemeral: true });
    }

    if (sub === 'remove') {
      const platform = interaction.options.getString('platform');
      const ok = social.removeCreator(client, interaction.guildId, platform, interaction.options.getString('account'));
      return interaction.reply({ embeds: [ok ? embeds.success('Removed.') : embeds.error('No matching creator was found on that platform.')], ephemeral: true });
    }

    if (sub === 'channel') {
      const platform = interaction.options.getString('platform');
      const channel = interaction.options.getChannel('channel');
      const role = interaction.options.getRole('role');
      if (!channel.isTextBased())
        return interaction.reply({ embeds: [embeds.error('Pick a text channel.')], ephemeral: true });
      const config = client.social.getConfig(interaction.guildId);
      const pc = config.platforms[platform];
      pc.enabled = true;
      pc.channelId = channel.id;
      if (role) pc.mentionRoleId = role.id;
      client.social.setConfig(interaction.guildId, config);
      return interaction.reply({ embeds: [embeds.success(`${BY_ID[platform].label} notifications will post in ${channel}${role ? ` and mention ${role}` : ''}.`)], ephemeral: true });
    }

    if (sub === 'test') {
      const platform = interaction.options.getString('platform');
      const res = await social.sendTest(client, interaction.guild, platform);
      return interaction.reply({ embeds: [res.error ? embeds.error(res.error) : embeds.success('Test notification sent.')], ephemeral: true });
    }

    // list
    const config = client.social.getConfig(interaction.guildId);
    const fields = PROVIDERS.map(p => {
      const pc = config.platforms[p.id];
      const head = pc.enabled && pc.channelId ? `<#${pc.channelId}>` : '_not set up_';
      const auth = p.needsAuth && !p.isConfigured() ? ' ⚠️ needs API keys' : '';
      const creators = pc.creators.length ? pc.creators.map(c => `\`${c.name}\``).join(', ') : '_none_';
      return { name: `${p.emoji} ${p.label}${auth}`, value: `Channel: ${head}\nFollowing: ${creators}` };
    });
    return interaction.reply({
      embeds: [embeds.custom({ title: '📡 Social Notifications', color: embeds.COLORS.brand, fields })],
      ephemeral: true
    });
  }
};
