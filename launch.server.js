// Linux/host launcher: starts the Cloudflare tunnel and the bot together, the
// way launch.js does on Windows — but cross-platform and with no binary to
// upload. cloudflared comes from the npm package (auto-downloaded), and the
// tunnel reads cloudflared.yml in this folder (which points at your uploaded
// tunnel-credentials.json). Use this as the host's startup command:
//     node launch.server.js
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { bin, install } = require('cloudflared');

const CONFIG = path.join(__dirname, 'cloudflared.yml');

let botProc = null;

function startBot() {
  if (botProc) return;
  botProc = spawn(process.execPath, [path.join(__dirname, 'start.js')], {
    cwd: __dirname, stdio: 'inherit', env: process.env
  });
  botProc.on('exit', code => {
    console.log(`[bot] start.js exited (${code}), restarting in 5s…`);
    botProc = null;
    setTimeout(startBot, 5000);
  });
}

function startTunnel() {
  if (!fs.existsSync(CONFIG)) {
    console.error(`[tunnel] Missing ${CONFIG}. Upload cloudflared.yml and tunnel-credentials.json, then restart.`);
    startBot(); // run the bot anyway so the rest works
    return;
  }
  const cf = spawn(bin, ['tunnel', '--config', CONFIG, 'run'], { stdio: 'inherit' });
  cf.on('exit', code => {
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
