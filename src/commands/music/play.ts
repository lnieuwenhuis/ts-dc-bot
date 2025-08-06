import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { useMainPlayer } from 'discord-player';

export const data = new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song from Spotify, SoundCloud, Deezer, or other sources (excluding YouTube)')
    .addStringOption(option =>
        option
            .setName('query')
            .setDescription('Song name, URL, or search query')
            .setRequired(true)
    )
    .addStringOption(option =>
        option
            .setName('source')
            .setDescription('Preferred search source')
            .setRequired(false)
            .addChoices(
                { name: 'Spotify', value: 'spotify' },
                { name: 'SoundCloud', value: 'soundcloud' },
                { name: 'Deezer', value: 'deezer' },
                { name: 'Apple Music', value: 'apple_music' },
                { name: 'Auto (No YouTube)', value: 'auto' }
            )
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const player = useMainPlayer();
    
    // Proper type checking for GuildMember
    const member = interaction.member as GuildMember;
    if (!member || !member.voice?.channel) {
        return interaction.reply({ 
            content: '❌ You need to be in a voice channel to play music!', 
            ephemeral: true 
        });
    }
    
    const channel = member.voice.channel;
    const query = interaction.options.getString('query', true);
    const source = interaction.options.getString('source') || 'auto';
    
    await interaction.deferReply();
    
    try {
        // Map source to proper search engine strings (excluding YouTube)
        let searchEngine: string | undefined;
        switch (source) {
            case 'spotify':
                searchEngine = 'spotifySearch';
                break;
            case 'soundcloud':
                searchEngine = 'soundcloudSearch';
                break;
            case 'deezer':
                searchEngine = 'deezerSearch';
                break;
            case 'apple_music':
                searchEngine = 'appleMusicSearch';
                break;
            case 'auto':
            default:
                // For auto, prioritize: Spotify > Deezer > Apple Music > SoundCloud (last)
                searchEngine = 'spotifySearch';
                break;
        }
        
        let track, searchResult;
        
        // Try the selected/preferred source first
        try {
            const result = await player.play(channel, query, {
                searchEngine: searchEngine as any,
                requestedBy: interaction.user,
                nodeOptions: {
                    metadata: {
                        channel: interaction.channel,
                        client: interaction.guild?.members.me,
                        requestedBy: interaction.user
                    },
                    volume: 50,
                    leaveOnEmpty: true,
                    leaveOnEmptyCooldown: 300000,
                    leaveOnEnd: true,
                    leaveOnEndCooldown: 300000,
                }
            });
            track = result.track;
            searchResult = result.searchResult;
        } catch (error) {
            // If the preferred source fails and it's auto mode, try fallback sources
            if (source === 'auto') {
                // Updated fallback order: Deezer > Apple Music > SoundCloud (last)
                const fallbackSources = ['deezerSearch', 'appleMusicSearch', 'soundcloudSearch'];
                
                for (const fallbackEngine of fallbackSources) {
                    try {
                        const result = await player.play(channel, query, {
                            searchEngine: fallbackEngine as any,
                            requestedBy: interaction.user,
                            nodeOptions: {
                                metadata: {
                                    channel: interaction.channel,
                                    client: interaction.guild?.members.me,
                                    requestedBy: interaction.user
                                },
                                volume: 50,
                                leaveOnEmpty: true,
                                leaveOnEmptyCooldown: 300000,
                                leaveOnEnd: true,
                                leaveOnEndCooldown: 300000,
                            }
                        });
                        track = result.track;
                        searchResult = result.searchResult;
                        break;
                    } catch (fallbackError) {
                        continue; // Try next fallback
                    }
                }
                
                if (!track) {
                    throw new Error('No results found on any supported platform (Spotify, Deezer, Apple Music, SoundCloud)');
                }
            } else {
                throw error; // Re-throw if specific source was requested
            }
        }
        
        if (!searchResult) {
            throw new Error('No results found');
        }
        
        const method = searchResult.hasPlaylist() ? 'Playlist' : 'Track';
        
        // Use the newly added track data directly (not currentTrack which shows what's playing)
        const trackTitle = track.title || 'Unknown Track';
        const actualUrl = track.raw?.url || track.url || '';
        
        return interaction.followUp({
            content: `✅ **${method} added to queue!**\n🎵 [${trackTitle}](${actualUrl})\n👤 Requested by ${interaction.user}`
        });
        
    } catch (error) {
        console.error('Play command error:', error);
        return interaction.followUp({
            content: `❌ Something went wrong: ${error instanceof Error ? error.message : 'Unknown error'}\n💡 Try using a direct link from Spotify, Deezer, or Apple Music!`
        });
    }
}