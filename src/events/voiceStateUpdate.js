const { Events, AuditLogEvent } = require('discord.js');
const { sendLog, getAuditLogExecutor } = require('../utils/audit');

const userField = member => ({ name: 'User', value: `${member} (\`${member.id}\`)`, inline: true });

module.exports = {
  name: Events.VoiceStateUpdate,
  async execute(client, oldState, newState) {
    const g = oldState.guild || newState.guild;
    const member = newState.member || oldState.member;
    if (!member || member.user.bot) return;

    if (!oldState.channel && newState.channel) {
      return sendLog(client, g, 'vcjoin', {
        title: 'Voice Channel Join', color: 0x57F287,
        fields: [userField(member), { name: 'Channel', value: `${newState.channel}`, inline: true }],
        timestamp: new Date()
      });
    }

    if (oldState.channel && !newState.channel) {
      const executor = await getAuditLogExecutor(g, AuditLogEvent.MemberDisconnect, member.id);
      if (executor && executor.id !== member.id) {
        return sendLog(client, g, 'vckick', {
          title: 'Disconnected from VC', color: 0xED4245,
          fields: [userField(member), { name: 'From', value: `${oldState.channel}`, inline: true },
            { name: 'By', value: `${executor} (\`${executor.id}\`)`, inline: true }],
          timestamp: new Date()
        });
      }
      return sendLog(client, g, 'vcleave', {
        title: 'Voice Channel Leave', color: 0xED4245,
        fields: [userField(member), { name: 'Left From', value: `${oldState.channel}`, inline: true }],
        timestamp: new Date()
      });
    }

    if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
      const executor = await getAuditLogExecutor(g, AuditLogEvent.MemberMove, member.id);
      return sendLog(client, g, 'vcmove', {
        title: 'Voice Channel Move', color: 0xFEE75C,
        fields: [userField(member),
          { name: 'From', value: `${oldState.channel}`, inline: true },
          { name: 'To', value: `${newState.channel}`, inline: true },
          { name: 'Moved By', value: executor ? `${executor} (\`${executor.id}\`)` : 'Unknown/Self', inline: false }],
        timestamp: new Date()
      });
    }

    const channel = newState.channel || oldState.channel;
    const byField = { name: 'Channel', value: `${channel}`, inline: true };

    if (!oldState.deaf && newState.deaf)
      return sendLog(client, g, 'vcdeafen', { title: 'User Deafened', color: 0xED4245, fields: [userField(member), byField], timestamp: new Date() });
    if (oldState.deaf && !newState.deaf)
      return sendLog(client, g, 'vcundeafen', { title: 'User Undeafened', color: 0x57F287, fields: [userField(member), byField], timestamp: new Date() });
    if (!oldState.mute && newState.mute)
      return sendLog(client, g, 'vcmute', { title: 'User Muted', color: 0xED4245, fields: [userField(member), byField], timestamp: new Date() });
    if (oldState.mute && !newState.mute)
      return sendLog(client, g, 'vcunmute', { title: 'User Unmuted', color: 0x57F287, fields: [userField(member), byField], timestamp: new Date() });
    if (!oldState.streaming && newState.streaming)
      return sendLog(client, g, 'vcscreenshare', { title: 'Screen Share Started', color: 0x5865F2, fields: [userField(member), byField], timestamp: new Date() });
    if (oldState.streaming && !newState.streaming)
      return sendLog(client, g, 'vcscreensharestop', { title: 'Screen Share Stopped', color: 0x5865F2, fields: [userField(member), byField], timestamp: new Date() });
  }
};
