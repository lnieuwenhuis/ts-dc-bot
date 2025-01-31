import {
    CommandInteraction,
    SlashCommandBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
} from "discord.js";

export const data = new SlashCommandBuilder()
    .setName("openmodal")
    .setDescription("Opens a modal!");

export async function execute(interaction: CommandInteraction) {
    const modal = new ModalBuilder({
        customId: `test-modal-${interaction.user.id}`,
        title: "My Test Modal",
    });
    
    const favoriteColorInput = new TextInputBuilder({
        customId: "color-input",
        label: "What's your favorite color?",
        style: TextInputStyle.Short,
    });

    const hobbiesInput = new TextInputBuilder({
        customId: "hobbies-input",
        label: "What are your hobbies?",
        style: TextInputStyle.Paragraph,
    });

    const actionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(favoriteColorInput);
    const actionRow2 = new ActionRowBuilder<TextInputBuilder>().addComponents(hobbiesInput);

    modal.addComponents(actionRow, actionRow2);

    await interaction.showModal(modal);

    const filter = (i: any) => i.customId === `test-modal-${interaction.user.id}`;

    interaction.awaitModalSubmit({filter, time: 60000}).then(async (i) => {
        const favoriteColor = i.fields.getTextInputValue("color-input");
        const hobbies = i.fields.getTextInputValue("hobbies-input");

        await i.reply(`Your favorite color is ${favoriteColor} and your hobbies are ${hobbies}.`)
        }).catch(async (e) => {
            console.log(e);
        }
    );
}