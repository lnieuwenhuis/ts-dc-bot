import { Client, Events, GatewayIntentBits, REST, Routes } from "discord.js";
import { deployCommands } from "./deploy-commands";
import { loadCommands } from "./commands/index";
import { initDatabase } from "./utils/initDatabase";
import { handleMessage } from "./utils/onMessage";
import { handleBlackjackInteraction } from "./commands/casino/blackjack";
// import { Player } from "discord-player";
// import { DefaultExtractors } from "@discord-player/extractor";

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

client.on(Events.ClientReady, readyClient => {
    console.log("Logged in as", readyClient.user?.tag);

    deployCommands(commands);
})

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

// Test REST API connectivity and token validity before attempting WebSocket login
console.log("Testing Discord REST API...");
try {
    const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN!);
    const me = await rest.get(Routes.user('@me')) as any;
    console.log(`Discord REST API OK. Bot user: ${me.username}#${me.discriminator}`);
} catch (error: any) {
    console.error("Discord REST API test FAILED:", error?.message ?? error);
    console.error("This means either the DISCORD_TOKEN in Railway is wrong/outdated, or Discord's API is unreachable from this Railway region.");
    process.exit(1);
}

console.log("Logging in to Discord...");
const loginTimeout = setTimeout(() => {
    console.error("Login timed out after 30 seconds. Check: 1) DISCORD_TOKEN env var in Railway, 2) Privileged intents (GuildMembers, GuildPresences, MessageContent) are enabled in the Discord Developer Portal.");
    process.exit(1);
}, 30000);

client.login(process.env.DISCORD_TOKEN).then(() => {
    clearTimeout(loginTimeout);
}).catch((error) => {
    clearTimeout(loginTimeout);
    console.error("Failed to login to Discord:", error);
    process.exit(1);
});