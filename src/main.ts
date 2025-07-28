import { Client, Events, GatewayIntentBits } from "discord.js";
import { deployCommands } from "./deploy-commands";
import { loadCommands } from "./commands/index";

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

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;
    
    if (!message.guild) return;
    
    const member = message.guild.members.cache.get(message.author.id);
    const muteRole = message.guild.roles.cache.find(role => role.name === "Muted");
    
    if (member && muteRole && member.roles.cache.has(muteRole.id)) {
        try {
            await message.delete();
            
            try {
                const muteNotification = await message.channel.send(`${message.author.tag} is muted and cannot send messages in the server.`);
                
                // Delete the notification message after 3 seconds
                setTimeout(async () => {
                    try {
                        await muteNotification.delete();
                    } catch (deleteError) {
                        console.log(`Could not delete mute notification: ${deleteError}`);
                    }
                }, 3000);
                
            } catch (dmError) {
                console.log(`Could not send mute notification: ${dmError}`);
            }
        } catch (error) {
            console.error('Failed to delete message from muted user:', error);
        }
    }
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = commands[interaction.commandName];

    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(`Error executing ${interaction.commandName}:`, error);
        await interaction.reply({ content: "There was an error while executing this command!", ephemeral: true });
    }
});

client.login(process.env.DISCORD_TOKEN);