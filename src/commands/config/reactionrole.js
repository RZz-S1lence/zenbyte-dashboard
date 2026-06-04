const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const embeds = require('../../utils/embeds');
const reactionService = require('../../reactionrole/service');
const { MODES, MODE_VALUES, parseEmoji } = require('../../reactionrole/config');
const { isPremium, limitFor } = require('../../premium');
const { upgradeReply } = require('../../premium/messages');

const MODE_CHOICES = MODES.map(m => ({ name: m.value, value: m.value }));

function menuSummary(menu, guild) {
  const maps = menu.mappings.map(m => {
    const r = guild.roles.cache.get(m.roleId);
    return `${m.emoji} → ${r ? r.toString() : '*(deleted)*'}`;
  }).join('\n') || '*No emoji→role pairs yet. Use `/reactionrole add`.*';
  const where = menu.messageId ? `[message](https://discord.com/channels/${guild.id}/${menu.channelId}/${menu.messageId})` : 'not posted yet';
  return `**\`${menu.id}\`** · mode: \`${menu.mode}\` · <#${menu.channelId}> · ${where}\n${maps}`;
}

module.exports = {
  category: 'Config',
  adminOnly: true,
  data: new SlashCommandBuilder()
    .setName('reactionrole')
    .setDescription('Set up reaction-role panels')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(s => s.setName('create').setDescription('Create a new panel the bot posts and manages')
      .addChannelOption(o => o.setName('channel').setDescription('Where to post the panel').addChannelTypes(ChannelType.GuildText).setRequired(true))
      .addStringOption(o => o.setName('mode').setDescription('Behaviour mode').addChoices(...MODE_CHOICES))
      .addStringOption(o => o.setName('title').setDescription('Panel title'))
      .addStringOption(o => o.setName('description').setDescription('Panel description'))
      .addBooleanOption(o => o.setName('embed').setDescription('Post as an embed (default) or plain text')))
    .addSubcommand(s => s.setName('attach').setDescription('Use an existing message as the panel')
      .addChannelOption(o => o.setName('channel').setDescription('Channel the message is in').addChannelTypes(ChannelType.GuildText).setRequired(true))
      .addStringOption(o => o.setName('message_id').setDescription('ID of the existing message').setRequired(true))
      .addStringOption(o => o.setName('mode').setDescription('Behaviour mode').addChoices(...MODE_CHOICES)))
    .addSubcommand(s => s.setName('add').setDescription('Add an emoji→role pair to a panel')
      .addStringOption(o => o.setName('panel').setDescription('Panel ID (see /reactionrole list)').setRequired(true))
      .addStringOption(o => o.setName('emoji').setDescription('Emoji members react with').setRequired(true))
      .addRoleOption(o => o.setName('role').setDescription('Role to grant for that emoji').setRequired(true)))
    .addSubcommand(s => s.setName('remove').setDescription('Remove an emoji from a panel')
      .addStringOption(o => o.setName('panel').setDescription('Panel ID').setRequired(true))
      .addStringOption(o => o.setName('emoji').setDescription('Emoji to remove').setRequired(true)))
    .addSubcommand(s => s.setName('delete').setDescription('Delete a whole panel')
      .addStringOption(o => o.setName('panel').setDescription('Panel ID').setRequired(true)))
    .addSubcommand(s => s.setName('list').setDescription('List the panels in this server')),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;

    if (sub === 'list') {
      const menus = client.reactionroles.listMenus(guild.id);
      return interaction.reply({
        embeds: [embeds.custom({
          title: '🎭 Reaction-Role Panels',
          description: menus.length ? menus.map(m => menuSummary(m, guild)).join('\n\n') : 'No panels yet. Create one with `/reactionrole create`.',
          color: embeds.COLORS.info
        })],
        ephemeral: true
      });
    }

    // Creating a new panel (managed or attached) counts against the panel limit.
    if (sub === 'create' || sub === 'attach') {
      const prem = await isPremium(guild.id);
      const panelCap = limitFor('reactionPanels', prem);
      if (client.reactionroles.listMenus(guild.id).length >= panelCap)
        return interaction.reply(prem
          ? { embeds: [embeds.error(`This server has reached the maximum of ${panelCap} reaction-role panels.`)], ephemeral: true }
          : upgradeReply('reactionPanels'));
    }

    if (sub === 'create') {
      const channel = interaction.options.getChannel('channel');
      const menu = client.reactionroles.createMenu(guild.id, {
        channelId:   channel.id,
        mode:        interaction.options.getString('mode') || 'normal',
        managed:     true,
        embed:       interaction.options.getBoolean('embed') ?? true,
        title:       interaction.options.getString('title'),
        description: interaction.options.getString('description')
      });
      const res = await reactionService.syncPanel(client, guild, menu);
      client.reactionroles.save();
      if (res.error) return interaction.reply({ embeds: [embeds.error(res.error)], ephemeral: true });
      return interaction.reply({ embeds: [embeds.success(`Panel created in ${channel} with ID \`${menu.id}\`. Add roles with \`/reactionrole add panel:${menu.id} emoji:… role:…\`.`)], ephemeral: true });
    }

    if (sub === 'attach') {
      const channel = interaction.options.getChannel('channel');
      const messageId = interaction.options.getString('message_id').trim();
      if (!/^\d{16,20}$/.test(messageId))
        return interaction.reply({ embeds: [embeds.error('That does not look like a valid message ID.')], ephemeral: true });
      const exists = await channel.messages.fetch(messageId).catch(() => null);
      if (!exists)
        return interaction.reply({ embeds: [embeds.error(`I could not find a message with that ID in ${channel}.`)], ephemeral: true });
      const menu = client.reactionroles.createMenu(guild.id, {
        channelId: channel.id,
        messageId,
        mode:      interaction.options.getString('mode') || 'normal',
        managed:   false
      });
      return interaction.reply({ embeds: [embeds.success(`Attached to that message as panel \`${menu.id}\`. Add roles with \`/reactionrole add panel:${menu.id} emoji:… role:…\`.`)], ephemeral: true });
    }

    // The rest operate on an existing panel.
    const panelId = interaction.options.getString('panel').trim();
    const menu = client.reactionroles.getMenu(guild.id, panelId);
    if (!menu)
      return interaction.reply({ embeds: [embeds.error(`No panel with ID \`${panelId}\`. Use \`/reactionrole list\`.`)], ephemeral: true });

    if (sub === 'delete') {
      client.reactionroles.deleteMenu(guild.id, panelId);
      return interaction.reply({ embeds: [embeds.success(`Panel \`${panelId}\` deleted. ${menu.managed ? 'You can delete its message manually.' : ''}`.trim())], ephemeral: true });
    }

    if (sub === 'add') {
      const role = interaction.options.getRole('role');
      const parsed = parseEmoji(interaction.options.getString('emoji'));
      if (!parsed) return interaction.reply({ embeds: [embeds.error('I could not read that emoji.')], ephemeral: true });
      if (role.managed || role.id === guild.id)
        return interaction.reply({ embeds: [embeds.error('Pick a normal, assignable role.')], ephemeral: true });
      const me = guild.members.me;
      if (me && role.position >= me.roles.highest.position)
        return interaction.reply({ embeds: [embeds.error(`${role} is above my top role. Move my role higher so I can assign it.`)], ephemeral: true });
      const prem = await isPremium(guild.id);
      const mapCap = limitFor('reactionMappings', prem);
      if (menu.mappings.length >= mapCap)
        return interaction.reply(prem
          ? { embeds: [embeds.error(`A panel can hold at most ${mapCap} emoji→role pairs.`)], ephemeral: true }
          : upgradeReply('reactionMappings'));
      if (menu.mappings.some(m => (parsed.id ? m.id === parsed.id : m.name === parsed.name)))
        return interaction.reply({ embeds: [embeds.warn('That emoji is already used on this panel.')], ephemeral: true });

      const mappings = [...menu.mappings, { ...parsed, roleId: role.id }];
      const updated = client.reactionroles.updateMenu(guild.id, panelId, { mappings });
      const res = await reactionService.syncPanel(client, guild, updated);
      client.reactionroles.save();
      if (res.error) return interaction.reply({ embeds: [embeds.error(res.error)], ephemeral: true });
      return interaction.reply({ embeds: [embeds.success(`${parsed.emoji} now grants ${role} on panel \`${panelId}\`.`)], ephemeral: true });
    }

    if (sub === 'remove') {
      const parsed = parseEmoji(interaction.options.getString('emoji'));
      if (!parsed) return interaction.reply({ embeds: [embeds.error('I could not read that emoji.')], ephemeral: true });
      const mapping = menu.mappings.find(m => (parsed.id ? m.id === parsed.id : m.name === parsed.name));
      if (!mapping) return interaction.reply({ embeds: [embeds.warn('That emoji is not on this panel.')], ephemeral: true });

      const mappings = menu.mappings.filter(m => m !== mapping);
      const updated = client.reactionroles.updateMenu(guild.id, panelId, { mappings });
      await reactionService.removeReaction(client, guild, updated, mapping).catch(() => {});
      await reactionService.syncPanel(client, guild, updated).catch(() => {});
      client.reactionroles.save();
      return interaction.reply({ embeds: [embeds.success(`${parsed.emoji} removed from panel \`${panelId}\`.`)], ephemeral: true });
    }
  }
};
