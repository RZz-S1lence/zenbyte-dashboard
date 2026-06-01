const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');
const leveling = require('../../leveling/service');

module.exports = {
  category: 'Leveling',
  cooldown: 2,
  adminOnly: true,
  data: new SlashCommandBuilder()
    .setName('xp')
    .setDescription('Manage member XP and levels')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(s => s.setName('add').setDescription('Add XP to a member')
      .addUserOption(o => o.setName('user').setDescription('Member').setRequired(true))
      .addIntegerOption(o => o.setName('amount').setDescription('XP to add').setRequired(true).setMinValue(1)))
    .addSubcommand(s => s.setName('remove').setDescription('Remove XP from a member')
      .addUserOption(o => o.setName('user').setDescription('Member').setRequired(true))
      .addIntegerOption(o => o.setName('amount').setDescription('XP to remove').setRequired(true).setMinValue(1)))
    .addSubcommand(s => s.setName('set').setDescription("Set a member's total XP")
      .addUserOption(o => o.setName('user').setDescription('Member').setRequired(true))
      .addIntegerOption(o => o.setName('amount').setDescription('Total XP').setRequired(true).setMinValue(0)))
    .addSubcommand(s => s.setName('setlevel').setDescription("Set a member's level")
      .addUserOption(o => o.setName('user').setDescription('Member').setRequired(true))
      .addIntegerOption(o => o.setName('level').setDescription('Level').setRequired(true).setMinValue(0)))
    .addSubcommand(s => s.setName('reset').setDescription('Reset a member, or the whole server if no member is given')
      .addUserOption(o => o.setName('user').setDescription('Member (omit to reset everyone)').setRequired(false))),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;

    if (sub === 'reset') {
      const user = interaction.options.getUser('user');
      if (user) {
        const member = interaction.options.getMember('user');
        if (member) await leveling.resetMember(client, guild, member);
        else client.levels.deleteUser(guild.id, user.id);
        return interaction.reply({ embeds: [embeds.success(`Reset XP for **${user.tag}**.`)], ephemeral: true });
      }
      leveling.resetGuild(client, guild);
      return interaction.reply({ embeds: [embeds.success('Reset **all** XP and levels in this server.')], ephemeral: true });
    }

    const member = interaction.options.getMember('user');
    const user   = interaction.options.getUser('user');
    if (!member)
      return interaction.reply({ embeds: [embeds.error('That user is not a member of this server.')], ephemeral: true });
    if (user.bot)
      return interaction.reply({ embeds: [embeds.error('Bots do not earn XP.')], ephemeral: true });

    let result, verb;
    if (sub === 'add')      { result = await leveling.addXp(client, guild, member, interaction.options.getInteger('amount')); verb = 'Added'; }
    else if (sub === 'remove') { result = await leveling.addXp(client, guild, member, -interaction.options.getInteger('amount')); verb = 'Removed'; }
    else if (sub === 'set')  { result = await leveling.setXp(client, guild, member, interaction.options.getInteger('amount')); verb = 'Set'; }
    else if (sub === 'setlevel') { result = await leveling.setLevel(client, guild, member, interaction.options.getInteger('level')); verb = 'Set level'; }

    const info = leveling.rankOf(client, guild, member.id);
    await interaction.reply({
      embeds: [embeds.success(`${verb} for **${user.tag}**, now at **level ${info.level}** with **${info.xp}** total XP.`)]
    });
  }
};
