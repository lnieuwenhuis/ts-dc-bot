import mysql from 'mysql2/promise';

interface DatabaseConfig {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
}

let connection: mysql.Connection;

export async function initDatabase(): Promise<mysql.Connection> {
    const config: DatabaseConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER || 'bot_user',
        password: process.env.DB_PASSWORD || 'bot_password',
        database: process.env.DB_NAME || 'discord_bot'
    };

    const maxRetries = 10;
    const retryDelay = 3000; // 3 seconds

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`Attempting to connect to database (attempt ${attempt}/${maxRetries})...`);
            
            // Create connection
            connection = await mysql.createConnection(config);
            console.log('Connected to MariaDB database');

            // Run migrations only if safe to do so
            await runMigrations();
            
            return connection;
        } catch (error) {
            console.error(`Database connection attempt ${attempt} failed:`, error);
            
            if (attempt === maxRetries) {
                console.error('All database connection attempts failed');
                throw error;
            }
            
            console.log(`Retrying in ${retryDelay/1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
    }
    
    throw new Error('Failed to connect to database after all retries');
}

async function checkTableExists(tableName: string): Promise<boolean> {
    try {
        const [rows] = await connection.execute(`
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_schema = DATABASE() 
            AND table_name = ?
        `, [tableName]);
        return (rows as any[])[0].count > 0;
    } catch (error) {
        console.error(`Error checking if table ${tableName} exists:`, error);
        return false;
    }
}

async function checkTableHasData(tableName: string): Promise<boolean> {
    try {
        const [rows] = await connection.execute(`SELECT COUNT(*) as count FROM ??`, [tableName]);
        return (rows as any[])[0].count > 0;
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
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(20) PRIMARY KEY,
                username VARCHAR(255) NOT NULL,
                discriminator VARCHAR(10),
                chips INT DEFAULT 100,
                total_xp BIGINT DEFAULT 0,
                overall_level INT DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Create user_guilds table for guild-specific data
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS user_guilds (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(20) NOT NULL,
                guild_id VARCHAR(20) NOT NULL,
                guild_xp BIGINT DEFAULT 0,
                guild_level INT DEFAULT 1,
                guild_messages INT DEFAULT 0,
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_message_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_user_guild (user_id, guild_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // Create guilds table for guild information
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS guilds (
                id VARCHAR(20) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                owner_id VARCHAR(20),
                member_count INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        console.log('✅ Database migrations completed successfully');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

export function getConnection(): mysql.Connection {
    return connection;
}