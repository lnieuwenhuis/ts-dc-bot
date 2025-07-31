import { getDbConnection } from '../connection.js';
import { UserModel } from './User.js';

export interface UserGuild {
    id: number;
    user_id: string;
    guild_id: string;
    guild_xp: number;
    guild_level: number;
    guild_messages: number;
    joined_at: Date;
    last_message_at?: Date;
    created_at: Date;
    updated_at: Date;
}

export interface UserGuildWithUserData extends UserGuild {
    username: string;
    chips: number;
    total_xp: number;
    overall_level: number;
}

export class UserGuildModel {
    static async create(userId: string, guildId: string): Promise<void> {
        const connection = getDbConnection();
        try {
            // First ensure user exists
            await UserModel.createOrUpdate(userId, 'Unknown', '0000');

            // Then create user guild record
            await connection.execute(`
                INSERT INTO user_guilds (user_id, guild_id, guild_xp, guild_level, guild_messages)
                VALUES (?, ?, 0, 1, 0)
            `, [userId, guildId]);
        } catch (error) {
            console.error('Error creating user guild:', error);
            throw error;
        }
    }

    static async createOrUpdate(userId: string, guildId: string): Promise<void> {
        const connection = getDbConnection();
        try {
            // First ensure user exists
            await UserModel.createOrUpdate(userId, 'Unknown', '0000');

            // Then create/update user guild record
            await connection.execute(`
                INSERT INTO user_guilds (user_id, guild_id, guild_xp, guild_level, guild_messages)
                VALUES (?, ?, 0, 1, 0)
                ON DUPLICATE KEY UPDATE
                updated_at = CURRENT_TIMESTAMP
            `, [userId, guildId]);
        } catch (error) {
            console.error('Error creating/updating user guild:', error);
            throw error;
        }
    }

    static async findByUserAndGuild(userId: string, guildId: string): Promise<UserGuildWithUserData | null> {
        const connection = getDbConnection();
        try {
            const [rows] = await connection.execute(`
                SELECT ug.*, u.username, u.chips, u.total_xp, u.overall_level
                FROM user_guilds ug
                JOIN users u ON ug.user_id = u.id
                WHERE ug.user_id = ? AND ug.guild_id = ?
            `, [userId, guildId]);
            return (rows as UserGuildWithUserData[])[0] || null;
        } catch (error) {
            console.error('Error getting user guild data:', error);
            throw error;
        }
    }

    static async findByGuild(guildId: string): Promise<UserGuildWithUserData[]> {
        const connection = getDbConnection();
        try {
            const [rows] = await connection.execute(`
                SELECT ug.*, u.username, u.chips, u.total_xp, u.overall_level
                FROM user_guilds ug
                JOIN users u ON ug.user_id = u.id
                WHERE ug.guild_id = ?
                ORDER BY ug.guild_level DESC, ug.guild_xp DESC
            `, [guildId]);
            return rows as UserGuildWithUserData[];
        } catch (error) {
            console.error('Error getting guild users:', error);
            throw error;
        }
    }

    static async findByUser(userId: string): Promise<UserGuild[]> {
        const connection = getDbConnection();
        try {
            const [rows] = await connection.execute(`
                SELECT * FROM user_guilds WHERE user_id = ?
            `, [userId]);
            return rows as UserGuild[];
        } catch (error) {
            console.error('Error getting user guilds:', error);
            throw error;
        }
    }

    static async addGuildXp(userId: string, guildId: string, xpAmount: number): Promise<void> {
        const connection = getDbConnection();
        try {
            // Update guild XP and level with new exponential formula
            await connection.execute(`
                UPDATE user_guilds 
                SET guild_xp = guild_xp + ?, 
                    guild_level = FLOOR(SQRT((guild_xp + ?) / 50)) + 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ? AND guild_id = ?
            `, [xpAmount, xpAmount, userId, guildId]);

            // Also update user's total XP
            await UserModel.addXp(userId, xpAmount);
        } catch (error) {
            console.error('Error adding guild XP:', error);
            throw error;
        }
    }

    static async incrementMessages(userId: string, guildId: string): Promise<void> {
        const connection = getDbConnection();
        try {
            await connection.execute(`
                UPDATE user_guilds 
                SET guild_messages = guild_messages + 1,
                    last_message_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ? AND guild_id = ?
            `, [userId, guildId]);
        } catch (error) {
            console.error('Error incrementing messages:', error);
            throw error;
        }
    }

    static async getTopUsersInGuild(guildId: string, limit: number = 10): Promise<UserGuildWithUserData[]> {
        const connection = getDbConnection();
        try {
            const [rows] = await connection.execute(`
                SELECT ug.*, u.username, u.chips, u.total_xp, u.overall_level
                FROM user_guilds ug
                JOIN users u ON ug.user_id = u.id
                WHERE ug.guild_id = ?
                ORDER BY ug.guild_level DESC, ug.guild_xp DESC
                LIMIT ?
            `, [guildId, limit]);
            return rows as UserGuildWithUserData[];
        } catch (error) {
            console.error('Error getting top guild users:', error);
            throw error;
        }
    }

    static async delete(userId: string, guildId: string): Promise<void> {
        const connection = getDbConnection();
        try {
            await connection.execute(`
                DELETE FROM user_guilds WHERE user_id = ? AND guild_id = ?
            `, [userId, guildId]);
        } catch (error) {
            console.error('Error deleting user guild:', error);
            throw error;
        }
    }
}