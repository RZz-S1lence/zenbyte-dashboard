const fs   = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const EVENTS_DIR = path.join(__dirname, '..', 'events');

// Auto-loads every event module under src/events.
// Each module: { name, once?, execute(client, ...args) }.
function loadEvents(client) {
  if (!fs.existsSync(EVENTS_DIR)) return;
  let count = 0;

  for (const file of fs.readdirSync(EVENTS_DIR).filter(f => f.endsWith('.js'))) {
    const event = require(path.join(EVENTS_DIR, file));
    if (!event?.name || typeof event.execute !== 'function') {
      logger.warn(`Skipping invalid event file: ${file}`);
      continue;
    }

    const handler = (...args) => event.execute(client, ...args);
    if (event.once) client.once(event.name, handler);
    else client.on(event.name, handler);
    count++;
  }

  logger.success(`Loaded ${count} event listener(s).`);
}

module.exports = loadEvents;
