import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { UserGuildModel } from '../../database/index.js';
import { getXpToNextLevel } from '../../utils/onMessage.js';

export const data = new SlashCommandBuilder()
    .setName('level')
    .setDescription('Check your current level and XP progress')
    .addUserOption(option =>
        option.setName('user')
            .setDescription('User to check level for (optional)')
            .setRequired(false)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    try {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const guildId = interaction.guild?.id;
        
        if (!guildId) {
            await interaction.reply({ content: 'This command can only be used in a server!', flags: 64 });
            return;
        }

        // Check if the target user is actually in the guild
        const guildMember = await interaction.guild?.members.fetch(targetUser.id).catch(() => null);
        if (!guildMember) {
            await interaction.reply({ 
                content: `${targetUser.username} is not a member of this server!`, 
                flags: 64 
            });
            return;
        }

        // Use display name (nickname if set, otherwise username)
        const displayName = guildMember.displayName;

        const userData = await UserGuildModel.findByUserAndGuild(targetUser.id, guildId);
        
        if (!userData) {
            const isRequestingSelf = targetUser.id === interaction.user.id;
            const message = isRequestingSelf 
                ? "You haven't sent any messages in this server yet! Send some messages to start earning XP and levels." 
                : `${displayName} hasn't sent any messages in this server yet, so they don't have any XP or levels to display.`;
            
            await interaction.reply({ 
                content: message, 
                flags: 64 
            });
            return;
        }

        // Calculate progress to next level
        const guildProgress = getXpToNextLevel(userData.guild_xp);
        const totalProgress = getXpToNextLevel(userData.total_xp);

        // Get requester's display name safely
        const requesterMember = await interaction.guild?.members.fetch(interaction.user.id).catch(() => null);
        const requesterDisplayName = requesterMember?.displayName || interaction.user.username;

        const embed = new EmbedBuilder()
            .setTitle(`📊 ${displayName}'s Level Stats`)
            .setThumbnail(targetUser.displayAvatarURL())
            .setColor(0x00AE86)
            .addFields(
                {
                    name: '🏰 Guild Stats',
                    value: `**Level:** ${userData.guild_level}\n**XP:** ${userData.guild_xp.toLocaleString()}\n**Messages:** ${userData.guild_messages.toLocaleString()}\n**Progress:** ${guildProgress.current}/${guildProgress.needed} XP (${guildProgress.progress.toFixed(1)}%)`,
                    inline: true
                },
                {
                    name: '🌟 Overall Stats',
                    value: `**Level:** ${userData.overall_level}\n**Total XP:** ${userData.total_xp.toLocaleString()}\n**Chips:** ${userData.chips.toLocaleString()}\n**Progress:** ${totalProgress.current}/${totalProgress.needed} XP (${totalProgress.progress.toFixed(1)}%)`,
                    inline: true
                }
            )
            .setFooter({ text: `Requested by ${requesterDisplayName}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        
    } catch (error) {
        console.error('Error in level command:', error);
        
        // Check if we can still reply
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ 
                content: 'There was an error retrieving level information!', 
                flags: 64 
            });
        }
    }
}