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

export interface LeaderboardEntry {
    rank: number;
    user_id: string;
    username: string;
    guild_level: number;
    guild_xp: number;
    guild_messages: number;
}

export interface UserRankContext {
    userEntry: LeaderboardEntry;
    above: LeaderboardEntry | null;
    below: LeaderboardEntry | null;
}

export class UserGuildModel {
    static async create(userId: string, guildId: string): Promise<void> {
        const connection = getDbConnection();
        try {
            // Guarantee the FK target exists without overwriting a real username
            await UserModel.ensureExists(userId);

            // Then create user guild record
            await connection.run(`
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
            // Guarantee the FK target exists without overwriting a real username
            await UserModel.ensureExists(userId);

            // Then create/update user guild record
            await connection.run(`
                INSERT INTO user_guilds (user_id, guild_id, guild_xp, guild_level, guild_messages)
                VALUES (?, ?, 0, 1, 0)
                ON CONFLICT(user_id, guild_id) DO UPDATE SET
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
            const row = await connection.get<UserGuildWithUserData>(`
                SELECT ug.*, u.username, u.chips, u.total_xp, u.overall_level
                FROM user_guilds ug
                JOIN users u ON ug.user_id = u.id
                WHERE ug.user_id = ? AND ug.guild_id = ?
            `, [userId, guildId]);
            return row || null;
        } catch (error) {
            console.error('Error getting user guild data:', error);
            throw error;
        }
    }

    static async findByGuild(guildId: string): Promise<UserGuildWithUserData[]> {
        const connection = getDbConnection();
        try {
            const rows = await connection.all<UserGuildWithUserData[]>(`
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
            const rows = await connection.all<UserGuild[]>(`
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
            let row = await connection.get<{ guild_xp: number }>(
                `SELECT guild_xp FROM user_guilds WHERE user_id = ? AND guild_id = ?`,
                [userId, guildId]
            );
            if (!row) {
                await UserGuildModel.createOrUpdate(userId, guildId);
                row = await connection.get<{ guild_xp: number }>(
                    `SELECT guild_xp FROM user_guilds WHERE user_id = ? AND guild_id = ?`,
                    [userId, guildId]
                );
            }
            if (!row) {
                return;
            }
            const newGuildXp = row.guild_xp + xpAmount;
            const newGuildLevel = Math.floor(Math.sqrt(newGuildXp / 50)) + 1;
            await connection.run(
                `
                UPDATE user_guilds 
                SET guild_xp = ?, 
                    guild_level = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ? AND guild_id = ?
                `,
                [newGuildXp, newGuildLevel, userId, guildId]
            );

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
            await connection.run(`
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
            const rows = await connection.all<UserGuildWithUserData[]>(`
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

    static async getTotalUsersInGuild(guildId: string): Promise<number> {
        const connection = getDbConnection();
        try {
            const row = await connection.get<{ count: number }>(
                `SELECT COUNT(*) as count FROM user_guilds WHERE guild_id = ?`,
                [guildId]
            );
            return row?.count ?? 0;
        } catch (error) {
            console.error('Error getting total users in guild:', error);
            throw error;
        }
    }

    static async getLeaderboardPage(guildId: string, offset: number, limit: number): Promise<LeaderboardEntry[]> {
        const connection = getDbConnection();
        try {
            const rows = await connection.all<LeaderboardEntry[]>(`
                WITH ranked AS (
                    SELECT
                        ug.user_id,
                        u.username,
                        ug.guild_level,
                        ug.guild_xp,
                        ug.guild_messages,
                        ROW_NUMBER() OVER (ORDER BY ug.guild_level DESC, ug.guild_xp DESC) AS rank
                    FROM user_guilds ug
                    JOIN users u ON ug.user_id = u.id
                    WHERE ug.guild_id = ?
                )
                SELECT * FROM ranked
                ORDER BY rank
                LIMIT ? OFFSET ?
            `, [guildId, limit, offset]);
            return rows as LeaderboardEntry[];
        } catch (error) {
            console.error('Error getting leaderboard page:', error);
            throw error;
        }
    }

    static async getUserRankContext(userId: string, guildId: string): Promise<UserRankContext | null> {
        const connection = getDbConnection();
        try {
            const results = await connection.all<LeaderboardEntry[]>(`
                WITH ranked AS (
                    SELECT
                        ug.user_id,
                        u.username,
                        ug.guild_level,
                        ug.guild_xp,
                        ug.guild_messages,
                        ROW_NUMBER() OVER (ORDER BY ug.guild_level DESC, ug.guild_xp DESC) AS rank
                    FROM user_guilds ug
                    JOIN users u ON ug.user_id = u.id
                    WHERE ug.guild_id = ?
                ),
                user_rank AS (
                    SELECT rank FROM ranked WHERE user_id = ?
                )
                SELECT r.* FROM ranked r, user_rank ur
                WHERE r.rank BETWEEN ur.rank - 1 AND ur.rank + 1
                ORDER BY r.rank
            `, [guildId, userId]);

            const typed = results as LeaderboardEntry[];
            const userEntry = typed.find(r => r.user_id === userId) ?? null;
            if (!userEntry) return null;

            const above = typed.find(r => r.rank === userEntry.rank - 1) ?? null;
            const below = typed.find(r => r.rank === userEntry.rank + 1) ?? null;

            return { userEntry, above, below };
        } catch (error) {
            console.error('Error getting user rank context:', error);
            throw error;
        }
    }

    static async delete(userId: string, guildId: string): Promise<void> {
        const connection = getDbConnection();
        try {
            await connection.run(`
                DELETE FROM user_guilds WHERE user_id = ? AND guild_id = ?
            `, [userId, guildId]);
        } catch (error) {
            console.error('Error deleting user guild:', error);
            throw error;
        }
    }
}
