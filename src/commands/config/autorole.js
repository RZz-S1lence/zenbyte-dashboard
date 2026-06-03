const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');
const { isPremium, limitFor } = require('../../premium');
const { upgradeReply } = require('../../premium/messages');

function roleList(guild, ids) {
  if (!ids.length) return '*None*';
  return ids.map(id => {
    const r = guild.roles.cache.get(id);
    return r ? r.toString() : `\`${id}\` *(deleted)*`;
  }).join(', ');
}

module.exports = {
  category: 'Config',
  adminOnly: true,
  data: new SlashCommandBuilder()
    .setName('autorole')
    .setDescription('Roles automatically given to members when they join')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(s => s.setName('add').setDescription('Add a role to give on join')
      .addRoleOption(o => o.setName('role').setDescription('Role to grant on join').setRequired(true))
      .addBooleanOption(o => o.setName('bots').setDescription('Give this role to bots instead of people')))
    .addSubcommand(s => s.setName('remove').setDescription('Stop giving a role on join')
      .addRoleOption(o => o.setName('role').setDescription('Role to remove from the list').setRequired(true))
      .addBooleanOption(o => o.setName('bots').setDescription('Remove from the bot list instead of the people list')))
    .addSubcommand(s => s.setName('toggle').setDescription('Turn autoroles on or off')
      .addBooleanOption(o => o.setName('enabled').setDescription('Enable autoroles?').setRequired(true)))
    .addSubcommand(s => s.setName('list').setDescription('Show the current autorole setup')),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;
    const config = client.autoroles.getConfig(guild.id);

    if (sub === 'list') {
      return interaction.reply({
        embeds: [embeds.custom({
          title: '🎭 Autoroles',
          color: config.enabled ? embeds.COLORS.success : embeds.COLORS.error,
          fields: [
            { name: 'Status', value: config.enabled ? '🟢 Enabled' : '🔴 Disabled' },
            { name: 'Roles for people', value: roleList(guild, config.roleIds) },
            { name: 'Roles for bots', value: roleList(guild, config.botRoleIds) }
          ]
        })],
        ephemeral: true
      });
    }

    if (sub === 'toggle') {
      const enabled = interaction.options.getBoolean('enabled');
      client.autoroles.setConfig(guild.id, { ...config, enabled });
      return interaction.reply({ embeds: [embeds.success(`Autoroles are now **${enabled ? 'enabled' : 'disabled'}**.`)], ephemeral: true });
    }

    // add / remove
    const role = interaction.options.getRole('role');
    const forBots = interaction.options.getBoolean('bots') || false;
    const key = forBots ? 'botRoleIds' : 'roleIds';

    if (sub === 'add') {
      if (role.managed || role.id === guild.id)
        return interaction.reply({ embeds: [embeds.error('Pick a normal, assignable role.')], ephemeral: true });
      const me = guild.members.me;
      if (me && role.position >= me.roles.highest.position)
        return interaction.reply({ embeds: [embeds.error(`${role} is above my top role, so I can't assign it. Move my role higher.`)], ephemeral: true });
      if (config[key].includes(role.id))
        return interaction.reply({ embeds: [embeds.warn(`${role} is already in the ${forBots ? 'bot' : 'people'} list.`)], ephemeral: true });

      // Free servers are capped on total autorole roles (people + bots combined).
      const total = config.roleIds.length + config.botRoleIds.length;
      if (!await isPremium(guild.id) && total >= limitFor('autoroleRoles', false))
        return interaction.reply(upgradeReply('autoroleRoles'));

      const updated = { ...config, enabled: true, [key]: [...config[key], role.id] };
      client.autoroles.setConfig(guild.id, updated);
      return interaction.reply({ embeds: [embeds.success(`${role} will now be given to ${forBots ? 'bots' : 'new members'} on join.`)], ephemeral: true });
    }

    if (sub === 'remove') {
      if (!config[key].includes(role.id))
        return interaction.reply({ embeds: [embeds.warn(`${role} is not in the ${forBots ? 'bot' : 'people'} list.`)], ephemeral: true });
      const updated = { ...config, [key]: config[key].filter(id => id !== role.id) };
      client.autoroles.setConfig(guild.id, updated);
      return interaction.reply({ embeds: [embeds.success(`${role} will no longer be given on join.`)], ephemeral: true });
    }
  }
};
