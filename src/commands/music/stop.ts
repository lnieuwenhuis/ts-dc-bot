import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { useMainPlayer } from 'discord-player';

export const data = new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop the music and clear the queue');

export async function execute(interaction: ChatInputCommandInteraction) {
    const player = useMainPlayer();
    const queue = player.nodes.get(interaction.guildId!);
    
    if (!queue || !queue.isPlaying()) {
        return interaction.reply({ 
            content: '❌ No music is currently playing!', 
            ephemeral: true 
        });
    }
    
    // Proper type checking for GuildMember
    const member = interaction.member as GuildMember;
    if (!member || !member.voice?.channel) {
        return interaction.reply({ 
            content: '❌ You need to be in a voice channel to control music!', 
            ephemeral: true 
        });
    }
    
    try {
        queue.delete();
        return interaction.reply('⏹️ **Stopped the music and cleared the queue!**');
    } catch (error) {
        console.error('Stop command error:', error);
        return interaction.reply({
            content: `❌ Something went wrong: ${error instanceof Error ? error.message : 'Unknown error'}`,
            ephemeral: true
        });
    }
}