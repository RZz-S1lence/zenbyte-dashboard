// Single source of truth for every loggable event type.
// Consumed by the logging events, the /setlogchannel command, and the dashboard.
module.exports = [
  { key: 'vcjoin',            label: 'VC Join',            group: 'Voice',    desc: 'User joins a voice channel' },
  { key: 'vcleave',           label: 'VC Leave',           group: 'Voice',    desc: 'User leaves a voice channel' },
  { key: 'vcmove',            label: 'VC Move',            group: 'Voice',    desc: 'User moves between voice channels' },
  { key: 'vcdeafen',          label: 'VC Deafen',          group: 'Voice',    desc: 'User gets server-deafened' },
  { key: 'vcundeafen',        label: 'VC Undeafen',        group: 'Voice',    desc: 'User gets server-undeafened' },
  { key: 'vcmute',            label: 'VC Mute',            group: 'Voice',    desc: 'User gets server-muted' },
  { key: 'vcunmute',          label: 'VC Unmute',          group: 'Voice',    desc: 'User gets server-unmuted' },
  { key: 'vcscreenshare',     label: 'Screen Share Start', group: 'Voice',    desc: 'User starts screen sharing' },
  { key: 'vcscreensharestop', label: 'Screen Share Stop',  group: 'Voice',    desc: 'User stops screen sharing' },
  { key: 'vckick',            label: 'VC Kick',            group: 'Voice',    desc: 'User disconnected from VC by a mod' },
  { key: 'memberjoin',        label: 'Member Join',        group: 'Members',  desc: 'User joins the server' },
  { key: 'memberleave',       label: 'Member Leave',       group: 'Members',  desc: 'User leaves the server' },
  { key: 'ban',               label: 'Ban',                group: 'Members',  desc: 'User gets banned' },
  { key: 'unban',             label: 'Unban',              group: 'Members',  desc: 'User gets unbanned' },
  { key: 'kick',              label: 'Kick',               group: 'Members',  desc: 'User gets kicked' },
  { key: 'timeout',           label: 'Timeout',            group: 'Members',  desc: 'User gets timed out' },
  { key: 'untimeout',         label: 'Untimeout',          group: 'Members',  desc: "User's timeout is removed" },
  { key: 'addroles',          label: 'Roles Added',        group: 'Members',  desc: 'User gets roles added' },
  { key: 'removeroles',       label: 'Roles Removed',      group: 'Members',  desc: 'User gets roles removed' },
  { key: 'changename',        label: 'Nickname Change',    group: 'Members',  desc: 'User nickname changes' },
  { key: 'deletemessage',     label: 'Message Delete',     group: 'Messages', desc: 'A message gets deleted' },
  { key: 'messageedit',       label: 'Message Edit',       group: 'Messages', desc: 'A message gets edited' }
];
