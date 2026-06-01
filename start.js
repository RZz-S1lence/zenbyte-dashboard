const { spawn } = require('child_process');
const path = require('path');

const botFile = path.join(__dirname, 'bot.js');

function startBot() {
  console.log('[STARTER] Launching bot...');
  const bot = spawn('node', [botFile], {
    cwd: __dirname,
    stdio: 'inherit',
    env: { ...process.env, MANAGED_BY_STARTER: '1' }
  });

  bot.on('close', (code, signal) => {
    // Manual kill (Ctrl+C or SIGTERM) — do not restart
    if (signal === 'SIGINT' || signal === 'SIGTERM') {
      console.log(`[STARTER] Stopped by signal (${signal}). Exiting.`);
      process.exit(0);
    }

    // Exit 0 = intentional stop (?stop command) — do not restart
    if (code === 0) {
      console.log('[STARTER] Bot stopped cleanly. Exiting.');
      process.exit(0);
    }

    // Any other exit code = restart (exit 1 = ?restart, anything else = crash)
    const delay = code === 1 ? 2000 : 5000;
    console.log(`[STARTER] Bot exited (code ${code}). Restarting in ${delay / 1000}s...`);
    setTimeout(startBot, delay);
  });
}

startBot();
