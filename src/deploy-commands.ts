import { REST, Routes } from "discord.js";
import { config } from "./config";

export async function deployCommands(commands: Record<string, any>) {
    const rest = new REST({ version: "10" }).setToken(config.DISCORD_TOKEN);
    const commandsData = Object.values(commands).map((command) => command.data.toJSON());

    try {
        console.log("Started refreshing application (/) commands.");

        await rest.put(Routes.applicationCommands(config.DISCORD_CLIENT_ID), {
            body: commandsData,
        });
        
    } catch (error) {
        console.error(error);
    }

    console.log("Successfully reloaded application (/) commands.");
}