import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
    .setName("weather")
    .setDescription("Replies with the weather for a given location.")
    .addStringOption(option => option.setName("location").setDescription("The location to get the weather for.").setRequired(true));

export async function execute(interaction: any) {
    const weather_api_url = `http://api.weatherapi.com/v1/current.json`;
    const weather_api_key = process.env.WEATHER_API_KEY;
    const location = interaction.options.getString("location") || "London";

    const response = await fetch(`${weather_api_url}?key=${weather_api_key}&q=${location}&aqi=no&alerts=no`);
    const data = await response.json();

    const embed = new EmbedBuilder()
        .setTitle(`Weather for ${location}`)
        .setAuthor({ name: interaction.user.displayName, iconURL: interaction.user.displayAvatarURL() })
        .setDescription(`Weather for ${location} as of ${data.location.localtime}.`)
        .setColor("Blue");

    data.current.condition.text && embed.addFields({ name: "Condition", value: data.current.condition.text });
    data.current.temp_c && embed.addFields({ name: "Temperature", value: data.current.temp_c + "°C" });
    data.current.humidity && embed.addFields({ name: "Humidity", value: data.current.humidity + "%" });
    data.current.wind_kph && embed.addFields({ name: "Wind", value: data.current.wind_kph + "km/h" });

    await interaction.reply({ embeds: [embed] });
}