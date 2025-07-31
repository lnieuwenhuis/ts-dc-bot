import { Message } from 'discord.js';
import { UserModel, UserGuildModel } from '../database/index.js';

// Cooldown map to prevent XP spam (user ID -> last XP time)
const xpCooldowns = new Map<string, number>();
const XP_COOLDOWN = 60000; // 1 minute cooldown between XP gains

export async function handleMessage(message: Message): Promise<void> {
    // Skip bots
    if (message.author.bot) return;
    
    // Skip DMs
    if (!message.guild) return;
    
    const member = message.guild.members.cache.get(message.author.id);
    const muteRole = message.guild.roles.cache.find(role => role.name === "Muted");
    
    // Handle muted users
    if (member && muteRole && member.roles.cache.has(muteRole.id)) {
        try {
            await message.delete();
            
            try {
                // Check if channel supports sending messages
                if (message.channel.isTextBased() && 'send' in message.channel) {
                    const muteNotification = await message.channel.send(`${message.author.tag} is muted and cannot send messages in the server.`);
                    
                    // Delete the notification message after 3 seconds
                    setTimeout(async () => {
                        try {
                            await muteNotification.delete();
                        } catch (deleteError) {
                            console.log(`Could not delete mute notification: ${deleteError}`);
                        }
                    }, 3000);
                }
                
            } catch (dmError) {
                console.log(`Could not send mute notification: ${dmError}`);
            }
        } catch (error) {
            console.error('Failed to delete message from muted user:', error);
        }
        return; // Don't give XP to muted users
    }

    // Handle XP rewards
    await handleXpReward(message);
}

async function handleXpReward(message: Message): Promise<void> {
    const userId = message.author.id;
    const guildId = message.guild!.id;
    const username = message.author.username;
    const discriminator = message.author.discriminator;
    
    // Check cooldown
    const lastXpTime = xpCooldowns.get(userId);
    const now = Date.now();
    
    if (lastXpTime && (now - lastXpTime) < XP_COOLDOWN) {
        return; // User is on cooldown
    }
    
    try {
        // Ensure user and user_guild records exist
        await UserModel.createOrUpdate(userId, username, discriminator);
        await UserGuildModel.createOrUpdate(userId, guildId);
        
        // Generate random XP between 1 and 25
        const xpGain = Math.floor(Math.random() * 25) + 1;
        
        // Get current data to check for level ups
        const beforeData = await UserGuildModel.findByUserAndGuild(userId, guildId);
        
        // Add XP (this updates both guild and total XP)
        await UserGuildModel.addGuildXp(userId, guildId, xpGain);
        
        // Increment message count
        await UserGuildModel.incrementMessages(userId, guildId);
        
        // Set cooldown
        xpCooldowns.set(userId, now);
        
        // Check for level up and notify
        const afterData = await UserGuildModel.findByUserAndGuild(userId, guildId);
        
        if (beforeData && afterData) {
            // Check if channel supports sending messages before sending level-up notifications
            if (message.channel.isTextBased() && 'send' in message.channel) {
                // Check guild level up
                if (afterData.guild_level > beforeData.guild_level) {
                    await message.channel.send(`🎉 Congratulations ${message.author}! You've reached **Guild Level ${afterData.guild_level}**!`);
                }
                
                // Check overall level up
                if (afterData.overall_level > beforeData.overall_level) {
                    await message.channel.send(`🌟 Amazing ${message.author}! You've reached **Overall Level ${afterData.overall_level}**!`);
                }
            }
        }
        
    } catch (error) {
        console.error('Error handling XP reward:', error);
    }
}

// Helper function to calculate level from XP (exponential formula)
export function calculateLevel(xp: number): number {
    // More exponential formula: level = floor(sqrt(xp / 50)) + 1
    // This makes each level progressively harder
    return Math.floor(Math.sqrt(xp / 50)) + 1;
}

// Helper function to calculate XP needed for next level
export function getXpForLevel(level: number): number {
    // Inverse of the level formula: xp = (level - 1)^2 * 50
    return Math.pow(level - 1, 2) * 50;
}

// Helper function to get XP needed for next level
export function getXpToNextLevel(currentXp: number): { current: number, needed: number, progress: number } {
    const currentLevel = calculateLevel(currentXp);
    const currentLevelXp = getXpForLevel(currentLevel);
    const nextLevelXp = getXpForLevel(currentLevel + 1);
    
    return {
        current: currentXp - currentLevelXp,
        needed: nextLevelXp - currentLevelXp,
        progress: ((currentXp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100
    };
}