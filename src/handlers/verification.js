const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle, AttachmentBuilder
} = require('discord.js');
const embeds = require('../utils/embeds');
const logger = require('../utils/logger');
const { createCaptcha } = require('../utils/captcha');
const { evaluateAlt } = require('../utils/altcheck');

const CODE_TTL  = 5 * 60 * 1000;
const MAX_TRIES = 3;

// pending captchas: Map<"guildId:userId", { code, expires, attempts }>
const pending = new Map();
const keyFor = i => `${i.guildId}:${i.user.id}`;

function buildPanel(config) {
  const embed = embeds.custom({
    title: config.panelTitle || '✅ Server Verification',
    description: config.panelDescription || 'Click **Verify** below and solve the captcha to gain access to the server.',
    color: embeds.COLORS.brand
  });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('verify:start').setLabel('Verify').setStyle(ButtonStyle.Success).setEmoji('✅')
  );
  return { embeds: [embed], components: [row] };
}

async function start(interaction, client) {
  const config = client.store.getVerificationConfig(interaction.guildId);
  if (!config.enabled || !config.verifiedRoleId)
    return interaction.reply({ embeds: [embeds.error('Verification is not configured on this server.')], ephemeral: true });

  if (interaction.member.roles.cache.has(config.verifiedRoleId))
    return interaction.reply({ embeds: [embeds.success('You are already verified!')], ephemeral: true });

  const alt = evaluateAlt(interaction.user, config);
  if (alt.flagged)
    return interaction.reply({ embeds: [embeds.error(`You can't verify yet: ${alt.reason}.`)], ephemeral: true });

  const { code, buffer } = createCaptcha();
  pending.set(keyFor(interaction), { code, expires: Date.now() + CODE_TTL, attempts: 0 });

  const file = new AttachmentBuilder(buffer, { name: 'captcha.png' });
  const row  = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('verify:enter').setLabel('Enter Code').setStyle(ButtonStyle.Primary)
  );

  await interaction.reply({
    embeds: [embeds.custom({
      title: '🔐 Solve the Captcha',
      description: 'Read the code in the image, then click **Enter Code** and type it. The code expires in 5 minutes.',
      color: embeds.COLORS.brand,
      image: { url: 'attachment://captcha.png' }
    })],
    files: [file],
    components: [row],
    ephemeral: true
  });
}

async function openModal(interaction) {
  const entry = pending.get(keyFor(interaction));
  if (!entry || entry.expires < Date.now())
    return interaction.reply({ embeds: [embeds.error('Your captcha expired. Click **Verify** again.')], ephemeral: true });

  const modal = new ModalBuilder().setCustomId('verify:modal').setTitle('Enter Captcha Code');
  modal.addComponents(new ActionRowBuilder().addComponents(
    new TextInputBuilder().setCustomId('code').setLabel('Captcha code')
      .setStyle(TextInputStyle.Short).setMinLength(4).setMaxLength(8).setRequired(true)
  ));
  await interaction.showModal(modal);
}

async function submit(interaction, client) {
  const config = client.store.getVerificationConfig(interaction.guildId);
  const entry  = pending.get(keyFor(interaction));

  if (!entry || entry.expires < Date.now()) {
    pending.delete(keyFor(interaction));
    return interaction.reply({ embeds: [embeds.error('Your captcha expired. Click **Verify** again.')], ephemeral: true });
  }

  const guess = interaction.fields.getTextInputValue('code').trim().toUpperCase();
  if (guess !== entry.code) {
    entry.attempts++;
    if (entry.attempts >= MAX_TRIES) {
      pending.delete(keyFor(interaction));
      return interaction.reply({ embeds: [embeds.error('Too many incorrect attempts. Click **Verify** to get a new captcha.')], ephemeral: true });
    }
    return interaction.reply({ embeds: [embeds.error(`Incorrect code. ${MAX_TRIES - entry.attempts} attempt(s) left. Click **Enter Code** to try again.`)], ephemeral: true });
  }

  pending.delete(keyFor(interaction));
  const role = interaction.guild.roles.cache.get(config.verifiedRoleId);
  if (!role)
    return interaction.reply({ embeds: [embeds.error('The verified role no longer exists. Contact an admin.')], ephemeral: true });

  try {
    await interaction.member.roles.add(role, 'Passed captcha verification');
  } catch (e) {
    logger.error(`Verification role add failed for ${interaction.user.tag}:`, e.message);
    return interaction.reply({ embeds: [embeds.error('I could not assign the verified role. Check that my role is above it.')], ephemeral: true });
  }

  logger.debug(`${interaction.user.tag} verified in ${interaction.guild.name}.`);
  await interaction.reply({ embeds: [embeds.success(`You are now verified, welcome to **${interaction.guild.name}**!`)], ephemeral: true });
}

module.exports = { buildPanel, start, openModal, submit };
