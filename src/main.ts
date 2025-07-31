import { Client, Events, GatewayIntentBits } from "discord.js";
import { deployCommands } from "./deploy-commands";
import { loadCommands } from "./commands/index";
import { initDatabase } from "./utils/initDatabase";
import { handleMessage } from "./utils/onMessage";

const db = await initDatabase();
console.log("Database connected and initialized");

const commands = await loadCommands();

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

client.on(Events.ClientReady, readyClient => {
    console.log("Logged in as", readyClient.user?.tag);

    deployCommands(commands);
})

// Use the new handleMessage utility
client.on(Events.MessageCreate, handleMessage);

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

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
});

// Export database connection for use in other modules
export { db };

client.login(process.env.DISCORD_TOKEN);