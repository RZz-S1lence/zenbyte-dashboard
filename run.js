const { spawn } = require('child_process');

function start() {
  console.log('[RUNNER] Starting bot...');
  
  const bot = spawn('node', ['bot.js'], {
    cwd: __dirname,
    stdio: 'inherit'
  });

  bot.on('close', (code) => {
    console.log(`[RUNNER] Bot exited with code ${code}`);
    
    if (code === 0) {
      console.log('[RUNNER] Clean exit. Restarting in 3s...');
      setTimeout(start, 3000);
    } else {
      console.log(`[RUNNER] Crash (code ${code}). Restarting in 5s...`);
      setTimeout(start, 5000);
    }
  });
}

start();