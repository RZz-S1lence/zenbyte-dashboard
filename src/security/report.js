const { PROTECTIONS } = require('./protections');

const labelOf = key => PROTECTIONS.find(p => p.key === key)?.label || key;

function antinukeFields(config) {
  const enabled = Object.entries(config.protections).filter(([, p]) => p.enabled);
  const lines = enabled.map(([k, p]) =>
    `**${labelOf(k)}**: ${p.limit}/${Math.round(p.windowMs / 1000)}s → \`${p.punishment}\``);
  return [
    { name: 'Status', value: config.enabled ? '🟢 Enabled' : '🔴 Disabled', inline: true },
    { name: 'Log Channel', value: config.logChannelId ? `<#${config.logChannelId}>` : '*None*', inline: true },
    { name: 'Global Whitelist', value: `${config.globalWhitelist.roles.length} role(s), ${config.globalWhitelist.users.length} user(s)`, inline: true },
    { name: `Active Protections (${enabled.length}/${PROTECTIONS.length})`, value: lines.join('\n') || '*None enabled*', inline: false }
  ];
}

function verificationFields(config) {
  return [
    { name: 'Status', value: config.enabled ? '🟢 Enabled' : '🔴 Disabled', inline: true },
    { name: 'Verified Role', value: config.verifiedRoleId ? `<@&${config.verifiedRoleId}>` : '*Not set*', inline: true },
    { name: 'Panel Channel', value: config.channelId ? `<#${config.channelId}>` : '*Not set*', inline: true }
  ];
}

module.exports = { antinukeFields, verificationFields };
