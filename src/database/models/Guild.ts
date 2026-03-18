import { getDbConnection } from '../connection.js';

export interface Guild {
    id: string;
    name: string;
    owner_id?: string;
    member_count: number;
    created_at: Date;
    updated_at: Date;
}

export class GuildModel {
    static async create(guildId: string, name: string, ownerId?: string, memberCount: number = 0): Promise<void> {
        const connection = getDbConnection();
        try {
            await connection.run(`
                INSERT INTO guilds (id, name, owner_id, member_count)
                VALUES (?, ?, ?, ?)
            `, [guildId, name, ownerId, memberCount]);
        } catch (error) {
            console.error('Error creating guild:', error);
            throw error;
        }
    }

    static async createOrUpdate(guildId: string, name: string, ownerId?: string, memberCount: number = 0): Promise<void> {
        const connection = getDbConnection();
        try {
            await connection.run(`
                INSERT INTO guilds (id, name, owner_id, member_count)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                owner_id = excluded.owner_id,
                member_count = excluded.member_count,
                updated_at = CURRENT_TIMESTAMP
            `, [guildId, name, ownerId, memberCount]);
        } catch (error) {
            console.error('Error creating/updating guild:', error);
            throw error;
        }
    }

    static async findById(guildId: string): Promise<Guild | null> {
        const connection = getDbConnection();
        try {
            const row = await connection.get<Guild>(`
                SELECT * FROM guilds WHERE id = ?
            `, [guildId]);
            return row || null;
        } catch (error) {
            console.error('Error getting guild data:', error);
            throw error;
        }
    }

    static async updateMemberCount(guildId: string, memberCount: number): Promise<void> {
        const connection = getDbConnection();
        try {
            await connection.run(`
                UPDATE guilds SET member_count = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [memberCount, guildId]);
        } catch (error) {
            console.error('Error updating guild member count:', error);
            throw error;
        }
    }

    static async delete(guildId: string): Promise<void> {
        const connection = getDbConnection();
        try {
            await connection.run(`
                DELETE FROM guilds WHERE id = ?
            `, [guildId]);
        } catch (error) {
            console.error('Error deleting guild:', error);
            throw error;
        }
    }

    static async findAll(): Promise<Guild[]> {
        const connection = getDbConnection();
        try {
            const rows = await connection.all<Guild[]>(`
                SELECT * FROM guilds ORDER BY member_count DESC
            `);
            return rows as Guild[];
        } catch (error) {
            console.error('Error getting all guilds:', error);
            throw error;
        }
    }
}
