const { SlashCommandBuilder, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');
const logger = require('../../utils/logger');

// How long each step waits for the owner to reply before the flow aborts.
const STEP_TIMEOUT = 120000; // 2 minutes

// Small no-emoji notice embed for the operator-facing prompts and results.
const note = (description, color) => embeds.custom({ description, color });

function isImageAttachment(att) {
  if (att.contentType && att.contentType.startsWith('image/')) return true;
  return /\.(png|jpe?g|gif|webp)$/i.test(att.name || '');
}

module.exports = {
  category: 'System',
  ownerOnly: true,   // hidden from everyone else, including in the help menu
  prefixOnly: true,  // never registered as a slash command; runs only via the text prefix

  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Owner only: build an announcement embed step by step and post it to a channel')
    .addChannelOption(o => o.setName('channel').setDescription('Channel to post the announcement in').setRequired(true)),

  async execute(ctx, client) {
    const channel = ctx.options.getChannel('channel');
    if (!channel || !channel.isTextBased?.() || typeof channel.send !== 'function')
      return ctx.reply({ embeds: [note('Pick a text channel to announce in, for example `?announce #updates`.', embeds.COLORS.error)] });

    const me = ctx.guild.members.me || await ctx.guild.members.fetchMe().catch(() => null);
    const perms = me ? channel.permissionsFor(me) : null;
    if (!perms?.has(PermissionFlagsBits.SendMessages) || !perms?.has(PermissionFlagsBits.EmbedLinks))
      return ctx.reply({ embeds: [note(`I need the **Send Messages** and **Embed Links** permissions in ${channel}.`, embeds.COLORS.error)] });

    // Sends a prompt and waits for one reply from the same owner in this channel.
    // Returns the reply message, or null if the owner timed out or typed "cancel".
    const ask = async (prompt) => {
      await ctx.channel.send({ embeds: [note(`${prompt}\n\nType \`cancel\` at any time to stop.`, embeds.COLORS.brand)] });
      const collected = await ctx.channel.awaitMessages({
        filter: m => m.author.id === ctx.user.id,
        max: 1, time: STEP_TIMEOUT, errors: ['time']
      }).catch(() => null);
      const msg = collected?.first();
      if (!msg) { await ctx.channel.send({ embeds: [note('Announcement timed out. Run the command again when you are ready.', embeds.COLORS.error)] }); return null; }
      if (msg.content.trim().toLowerCase() === 'cancel') { await ctx.channel.send({ embeds: [note('Announcement cancelled.', embeds.COLORS.warn)] }); return null; }
      return msg;
    };

    // Step 1: the announcement text.
    const textMsg = await ask('**Step 1 of 3** Send the announcement text.');
    if (!textMsg) return;
    const text = textMsg.content.trim();
    if (!text)
      return ctx.channel.send({ embeds: [note('That message had no text, so there is nothing to announce. Run the command again.', embeds.COLORS.error)] });

    // Step 2: optional media (image shown in the embed; other files attached alongside).
    const mediaMsg = await ask('**Step 2 of 3** Send an image, file or video to include, or type `n` for none.');
    if (!mediaMsg) return;
    const files = [];
    let imageRef = null;
    const att = mediaMsg.attachments.first();
    const raw = mediaMsg.content.trim();
    if (att) {
      const safeName = (att.name || 'attachment').replace(/[^\w.\-]+/g, '_');
      files.push(new AttachmentBuilder(att.url, { name: safeName }));
      if (isImageAttachment(att)) imageRef = `attachment://${safeName}`;
    } else if (/^https?:\/\/\S+$/i.test(raw)) {
      imageRef = raw; // a pasted image URL
    }

    // Step 3: whether to ping everyone.
    const pingMsg = await ask('**Step 3 of 3** Ping `@everyone` with this announcement? Type `y` or `n`.');
    if (!pingMsg) return;
    const ping = /^(y|yes)$/i.test(pingMsg.content.trim());

    const embed = embeds.custom({ description: text, color: embeds.COLORS.brand });
    if (imageRef) embed.image = { url: imageRef };

    const payload = { embeds: [embed] };
    if (files.length) payload.files = files;
    if (ping) { payload.content = '@everyone'; payload.allowedMentions = { parse: ['everyone'] }; }
    else payload.allowedMentions = { parse: [] };

    try {
      await channel.send(payload);
      await ctx.channel.send({ embeds: [note(`Announcement posted in ${channel}.`, embeds.COLORS.success)] });
      logger.info(`Announcement posted to #${channel.name} in ${ctx.guild.name} by ${ctx.user.tag}.`);
    } catch (e) {
      logger.error('Announce command failed to post:', e.message);
      await ctx.channel.send({ embeds: [note('I could not post the announcement. Check my permissions in that channel and try again.', embeds.COLORS.error)] });
    }
  }
};
