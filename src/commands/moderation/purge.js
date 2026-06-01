const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');

module.exports = {
  category: 'Moderation',
  cooldown: 3,
  aliases: ['clear', 'clean'],
  permissions: [PermissionFlagsBits.ManageMessages],
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Bulk-delete recent messages')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption(o => o.setName('amount').setDescription('How many messages (1–100)').setRequired(true).setMinValue(1).setMaxValue(100))
    .addUserOption(o => o.setName('user').setDescription('Only delete messages from this user').setRequired(false)),

  async execute(interaction, client) {
    const amount = interaction.options.getInteger('amount');
    const user   = interaction.options.getUser('user');
    const channel = interaction.channel;

    try {
      let deleted;
      if (user) {
        const fetched = await channel.messages.fetch({ limit: 100 });
        const target = [...fetched.values()].filter(m => m.author.id === user.id).slice(0, amount);
        deleted = await channel.bulkDelete(target, true);
      } else {
        deleted = await channel.bulkDelete(amount, true);
      }
      await interaction.reply({
        embeds: [embeds.success(`Deleted **${deleted.size}** message(s)${user ? ` from **${user.tag}**` : ''}.`)],
        ephemeral: true
      });
    } catch {
      await interaction.reply({ embeds: [embeds.error('Failed to delete messages. Messages older than 14 days cannot be bulk-deleted.')], ephemeral: true });
    }
  }
};
