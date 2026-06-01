const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../utils/embeds');
const polls = require('../../polls/service');

module.exports = {
  category: 'Polls',
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create and manage polls')
    .addSubcommand(s => s.setName('quick').setDescription('Start a simple single-choice poll')
      .addStringOption(o => o.setName('setup').setDescription('Question | Option A | Option B').setRequired(true)))
    .addSubcommand(s => s.setName('create').setDescription('Open a form to build a poll (question, length, options)')
      .addStringOption(o => o.setName('setup').setDescription('Optional shortcut: Question | Opt A | Opt B  --multi --anon --time 1h').setRequired(false)))
    .addSubcommand(s => s.setName('list').setDescription('List active and scheduled polls'))
    .addSubcommand(s => s.setName('end').setDescription('End an active poll now')
      .addStringOption(o => o.setName('id').setDescription('Poll ID (shown in the poll footer)').setRequired(true)))
    .addSubcommand(s => s.setName('cancel').setDescription('Cancel a poll without recording results')
      .addStringOption(o => o.setName('id').setDescription('Poll ID').setRequired(true)))
    .addSubcommand(s => s.setName('info').setDescription('Show detailed results and analytics for a poll')
      .addStringOption(o => o.setName('id').setDescription('Poll ID').setRequired(true))),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const config = client.polls.getConfig(interaction.guildId);

    if (!polls.canManagePolls(interaction.member, config, client.store))
      return interaction.reply({ embeds: [embeds.error('You need permission to manage polls in this server.')], ephemeral: true });

    // /poll create with no shortcut text opens the form modal (slash only).
    if (sub === 'create' && !interaction.options.getString('setup') && !interaction.isPrefix && typeof interaction.showModal === 'function')
      return interaction.showModal(polls.buildCreateModal());

    if (sub === 'quick' || sub === 'create') {
      const setup = interaction.options.getString('setup');
      if (!setup)
        return interaction.reply({ embeds: [embeds.error('Add your poll text, e.g. `Question | Option A | Option B`.')], ephemeral: true });
      const parsed = polls.parseSetup(setup, config);
      if (parsed.error) return interaction.reply({ embeds: [embeds.error(parsed.error)], ephemeral: true });

      const advanced = sub === 'create';
      let durationMs = advanced ? parsed.durationMs : 0;
      if (advanced && !durationMs && config.defaultDurationMin) durationMs = config.defaultDurationMin * 60000;

      const poll = await polls.createPoll(client, {
        guild: interaction.guild,
        channel: interaction.channel,
        creator: interaction.user,
        question: parsed.question,
        options: parsed.options,
        multi: advanced && parsed.multi,
        maxChoices: parsed.maxChoices,
        anonymous: advanced && parsed.anonymous,
        hideResults: advanced && parsed.hideResults,
        durationMs,
        scheduleMs: advanced ? parsed.scheduleMs : 0
      });

      const where = poll.status === 'scheduled' ? `scheduled, opens <t:${Math.floor(poll.scheduledFor / 1000)}:R>` : 'posted';
      return interaction.reply({ embeds: [embeds.success(`Poll **${poll.id}** ${where}.`)], ephemeral: true });
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

  // Routed for customIds beginning with "poll:" for the create form, voting, results and end actions.
  async handleComponent(interaction, client) {
    const [, action, pollId] = interaction.customId.split(':');
    const config = client.polls.getConfig(interaction.guildId);

    if (action === 'createmodal') {
      if (!polls.canManagePolls(interaction.member, config, client.store))
        return interaction.reply({ embeds: [embeds.error('You need permission to manage polls in this server.')], ephemeral: true });
      const parsed = polls.parseModalSubmit(interaction.fields, config);
      if (parsed.error) return interaction.reply({ embeds: [embeds.error(parsed.error)], ephemeral: true });

      const poll = await polls.createPoll(client, {
        guild: interaction.guild, channel: interaction.channel, creator: interaction.user,
        question: parsed.question, options: parsed.options,
        multi: parsed.multi, anonymous: parsed.anonymous, durationMs: parsed.durationMs
      });
      return interaction.reply({ embeds: [embeds.success(`Poll **${poll.id}** posted.`)], ephemeral: true });
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
