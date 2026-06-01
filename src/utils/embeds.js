const { COLORS } = require('../config');

const withTime = embed => ({ timestamp: new Date(), ...embed });

module.exports = {
  COLORS,
  success: (description, extra = {}) => withTime({ description: `✅ ${description}`, color: COLORS.success, ...extra }),
  error:   (description, extra = {}) => withTime({ description: `❌ ${description}`, color: COLORS.error,   ...extra }),
  warn:    (description, extra = {}) => withTime({ description: `⚠️ ${description}`, color: COLORS.warn,    ...extra }),
  info:    (description, extra = {}) => withTime({ description, color: COLORS.info, ...extra }),
  custom:  (embed) => withTime(embed)
};
