const fs   = require('fs');
const path = require('path');
const logger = require('./logger');

// Durable JSON persistence shared by every store.
//
// Writes are atomic: the new data is written to a temp file and then renamed over
// the target, so a crash mid-write can never leave a half-written (corrupt) file.
// The previous good copy is kept as "<file>.bak" and used to recover on load if the
// main file is ever unreadable.

function readJson(file, fallback = {}) {
  for (const candidate of [file, `${file}.bak`]) {
    try {
      if (fs.existsSync(candidate)) {
        const parsed = JSON.parse(fs.readFileSync(candidate, 'utf8'));
        if (candidate !== file)
          logger.warn(`Recovered ${path.basename(file)} from backup after the main file failed to load.`);
        return parsed;
      }
    } catch (e) {
      logger.error(`Failed to load ${path.basename(candidate)}:`, e.message);
    }
  }
  return fallback;
}

function writeJsonAtomic(file, data) {
  const tmp = `${file}.tmp`;
  try {
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    try { if (fs.existsSync(file)) fs.copyFileSync(file, `${file}.bak`); } catch {}
    fs.renameSync(tmp, file);
  } catch (e) {
    logger.error(`Failed to save ${path.basename(file)}:`, e.message);
    try { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); } catch {}
  }
}

module.exports = { readJson, writeJsonAtomic };
