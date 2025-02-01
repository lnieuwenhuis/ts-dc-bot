import {
    CommandInteraction,
    SlashCommandBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    UserSelectMenuBuilder,
    ComponentType,
    Message,
    ModalSubmitInteraction,
} from "discord.js";

import { buildModalTextInputs } from "../../helpers/buildModalTextInputs";

export const data = new SlashCommandBuilder()
    .setName("report")
    .setDescription("Allows you to report a driver.");

export async function execute(interaction: CommandInteraction) {
    const userMenu = new UserSelectMenuBuilder()
        .setCustomId("user-menu")
        .setPlaceholder("Select a user")
        .setMinValues(1)
        .setMaxValues(1);

    const userActionRow = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(userMenu);

    await interaction.reply({
        content: "Please select a user to report.",
        components: [userActionRow],
    });

    const replyMessage = (await interaction.fetchReply()) as Message;

    const collector = replyMessage.createMessageComponentCollector({
        time: 120000,
        componentType: ComponentType.UserSelect,
        filter: (i) => i.customId === "user-menu",
        max: 1,
    });

    collector.on("collect", async (i) => {
        const selectedUserSnowflake = i.values[0];
        const selectedUser = i.guild?.members.cache.get(selectedUserSnowflake)?.user.displayName;

        const modal = new ModalBuilder({
            customId: `report-modal-${interaction.user.id}`,
            title: `Reporting driver: ${selectedUser}`,
        });

        const actionRows = buildModalTextInputs([
            { customId: "explanation-input", label: "Explanation", style: TextInputStyle.Paragraph },
            { customId: "evidence-input", label: "Evidence", style: TextInputStyle.Short },
        ]);

        modal.addComponents(...actionRows);

        await i.showModal(modal);

        await interaction.editReply({
            content: "User selected!",
            components: [],
        });

        const filter = (modalInt: ModalSubmitInteraction) =>
            modalInt.customId === `report-modal-${interaction.user.id}`;

        interaction
            .awaitModalSubmit({ filter, time: 600000 })
            .then(async (modalInteraction) => {
                const explanation = modalInteraction.fields.getTextInputValue("explanation-input");
                const evidence = modalInteraction.fields.getTextInputValue("evidence-input");

                await modalInteraction.reply(
                    `You reported ${selectedUser} for the following reason: ${explanation}. Evidence: ${evidence}`
                );
            })
            .catch((e) => {
                console.error(e);
            });
    });
}
