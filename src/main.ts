import { Client, Events, GatewayIntentBits } from "discord.js";
import { deployCommands } from "./deploy-commands";
import { loadCommands } from "./commands/index";
import { initDatabase } from "./utils/initDatabase";
import { handleMessage } from "./utils/onMessage";
import { handleBlackjackInteraction } from "./commands/casino/blackjack";
import { handleLeaderboardInteraction } from "./commands/general/leaderboard";
import { router } from './api/router.js';
import { encodeToken } from './api/auth.js';
import './api/routes/stats.js';
import './api/routes/guilds.js';
import './api/routes/users.js';
import { GuildModel } from './database/models/Guild.js';
import { UserModel } from './database/models/User.js';
import { getDbConnection } from './database/connection.js';
// import { Player } from "discord-player";
// import { DefaultExtractors } from "@discord-player/extractor";

// Bind to Railway's port immediately so the health check passes and
// outbound networking is fully available before we connect to Discord.
const port = process.env.PORT || 8080;
router.post('/auth/login', ({ res, body }) => {
  const b = body as { password?: string };
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'changeme';
  if (b.password !== adminPassword) {
    router.json(res, 401, { error: 'Invalid password' });
    return;
  }
  const secret = process.env.JWT_SECRET ?? 'default_secret';
  router.json(res, 200, { token: encodeToken(secret) });
});
router.listen(port);

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    process.exit(1);
});

const db = await initDatabase();
console.log("Database connected and initialized");

const commands = await loadCommands();
console.log(`Loaded ${Object.keys(commands).length} commands:`, Object.keys(commands).join(', '));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildVoiceStates
    ],
});

// const player = new Player(client);
// await player.extractors.loadMulti(DefaultExtractors);

async function syncGuildsAndMembers(readyClient: typeof client & { isReady(): true }) {
    console.log(`Syncing ${readyClient.guilds.cache.size} guilds to database...`);
    for (const [, guild] of readyClient.guilds.cache) {
        try {
            // Upsert guild record
            await GuildModel.createOrUpdate(guild.id, guild.name, guild.ownerId ?? undefined, guild.memberCount);

            // Fetch all members to resolve real usernames
            const members = await guild.members.fetch();
            for (const [, member] of members) {
                if (member.user.bot) continue;
                // createOrUpdate sets the real username; if the user row exists with
                // 'Unknown' it will be overwritten with the actual Discord username.
                await UserModel.createOrUpdate(
                    member.user.id,
                    member.user.username,
                    member.user.discriminator
                );
            }
            console.log(`Synced guild "${guild.name}" with ${members.size} members`);
        } catch (err) {
            console.error(`Failed to sync guild ${guild.name}:`, err);
        }
    }
    console.log("Guild + member sync complete.");
}

async function reconcileDatabaseFromDiscord(readyClient: typeof client & { isReady(): true }) {
    const db = getDbConnection();

    const missingGuildRows = await db.all<{ guild_id: string }[]>(`
        SELECT DISTINCT ug.guild_id
        FROM user_guilds ug
        LEFT JOIN guilds g ON g.id = ug.guild_id
        WHERE g.id IS NULL
    `);

    if (missingGuildRows.length > 0) {
        console.log(`Backfilling ${missingGuildRows.length} guild records from user_guilds...`);
    }

    for (const row of missingGuildRows) {
        try {
            const guild = await readyClient.guilds.fetch(row.guild_id);
            await GuildModel.createOrUpdate(guild.id, guild.name, guild.ownerId ?? undefined, guild.memberCount);
        } catch (error) {
            console.error(`Failed to resolve missing guild ${row.guild_id}:`, error);
        }
    }

    const unknownUsers = await db.all<{ id: string }[]>(`
        SELECT id FROM users
        WHERE username IS NULL OR TRIM(username) = '' OR username = 'Unknown'
    `);

    if (unknownUsers.length > 0) {
        console.log(`Resolving ${unknownUsers.length} placeholder usernames from Discord...`);
    }

    for (const row of unknownUsers) {
        try {
            const user = await readyClient.users.fetch(row.id);
            await UserModel.createOrUpdate(user.id, user.username, user.discriminator);
        } catch (error) {
            console.error(`Failed to resolve username for ${row.id}:`, error);
        }
    }
}

client.on(Events.ClientReady, async readyClient => {
    console.log("Logged in as", readyClient.user?.tag);

    deployCommands(commands);

    // Backfill guilds table and resolve 'Unknown' usernames on every startup
    await syncGuildsAndMembers(readyClient);
    await reconcileDatabaseFromDiscord(readyClient);
})

// Keep guild table up to date when the bot joins new servers
client.on(Events.GuildCreate, async guild => {
    try {
        await GuildModel.createOrUpdate(guild.id, guild.name, guild.ownerId ?? undefined, guild.memberCount);
        console.log(`Bot joined new guild: "${guild.name}" — added to DB`);
    } catch (err) {
        console.error(`Failed to create guild record for ${guild.name}:`, err);
    }
});

// Use the new handleMessage utility
client.on(Events.MessageCreate, handleMessage);

client.on(Events.InteractionCreate, async (interaction) => {
    // Handle chat input commands
    if (interaction.isChatInputCommand()) {
        const command = commands[interaction.commandName];

        if (!command) return;

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(`Error executing ${interaction.commandName}:`, error);
            
            // Check if interaction has already been replied to or deferred
            if (!interaction.replied && !interaction.deferred) {
                try {
                    await interaction.reply({ 
                        content: "There was an error while executing this command!", 
                        flags: 64 
                    });
                } catch (replyError) {
                    console.error('Failed to send error message:', replyError);
                }
            } else {
                // If already replied, try to follow up instead
                try {
                    await interaction.followUp({ 
                        content: "There was an error while executing this command!", 
                        flags: 64 
                    });
                } catch (followUpError) {
                    console.error('Failed to send follow-up error message:', followUpError);
                }
            }
        }
        return;
    }

    // Handle button interactions
    if (interaction.isButton()) {
        try {
            // Check if it's a blackjack button
            if (interaction.customId.startsWith('blackjack_')) {
                await handleBlackjackInteraction(interaction);
                return;
            }

            // Check if it's a leaderboard pagination button
            if (interaction.customId.startsWith('leaderboard_')) {
                await handleLeaderboardInteraction(interaction);
                return;
            }

            // Add other button handlers here as needed
            
        } catch (error) {
            console.error(`Error handling button interaction:`, error);
            
            if (!interaction.replied && !interaction.deferred) {
                try {
                    await interaction.reply({ 
                        content: "There was an error while processing this interaction!", 
                        ephemeral: true
                    });
                } catch (replyError) {
                    console.error('Failed to send error message:', replyError);
                }
            }
        }
        return;
    }
});

// Export database connection for use in other modules
export { db };

client.on('error', (error) => {
    console.error('Discord client error:', error);
});


console.log("Logging in to Discord...");
client.login(process.env.DISCORD_TOKEN).catch((error) => {
    console.error("Failed to login to Discord:", error);
    process.exit(1);
});
