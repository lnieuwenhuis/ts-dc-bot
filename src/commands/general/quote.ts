import { SlashCommandBuilder, ModalBuilder, TextInputStyle } from "discord.js";
import { buildModalTextInputs } from "../../helpers/buildModalTextInputs";

export const data = new SlashCommandBuilder()
    .setName("quote")
    .setDescription("Creates a beautiful quote")

export async function execute(interaction: any) {    
    const quoteModal = new ModalBuilder({
        customId: 'quote-modal',
        title: 'Quote',
    });

    const actionRows = buildModalTextInputs([
        { customId: 'quote', label: 'Quote', style: TextInputStyle.Paragraph, required: true },
        { customId: 'author', label: 'Author', style: TextInputStyle.Short, required: true },
        { customId: 'source', label: 'Person Quoted', style: TextInputStyle.Short, required: true },
        { customId: 'year', label: 'Year', style: TextInputStyle.Short, required: true },
    ]);

    quoteModal.addComponents(...actionRows);
    await interaction.showModal(quoteModal);

    interaction.awaitModalSubmit({
        time: 60000,
        filter: (i: any) => i.user.id === interaction.user.id,
    }).then(async (interaction: any) => {
        const quote = interaction.fields.getTextInputValue('quote');
        const author = interaction.fields.getTextInputValue('author');
        const source = interaction.fields.getTextInputValue('source');
        const year = interaction.fields.getTextInputValue('year');

        const quoteEmbed = {
            color: 0x0099FF,
            title: `${quote}`,
            description: `${source} (${year}) \n\nQuoted by ${author}`,
        };

        await interaction.reply({ embeds: [quoteEmbed] });
    }).catch((e: any) => {
        interaction.replyy({ content: 'Quote creation timed out', ephemeral: true });
        console.error(e);
    });
}