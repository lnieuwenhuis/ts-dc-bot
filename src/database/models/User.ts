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
            await connection.execute(`
                INSERT INTO users (id, username, discriminator, chips, total_xp, overall_level)
                VALUES (?, ?, ?, 100, 0, 1)
            `, [userId, username, discriminator || '0000']);
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    static async createOrUpdate(userId: string, username: string, discriminator?: string): Promise<void> {
        const connection = getDbConnection();
        try {
            await connection.execute(`
                INSERT INTO users (id, username, discriminator, chips, total_xp, overall_level)
                VALUES (?, ?, ?, 100, 0, 1)
                ON DUPLICATE KEY UPDATE
                username = VALUES(username),
                discriminator = VALUES(discriminator),
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
            const [rows] = await connection.execute(`
                SELECT * FROM users WHERE id = ?
            `, [userId]);
            return (rows as User[])[0] || null;
        } catch (error) {
            console.error('Error getting user data:', error);
            throw error;
        }
    }

    static async updateChips(userId: string, chips: number): Promise<void> {
        const connection = getDbConnection();
        try {
            await connection.execute(`
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
            // Updated exponential formula: level = floor(sqrt(xp / 50)) + 1
            await connection.execute(`
                UPDATE users 
                SET total_xp = total_xp + ?,
                    overall_level = FLOOR(SQRT((total_xp + ?) / 50)) + 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [xpAmount, xpAmount, userId]);
        } catch (error) {
            console.error('Error adding XP to user:', error);
            throw error;
        }
    }

    static async delete(userId: string): Promise<void> {
        const connection = getDbConnection();
        try {
            await connection.execute(`
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
            const [rows] = await connection.execute(`
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
            const [rows] = await connection.execute(`
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