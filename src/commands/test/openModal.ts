import {
    CommandInteraction,
    SlashCommandBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    ModalSubmitInteraction,
} from "discord.js";

export const data = new SlashCommandBuilder()
    .setName("open-modal")
    .setDescription("Opens a modal!");

    export async function execute(interaction: CommandInteraction) {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ ephemeral: true });
        }
    
        const textInput = new TextInputBuilder()
            .setCustomId("text-input")
            .setLabel("Enter some text")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
    
        const textInputRow = new ActionRowBuilder<TextInputBuilder>().addComponents(textInput);
    
        const modal = new ModalBuilder()
            .setTitle("Test Modal")
            .setCustomId("test-modal")
            .addComponents(textInputRow);
    
        await interaction.showModal(modal);
    }
    

export async function handleModalSubmit(interaction: ModalSubmitInteraction) {
    if (interaction.customId === "test-modal") {
        const userInput = interaction.fields.getTextInputValue("text-input");
        console.log("User Input:", userInput);

        await interaction.reply({ content: "Submitted successfully!", ephemeral: true });
    }
}