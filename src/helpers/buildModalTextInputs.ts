import { ActionRowBuilder, TextInputBuilder, TextInputStyle } from "discord.js";

export const buildModalTextInputs = (inputs: { customId: string, label: string, style: TextInputStyle }[]): ActionRowBuilder<TextInputBuilder>[] => {
    const actionRows: ActionRowBuilder<TextInputBuilder>[] = [];

    inputs.forEach(input => {
        const textInput = new TextInputBuilder()
            .setCustomId(input.customId)
            .setLabel(input.label)
            .setStyle(input.style);

        const actionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(textInput);

        actionRows.push(actionRow);
    });
    
    return actionRows;
}