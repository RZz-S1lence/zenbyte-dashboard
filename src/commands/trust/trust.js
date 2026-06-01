const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../utils/embeds');
const trust = require('../../trust/service');

const bar = score => {
  const filled = Math.round(score / 10);
  return '█'.repeat(filled) + '░'.repeat(10 - filled);
};

module.exports = {
  category: 'Trust',
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('trust')
    .setDescription('Show a member’s trust score, a blend of activity, tenure, level and moderation history')
    .addUserOption(o => o.setName('user').setDescription('Member to view').setRequired(false)),

  async execute(interaction, client) {
    const member = interaction.options.getMember('user') || interaction.member;
    if (!member)
      return interaction.reply({ embeds: [embeds.error('That user is not a member of this server.')], ephemeral: true });
    if (member.user.bot)
      return interaction.reply({ embeds: [embeds.error('Bots do not have a trust score.')], ephemeral: true });

    const t = trust.computeTrust(client, interaction.guild, member);
    const b = t.breakdown;
    const color = t.score >= 75 ? embeds.COLORS.success : t.score >= 40 ? embeds.COLORS.warn : embeds.COLORS.error;

    await interaction.reply({
      embeds: [embeds.custom({
        title: `🛡️ Trust Score · ${member.user.username}`,
        description: `**${t.score}/100**  \`${bar(t.score)}\`\nTier: **${t.tier}**`,
        color,
        thumbnail: { url: member.user.displayAvatarURL() },
        fields: [
          { name: 'Account Age', value: `${b.accountAgeDays} days`, inline: true },
          { name: 'In Server', value: `${b.tenureDays} days`, inline: true },
          { name: 'Verified', value: b.verified ? '✅ Yes' : '❌ No', inline: true },
          { name: 'Level', value: String(b.level), inline: true },
          { name: 'Activity', value: b.activity.toLocaleString(), inline: true },
          { name: 'Warnings', value: String(b.warnings), inline: true }
        ]
      })]
    });
  }
};
