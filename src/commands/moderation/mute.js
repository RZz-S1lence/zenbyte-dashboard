const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const embeds = require('../../utils/embeds');
const { canModerate } = require('../../utils/moderation');
const { findMuteRole, createMuteRole, applyMuteOverwrites } = require('../../utils/muteRole');

async function applyMute(member, role, reason, by) {
  await member.roles.add(role, `Muted by ${by}: ${reason}`);
}

function muteEmbed(member, reason, by) {
  return embeds.custom({
    title: '🔇 Member Muted',
    color: embeds.COLORS.warn,
    fields: [
      { name: 'User', value: `${member.user.tag} (\`${member.id}\`)`, inline: true },
      { name: 'Moderator', value: by, inline: true },
      { name: 'Reason', value: reason }
    ]
  });
}

// Sends a message and returns the resulting Message for both slash and prefix contexts.
async function sendMessage(ctx, payload) {
  if (ctx.isPrefix) return ctx.reply(payload);
  await ctx.reply(payload);
  return ctx.fetchReply();
}

// Validates that the bot can hand out `role`. Returns an error string, or null when OK.
function roleProblem(ctx, role) {
  const me = ctx.guild.members.me;
  if (role.managed || role.id === ctx.guild.id) return 'That role is managed by an integration and cannot be used as a Muted role.';
  if (role.position >= me.roles.highest.position) return 'That role is above my highest role. Move my role above it and try again.';
  return null;
}

// Runs when the guild has no Muted role yet: ask the moderator to mention a role
// to use, or create a fresh red one, then mute the target with whichever they pick.
async function runSetup(ctx, client, member, reason) {
  const modId = ctx.user.id;
  const channel = ctx.channel;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('mutesetup:create').setLabel('Create a new role').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('mutesetup:cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
  );

  const prompt = await sendMessage(ctx, {
    embeds: [embeds.warn(
      `There is no **Muted** role set up in this server yet.\n\n` +
      `**Mention the role** you want to use as the Muted role, or click **Create a new role** ` +
      `and I'll make a red one. Whichever you choose will be blocked from typing in every channel, ` +
      `then applied to **${member.user.tag}**.`
    )],
    components: [row]
  });

  let done = false;
  const compCollector = prompt.createMessageComponentCollector({ filter: i => i.user.id === modId, time: 60000 });
  const msgCollector  = channel.createMessageCollector({ filter: m => m.author.id === modId && m.mentions.roles.size > 0, time: 60000 });
  const cleanup = () => { done = true; compCollector.stop(); msgCollector.stop(); };

  // Path 1: moderator clicks a button.
  compCollector.on('collect', async i => {
    if (i.customId === 'mutesetup:cancel') {
      cleanup();
      return i.update({ embeds: [embeds.error('Cancelled. No one was muted.')], components: [] });
    }
    cleanup();
    await i.update({ embeds: [embeds.info('⏳ Creating the **Muted** role and locking it out of every channel…')], components: [] });
    try {
      const role = await createMuteRole(ctx.guild, `Muted role created by ${ctx.user.tag}`, client.store);
      const problem = roleProblem(ctx, role);
      if (problem) return i.editReply({ embeds: [embeds.error(`Created the role, but I could not apply it: ${problem}`)] });
      await applyMute(member, role, reason, ctx.user.tag);
      await i.editReply({ embeds: [muteEmbed(member, reason, ctx.user.tag)] });
    } catch {
      await i.editReply({ embeds: [embeds.error('Failed to create the role or mute the member. Check my **Manage Roles** permission.')] }).catch(() => {});
    }
  });

  // Path 2: moderator mentions an existing role to use as the Muted role.
  msgCollector.on('collect', async m => {
    const role = m.mentions.roles.first();
    const problem = roleProblem(ctx, role);
    if (problem) return void channel.send({ embeds: [embeds.error(`${problem} You can mention a different role or click **Create a new role**.`)] }).catch(() => {});
    cleanup();
    await prompt.edit({ components: [] }).catch(() => {});
    await channel.send({ embeds: [embeds.info(`🔧 Setting up ${role} as the **Muted** role and locking it out of every channel…`)] }).catch(() => {});
    try {
      client.store.setMuteRoleId(ctx.guild.id, role.id);
      await applyMuteOverwrites(ctx.guild, role, `Configured as Muted role by ${ctx.user.tag}`);
      await applyMute(member, role, reason, ctx.user.tag);
      await channel.send({ embeds: [muteEmbed(member, reason, ctx.user.tag)] }).catch(() => {});
    } catch {
      await channel.send({ embeds: [embeds.error('Failed to set up that role or mute the member. Check my **Manage Roles** permission and role position.')] }).catch(() => {});
    }
  });

  compCollector.on('end', () => {
    if (!done) prompt.edit({ embeds: [embeds.error('Timed out. No Muted role was set up and no one was muted.')], components: [] }).catch(() => {});
  });
}

module.exports = {
  category: 'Moderation',
  cooldown: 3,
  modPermission: PermissionFlagsBits.ModerateMembers,
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mute a member so they cannot type in any channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName('user').setDescription('Member to mute').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)),

  async execute(interaction, client) {
    const member = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!member) return interaction.reply({ embeds: [embeds.error('That user is not a member of this server.')], ephemeral: true });

    const check = canModerate(interaction.member, member, { store: client.store, action: 'mute' });
    if (!check.ok) return interaction.reply({ embeds: [embeds.error(check.reason)], ephemeral: true });

    const me = interaction.guild.members.me;
    if (!me.permissions.has(PermissionFlagsBits.ManageRoles))
      return interaction.reply({ embeds: [embeds.error('I need the **Manage Roles** permission to mute members.')], ephemeral: true });

    const role = findMuteRole(interaction.guild, client.store);

    // No Muted role yet → ask the moderator to pick or create one.
    if (!role) return runSetup(interaction, client, member, reason);

    const problem = roleProblem(interaction, role);
    if (problem) return interaction.reply({ embeds: [embeds.error(`I can't apply the **Muted** role: ${problem}`)], ephemeral: true });
    if (member.roles.cache.has(role.id))
      return interaction.reply({ embeds: [embeds.error(`**${member.user.tag}** is already muted.`)], ephemeral: true });

    try {
      await applyMute(member, role, reason, interaction.user.tag);
      await interaction.reply({ embeds: [muteEmbed(member, reason, interaction.user.tag)] });
    } catch {
      await interaction.reply({ embeds: [embeds.error('Failed to mute that member. Check my role position and permissions.')], ephemeral: true });
    }
  }
};
