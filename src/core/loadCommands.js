const fs   = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const COMMANDS_DIR = path.join(__dirname, '..', 'commands');

function walk(dir) {
  const entries = [];
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) entries.push(...walk(full));
    else if (item.name.endsWith('.js')) entries.push(full);
  }
  return entries;
}

// Recursively auto-loads every command module under src/commands.
// The immediate parent folder name becomes the command's category if not set.
function loadCommands(client) {
  if (!fs.existsSync(COMMANDS_DIR)) return;
  let count = 0;

  for (const file of walk(COMMANDS_DIR)) {
    delete require.cache[require.resolve(file)];
    const command = require(file);

    if (!command?.data || typeof command.execute !== 'function') {
      logger.warn(`Skipping invalid command file: ${path.relative(COMMANDS_DIR, file)}`);
      continue;
    }

    if (!command.category) {
      const folder = path.basename(path.dirname(file));
      command.category = folder.charAt(0).toUpperCase() + folder.slice(1);
    }

    client.commands.set(command.data.name, command);
    count++;
  }

  logger.success(`Loaded ${count} slash command(s).`);
}

module.exports = loadCommands;
