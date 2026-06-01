const fs   = require('fs');
const path = require('path');
const util = require('util');

const LOG_DIR  = path.join(__dirname, '..', '..', 'logs');
const COMBINED = path.join(LOG_DIR, 'combined.log');
const ERRORLOG = path.join(LOG_DIR, 'error.log');

function ensureDir() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
}

function format(level, args) {
  const parts = args.map(a => (typeof a === 'string' ? a : util.inspect(a, { depth: 3 })));
  return `[${new Date().toISOString()}] [${level}] ${parts.join(' ')}`;
}

function append(file, line) {
  try { ensureDir(); fs.appendFileSync(file, line + '\n'); } catch { /* never throw from logger */ }
}

const logger = {
  info(...args) {
    const line = format('INFO', args);
    console.log('ℹ️ ', ...args);
    append(COMBINED, line);
  },
  success(...args) {
    const line = format('INFO', args);
    console.log('✅', ...args);
    append(COMBINED, line);
  },
  warn(...args) {
    const line = format('WARN', args);
    console.warn('⚠️ ', ...args);
    append(COMBINED, line);
  },
  error(...args) {
    const line = format('ERROR', args);
    console.error('❌', ...args);
    append(COMBINED, line);
    append(ERRORLOG, line);
  },
  debug(...args) {
    if (process.env.DEBUG !== 'true') return;
    const line = format('DEBUG', args);
    console.debug('🐛', ...args);
    append(COMBINED, line);
  }
};

module.exports = logger;
