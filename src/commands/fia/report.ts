import {
    CommandInteraction,
    SlashCommandBuilder,
    ModalBuilder,
    TextInputStyle,
    TextChannel,
    ActionRowBuilder,
    UserSelectMenuBuilder,
    ComponentType,
    Message,
    ModalSubmitInteraction,
} from "discord.js";
import { buildModalTextInputs } from "../../helpers/buildModalTextInputs";
import { protestHandler } from "../../functions/protestHandler";

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
        ephemeral: true,
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
            { customId: "reason-input", label: "Reason", style: TextInputStyle.Short },
            { customId: "explanation-input", label: "Explanation", style: TextInputStyle.Paragraph },
            { customId: "session-input", label: "Session", style: TextInputStyle.Short },
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
                const session = modalInteraction.fields.getTextInputValue("session-input");

                const threadTitle = `Report: ${selectedUser} (${session})`;

                const channel = modalInteraction.channel;
                if (channel && channel instanceof TextChannel) {
                    const thread = await channel.threads.create({
                        name: threadTitle,
                    });

                    await thread.members.add(selectedUserSnowflake);
                    await thread.members.add(interaction.user.id);

                    await modalInteraction.reply({
                        content: "Thread created!",
                        ephemeral: true,
                    });

                    await protestHandler(thread, modalInteraction, selectedUserSnowflake);
                } else {
                    await modalInteraction.reply("Thread creation is not supported in this channel.");
                }
            })
            .catch((e) => {
                console.error(e);
            });
    });

    collector.on("end", () => {
        if (interaction.isRepliable()) {
            interaction.editReply({
                content: "No user selected or time ran out!",
                components: [],
            });
        } else {
            interaction.followUp({
                content: "No user selected or time ran out!",
                components: [],
            });
        }
    });
}