// Linux/host launcher: starts the Cloudflare tunnel and the bot together, the
// way launch.js does on Windows — but cross-platform and with no binary to
// upload. cloudflared comes from the npm package (auto-downloaded), and the
// tunnel reads cloudflared.yml in this folder (which points at your uploaded
// tunnel-credentials.json). Use this as the host's startup command:
//     node launch.server.js
//
// Process tree: launch.server.js -> start.js (watcher) -> bot.js.
// start.js restarts bot.js on a crash or ?restart, and only exits on an
// intentional ?stop — so if start.js exits, we shut the whole launcher down
// (which stops the host server; bring it back with the panel's Start button).
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { bin, install } = require('cloudflared');

const CONFIG = path.join(__dirname, 'cloudflared.yml');

let cfProc = null;
let botProc = null;
let shuttingDown = false;

function shutdown(code) {
  shuttingDown = true;
  console.log(`[launcher] Bot stopped (code ${code}); shutting down tunnel + launcher.`);
  try { if (cfProc) cfProc.kill(); } catch {}
  process.exit(code == null ? 0 : code);
}

function startBot() {
  if (botProc) return;
  botProc = spawn(process.execPath, [path.join(__dirname, 'start.js')], {
    cwd: __dirname, stdio: 'inherit', env: process.env
  });
  botProc.on('exit', code => shutdown(code)); // start.js only exits on an intentional ?stop
}

function startTunnel() {
  if (!fs.existsSync(CONFIG)) {
    console.error(`[tunnel] Missing ${CONFIG}. Upload cloudflared.yml + tunnel-credentials.json, then restart.`);
    startBot();
    return;
  }
  cfProc = spawn(bin, ['tunnel', '--config', CONFIG, 'run'], { stdio: 'inherit' });
  cfProc.on('exit', code => {
    if (shuttingDown) return;
    console.log(`[tunnel] cloudflared exited (${code}), restarting in 5s…`);
    setTimeout(startTunnel, 5000);
  });
  startBot();
}

(async () => {
  if (!fs.existsSync(bin)) {
    console.log('[tunnel] Downloading cloudflared binary…');
    try { await install(bin); } catch (e) { console.error('[tunnel] cloudflared download failed:', e.message); }
  }
  startTunnel();
})();
