import { getDbConnection } from '../connection.js';

export interface User {
    id: string;
    username: string;
    discriminator?: string;
    chips: number;
    total_xp: number;
    overall_level: number;
    created_at: Date;
    updated_at: Date;
}

export class UserModel {
    static async create(userId: string, username: string, discriminator?: string): Promise<void> {
        const connection = getDbConnection();
        try {
            await connection.run(`
                INSERT INTO users (id, username, discriminator, chips, total_xp, overall_level)
                VALUES (?, ?, ?, 100, 0, 1)
            `, [userId, username, discriminator || '0000']);
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    /**
     * Inserts the user row only if it doesn't already exist.
     * Never overwrites an existing username — use this when you just need to
     * guarantee the FK target is present (e.g. from UserGuildModel).
     */
    static async ensureExists(userId: string): Promise<void> {
        const connection = getDbConnection();
        try {
            await connection.run(`
                INSERT INTO users (id, username, discriminator, chips, total_xp, overall_level)
                VALUES (?, 'Unknown', '0000', 100, 0, 1)
                ON CONFLICT(id) DO NOTHING
            `, [userId]);
        } catch (error) {
            console.error('Error ensuring user exists:', error);
            throw error;
        }
    }

    static async createOrUpdate(userId: string, username: string, discriminator?: string): Promise<void> {
        const connection = getDbConnection();
        try {
            await connection.run(`
                INSERT INTO users (id, username, discriminator, chips, total_xp, overall_level)
                VALUES (?, ?, ?, 100, 0, 1)
                ON CONFLICT(id) DO UPDATE SET
                username = excluded.username,
                discriminator = excluded.discriminator,
                updated_at = CURRENT_TIMESTAMP
            `, [userId, username, discriminator || '0000']);
        } catch (error) {
            console.error('Error creating/updating user:', error);
            throw error;
        }
    }

    static async findById(userId: string): Promise<User | null> {
        const connection = getDbConnection();
        try {
            const row = await connection.get<User>(`
                SELECT * FROM users WHERE id = ?
            `, [userId]);
            return row || null;
        } catch (error) {
            console.error('Error getting user data:', error);
            throw error;
        }
    }

    static async updateChips(userId: string, chips: number): Promise<void> {
        const connection = getDbConnection();
        try {
            await connection.run(`
                UPDATE users SET chips = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [chips, userId]);
        } catch (error) {
            console.error('Error updating user chips:', error);
            throw error;
        }
    }

    static async addXp(userId: string, xpAmount: number): Promise<void> {
        const connection = getDbConnection();
        try {
            const row = await connection.get<{ total_xp: number }>(
                `SELECT total_xp FROM users WHERE id = ?`,
                [userId]
            );
            if (!row) {
                return;
            }
            const newTotalXp = row.total_xp + xpAmount;
            const newLevel = Math.floor(Math.sqrt(newTotalXp / 50)) + 1;
            await connection.run(
                `
                UPDATE users 
                SET total_xp = ?,
                    overall_level = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                `,
                [newTotalXp, newLevel, userId]
            );
        } catch (error) {
            console.error('Error adding XP to user:', error);
            throw error;
        }
    }

    static async delete(userId: string): Promise<void> {
        const connection = getDbConnection();
        try {
            await connection.run(`
                DELETE FROM users WHERE id = ?
            `, [userId]);
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    }

    static async findAll(): Promise<User[]> {
        const connection = getDbConnection();
        try {
            const rows = await connection.all<User[]>(`
                SELECT * FROM users ORDER BY overall_level DESC, total_xp DESC
            `);
            return rows as User[];
        } catch (error) {
            console.error('Error getting all users:', error);
            throw error;
        }
    }

    static async getTopUsers(limit: number = 10): Promise<User[]> {
        const connection = getDbConnection();
        try {
            const rows = await connection.all<User[]>(`
                SELECT * FROM users 
                ORDER BY overall_level DESC, total_xp DESC 
                LIMIT ?
            `, [limit]);
            return rows as User[];
        } catch (error) {
            console.error('Error getting top users:', error);
            throw error;
        }
    }
}
