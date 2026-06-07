const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const embeds = require('../../utils/embeds');
const polls = require('../../polls/service');
const { isPremium, limitFor } = require('../../premium');
const { upgradeReply } = require('../../premium/messages');

// A small button that opens the poll-builder modal. Used for the prefix path
// (prefix commands cannot open a modal directly, only a real interaction can).
function openButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('poll:open').setLabel('Create Poll').setStyle(ButtonStyle.Primary).setEmoji('📊')
  );
}

module.exports = {
  category: 'Polls',
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create and manage polls')
    .addSubcommand(s => s.setName('create').setDescription('Open the poll builder (question, options, length, settings)'))
    .addSubcommand(s => s.setName('list').setDescription('List active and scheduled polls'))
    .addSubcommand(s => s.setName('end').setDescription('End an active poll now')
      .addStringOption(o => o.setName('id').setDescription('Poll ID (shown in the poll footer)').setRequired(true)))
    .addSubcommand(s => s.setName('cancel').setDescription('Cancel a poll without recording results')
      .addStringOption(o => o.setName('id').setDescription('Poll ID').setRequired(true)))
    .addSubcommand(s => s.setName('info').setDescription('Show detailed results and analytics for a poll')
      .addStringOption(o => o.setName('id').setDescription('Poll ID').setRequired(true))),

  async execute(interaction, client) {
    // `?poll` with no subcommand defaults to opening the builder.
    let sub;
    try { sub = interaction.options.getSubcommand(); } catch { sub = 'create'; }

    const config = client.polls.getConfig(interaction.guildId);
    if (!polls.canManagePolls(interaction.member, config, client.store))
      return interaction.reply({ embeds: [embeds.error('You need permission to manage polls in this server.')], ephemeral: true });

    if (sub === 'create') {
      // Prefix commands can't pop a modal, so hand the user a button that can.
      if (interaction.isPrefix || typeof interaction.showModal !== 'function')
        return interaction.reply({
          embeds: [embeds.info('Click the button below to build your poll.')],
          components: [openButton()]
        });
      return interaction.showModal(polls.buildCreateModal());
    }

    if (sub === 'list') {
      const active = client.polls.listPolls(interaction.guildId, 'active');
      const scheduled = client.polls.listPolls(interaction.guildId, 'scheduled');
      if (!active.length && !scheduled.length)
        return interaction.reply({ embeds: [embeds.info('There are no active or scheduled polls.')], ephemeral: true });

      const fmt = p => `\`${p.id}\` · ${p.question.slice(0, 80)} · ${polls.countsOf(p).voters} voter(s)`;
      const fields = [];
      if (active.length) fields.push({ name: '🟢 Active', value: active.map(fmt).join('\n') });
      if (scheduled.length) fields.push({ name: '🕒 Scheduled', value: scheduled.map(fmt).join('\n') });
      return interaction.reply({ embeds: [embeds.custom({ title: '📊 Polls', color: embeds.COLORS.brand, fields })], ephemeral: true });
    }

    // end / cancel / info: all need a poll by ID.
    const poll = client.polls.getPoll(interaction.guildId, interaction.options.getString('id').toLowerCase());
    if (!poll) return interaction.reply({ embeds: [embeds.error('No poll with that ID exists in this server.')], ephemeral: true });

    if (sub === 'info')
      return interaction.reply({ embeds: [polls.resultsEmbed(poll, { showVoters: true })], ephemeral: true });

    if (sub === 'end') {
      const ok = await polls.endPoll(client, poll, interaction.user.tag);
      return interaction.reply({ embeds: [ok ? embeds.success(`Poll **${poll.id}** ended.`) : embeds.error('That poll is not active.')], ephemeral: true });
    }

    if (sub === 'cancel') {
      const ok = await polls.cancelPoll(client, poll);
      return interaction.reply({ embeds: [ok ? embeds.success(`Poll **${poll.id}** cancelled.`) : embeds.error('That poll is already closed.')], ephemeral: true });
    }
  },

  // Routed for customIds beginning with "poll:" — builder button, modal, voting, results, end.
  async handleComponent(interaction, client) {
    const [, action, pollId] = interaction.customId.split(':');
    const config = client.polls.getConfig(interaction.guildId);

    // Button (from the prefix path) → open the builder modal.
    if (action === 'open') {
      if (!polls.canManagePolls(interaction.member, config, client.store))
        return interaction.reply({ embeds: [embeds.error('You need permission to manage polls in this server.')], ephemeral: true });
      return interaction.showModal(polls.buildCreateModal());
    }

    if (action === 'createmodal') {
      if (!polls.canManagePolls(interaction.member, config, client.store))
        return interaction.reply({ embeds: [embeds.error('You need permission to manage polls in this server.')], ephemeral: true });

      // Enforce the poll-option cap up front so we can show the right message:
      // free servers over the free limit get the upgrade nudge, premium servers
      // over their tier ceiling get a plain "limit reached".
      const prem = await isPremium(interaction.guildId);
      const tierCap = limitFor('pollOptions', prem);
      const optCount = interaction.fields.getTextInputValue('opts').split('\n').map(s => s.trim()).filter(Boolean).length;
      if (optCount > tierCap) {
        return interaction.reply(prem
          ? { embeds: [embeds.error(`A poll can have at most ${tierCap} options.`)], ephemeral: true }
          : upgradeReply('pollOptions'));
      }

      // parseModalSubmit also clamps to the admin's soft cap (maxOptions), never above the tier ceiling.
      const effectiveMax = polls.effectiveMaxOptions(config, prem);
      const parsed = polls.parseModalSubmit(interaction.fields, { ...config, maxOptions: effectiveMax });
      if (parsed.error) return interaction.reply({ embeds: [embeds.error(parsed.error)], ephemeral: true });

      const poll = await polls.createPoll(client, {
        guild: interaction.guild, channel: interaction.channel, creator: interaction.user,
        question: parsed.question, options: parsed.options,
        multi: parsed.multi, anonymous: parsed.anonymous, durationMs: parsed.durationMs
      });
      return interaction.reply({ embeds: [embeds.success(`Poll **${poll.id}** posted below. 🎉`)], ephemeral: true });
    }

    const poll = client.polls.getPoll(interaction.guildId, pollId);
    if (!poll) return interaction.reply({ content: 'This poll no longer exists.', ephemeral: true });

    const manager = polls.canManagePolls(interaction.member, config, client.store);

    if (action === 'vote')
      return polls.castVote(interaction, client, poll, interaction.values);

    if (action === 'results') {
      if (poll.hideResults && poll.status === 'active' && !manager)
        return interaction.reply({ content: '🔒 Results are hidden until this poll ends.', ephemeral: true });
      return interaction.reply({ embeds: [polls.resultsEmbed(poll, { showVoters: manager })], ephemeral: true });
    }

    if (action === 'end') {
      if (!manager) return interaction.reply({ content: 'Only poll organisers can end this poll.', ephemeral: true });
      const ok = await polls.endPoll(client, poll, interaction.user.tag);
      return interaction.reply({ content: ok ? `Poll **${poll.id}** ended.` : 'That poll is not active.', ephemeral: true });
    }
  }
};
