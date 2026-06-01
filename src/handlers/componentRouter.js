const tickets = require('./tickets');
const verification = require('./verification');
const logger  = require('../utils/logger');
const embeds  = require('../utils/embeds');

// Maps a component customId to its handler. customIds use "namespace:action[:args]".
const routes = {
  'ticket:create':          tickets.createPrompt,
  'ticket:type':            tickets.typeSelect,
  'ticket:form':            tickets.formSubmit,
  'ticket:claim':           tickets.claim,
  'ticket:priority':        tickets.openPriority,
  'ticket:priority_select': tickets.prioritySelect,
  'ticket:close':           tickets.closePrompt,
  'ticket:confirm_close':   tickets.confirmClose,
  'ticket:cancel_close':    tickets.cancelClose,
  'verify:start':           verification.start,
  'verify:enter':           verification.openModal,
  'verify:modal':           verification.submit
};

async function route(interaction, client) {
  const id = interaction.customId;

  // Commands that own their own components (e.g. clearwarns:confirm:...).
  const namespace = id.split(':')[0];
  const owningCommand = [...client.commands.values()].find(c => c.data.name === namespace && typeof c.handleComponent === 'function');
  if (owningCommand) return owningCommand.handleComponent(interaction, client);

  const handler = routes[id];
  if (!handler) return;

  try {
    await handler(interaction, client);
  } catch (err) {
    logger.error(`Component handler failed for "${id}":`, err);
    const payload = { embeds: [embeds.error('Something went wrong handling that action.')], ephemeral: true };
    if (interaction.replied || interaction.deferred) await interaction.followUp(payload).catch(() => {});
    else await interaction.reply(payload).catch(() => {});
  }
}

module.exports = { route };
