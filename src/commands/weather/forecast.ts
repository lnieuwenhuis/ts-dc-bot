import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
    .setName("forecast")
    .setDescription("Replies with the forecast for a given number of days.")
    .addStringOption(option => option.setName("location").setDescription("The location to get the forecast for.").setRequired(true))
    .addStringOption(option => option.setName("days").setDescription("The number of days to forecast.").setRequired(true));

export async function execute(interaction: any) {
    const weather_api_url = `http://api.weatherapi.com/v1/forecast.json`;
    const weather_api_key = process.env.WEATHER_API_KEY;
    const location = interaction.options.getString("location") || "London";
    const days = interaction.options.getString("days") || 1;

    const response = await fetch(`${weather_api_url}?key=${weather_api_key}&q=${location}&days=${days}&aqi=no&alerts=no`);
    const data = await response.json();

    console.log

    const embed = new EmbedBuilder()
        .setTitle(`Forecast for ${location}`)
        .setAuthor({ name: interaction.user.displayName, iconURL: interaction.user.displayAvatarURL() })
        .setDescription(`Weather forecast for ${location} for the next ${days} day(s).`)
        .setColor("Blue");

    data.forecast.forecastday.forEach((day: any) => {    
        const date = new Date(day.date_epoch * 1000);
        const dayOfWeek = date.toLocaleDateString("en-US", { weekday: "long" });
        const temperature = day.day.avgtemp_c;
        const condition = day.day.condition.text;

        embed.addFields({ name: `${dayOfWeek} (${date.toLocaleDateString()})`, value: `Temperature: ${temperature}°C\nCondition: ${condition}` });
    });

    await interaction.reply({ embeds: [embed] });
}