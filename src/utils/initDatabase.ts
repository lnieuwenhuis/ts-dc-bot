import sqlite3 from 'sqlite3';
import { open, type Database } from 'sqlite';
import fs from 'fs/promises';
import path from 'path';

let connection: Database;

export async function initDatabase(): Promise<Database> {
    const volumeMountPath = process.env.RAILWAY_VOLUME_MOUNT_PATH;
    const defaultDbPath = volumeMountPath
        ? path.join(volumeMountPath, 'discord_bot.sqlite')
        : path.join(process.cwd(), 'data', 'discord_bot.sqlite');
    const dbPath = process.env.DB_PATH || defaultDbPath;
    await fs.mkdir(path.dirname(dbPath), { recursive: true });

    connection = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    await connection.exec('PRAGMA foreign_keys = ON;');
    await runMigrations();
    return connection;
}

async function checkTableExists(tableName: string): Promise<boolean> {
    try {
        const row = await connection.get<{ name: string }>(
            `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`,
            [tableName]
        );
        return !!row;
    } catch (error) {
        console.error(`Error checking if table ${tableName} exists:`, error);
        return false;
    }
}

async function checkTableHasData(tableName: string): Promise<boolean> {
    try {
        const allowedTables = new Set(['users', 'user_guilds', 'guilds']);
        if (!allowedTables.has(tableName)) {
            throw new Error(`Invalid table name: ${tableName}`);
        }
        const row = await connection.get<{ count: number }>(`SELECT COUNT(*) as count FROM ${tableName}`);
        return (row?.count ?? 0) > 0;
    } catch (error) {
        // If table doesn't exist, it has no data
        return false;
    }
}

async function runMigrations(): Promise<void> {
    try {
        // Check if any of our main tables exist and have data
        const usersExists = await checkTableExists('users');
        const userGuildsExists = await checkTableExists('user_guilds');
        const guildsExists = await checkTableExists('guilds');

        if (usersExists || userGuildsExists || guildsExists) {
            console.log('Database tables already exist. Checking for data...');
            
            const usersHasData = usersExists ? await checkTableHasData('users') : false;
            const userGuildsHasData = userGuildsExists ? await checkTableHasData('user_guilds') : false;
            const guildsHasData = guildsExists ? await checkTableHasData('guilds') : false;

            if (usersHasData || userGuildsHasData || guildsHasData) {
                console.log('⚠️  Database tables contain data. Skipping migrations to prevent data loss.');
                console.log('If you need to run migrations, please backup your data first and manually drop the tables.');
                return;
            } else {
                console.log('Tables exist but are empty. Safe to proceed with migrations.');
            }
        } else {
            console.log('No existing tables found. Running initial migrations...');
        }

        // Create users table
        await connection.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT NOT NULL,
                discriminator TEXT,
                chips INTEGER DEFAULT 100,
                total_xp INTEGER DEFAULT 0,
                overall_level INTEGER DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create user_guilds table for guild-specific data
        await connection.exec(`
            CREATE TABLE IF NOT EXISTS user_guilds (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                guild_id TEXT NOT NULL,
                guild_xp INTEGER DEFAULT 0,
                guild_level INTEGER DEFAULT 1,
                guild_messages INTEGER DEFAULT 0,
                joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
                last_message_at TEXT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (user_id, guild_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // Create guilds table for guild information
        await connection.exec(`
            CREATE TABLE IF NOT EXISTS guilds (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                owner_id TEXT,
                member_count INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('✅ Database migrations completed successfully');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

export function getConnection(): Database {
    return connection;
}
