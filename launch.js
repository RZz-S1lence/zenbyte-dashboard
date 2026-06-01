// Starts a Cloudflare named tunnel so the dashboard is reachable at a permanent
// address (zenbyte-dashboard.de), then starts the bot. The address never changes,
// so you only register it once in Discord's Developer Portal.

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CLOUDFLARED = 'C:\\Users\\gorbu\\AppData\\Local\\Microsoft\\WinGet\\Links\\cloudflared.exe';
const DASHBOARD_URL = 'https://zenbyte-dashboard.de';
const ENV_FILE = path.join(__dirname, '.env');

let botProc = null;

function setEnvUrl(url) {
  let env = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, 'utf8') : '';
  if (/^DASHBOARD_URL=.*$/m.test(env)) env = env.replace(/^DASHBOARD_URL=.*$/m, `DASHBOARD_URL=${url}`);
  else env += `${env.endsWith('\n') || env === '' ? '' : '\n'}DASHBOARD_URL=${url}\n`;
  fs.writeFileSync(ENV_FILE, env);
}

function startBot() {
  if (botProc) { try { botProc.kill(); } catch {} }
  botProc = spawn(process.execPath, [path.join(__dirname, 'start.js')], { cwd: __dirname, stdio: 'inherit', env: process.env });
}

function startTunnel() {
  setEnvUrl(DASHBOARD_URL);
  console.log('\n=====================================================');
  console.log(' Dashboard is now reachable at:');
  console.log('   ' + DASHBOARD_URL);
  console.log(' Login callback registered in Discord Developer Portal:');
  console.log('   ' + DASHBOARD_URL + '/auth/discord/callback');
  console.log('=====================================================\n');

  const cf = spawn(CLOUDFLARED, ['tunnel', 'run', 'zenbyte-dashboard']);
  cf.stdout.on('data', b => process.stdout.write(b));
  cf.stderr.on('data', b => process.stderr.write(b));
  cf.on('exit', () => { console.log('[tunnel] cloudflared stopped, restarting in 5s...'); setTimeout(startTunnel, 5000); });

  startBot();
}

startTunnel();
