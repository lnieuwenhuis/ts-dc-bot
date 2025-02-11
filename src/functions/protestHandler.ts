import { 
    EmbedBuilder, 
    ModalSubmitInteraction, 
    PrivateThreadChannel, 
    PublicThreadChannel,
    ButtonBuilder,
    ActionRowBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputStyle,
    Message,
    InteractionCollector,
    ComponentType,
    ButtonInteraction
} from "discord.js";

import { buildModalTextInputs } from "../helpers/buildModalTextInputs";

export const protestHandler = async (
    thread: PrivateThreadChannel | PublicThreadChannel,
    interaction: ModalSubmitInteraction,
    selectedUserSnowflake: string
) => {
    const reason = interaction.fields.getTextInputValue("reason-input");
    const explanation = interaction.fields.getTextInputValue("explanation-input");
    const session = interaction.fields.getTextInputValue("session-input");
    const evidence = interaction.fields.getTextInputValue("evidence-input");

    const selectedUser = interaction.guild?.members.cache.get(selectedUserSnowflake)?.user.displayName;
    const title = `Report: ${selectedUser}`;

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setAuthor({ name: interaction.user.displayName, iconURL: interaction.user.displayAvatarURL() })
        .setDescription(`Reason: ${reason}\n\nExplanation: ${explanation}\n\nSession: ${session}\n\nEvidence: ${evidence}`)
        .setColor("Blue");

    const protestButton = new ButtonBuilder()
        .setCustomId("protest_button")
        .setLabel("Protest")
        .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(protestButton);

    const message: Message = await thread.send({ embeds: [embed], components: [row] });

    const collector: InteractionCollector<any> = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 3 * 24 * 60 * 60 * 1000, // 3 days
    });

    collector.on("collect", async (i: ButtonInteraction) => {
        if (i.customId === "protest_button") {
            const modal = new ModalBuilder()
                .setCustomId("protest_modal")
                .setTitle("Protest Submission");

            const textInputs = buildModalTextInputs([
                { customId: "reason_input", label: "Protest Reason", style: TextInputStyle.Short },
                { customId: "explanation_input", label: "Protest Explanation", style: TextInputStyle.Paragraph },
                { customId: "evidence_input", label: "Protest Evidence", style: TextInputStyle.Short },
            ]);

            modal.addComponents(...textInputs);
            await i.showModal(modal);

            const filter = (modalInt: ModalSubmitInteraction) => modalInt.customId === "protest_modal";

            i.awaitModalSubmit({ filter, time: 120000})
                .then(async (modalInteraction: ModalSubmitInteraction) => {
                    const protestReason = modalInteraction.fields.getTextInputValue("reason_input");
                    const protestExplanation = modalInteraction.fields.getTextInputValue("explanation_input");
                    const protestEvidence = modalInteraction.fields.getTextInputValue("evidence_input");

                    const protestEmbed = new EmbedBuilder()
                        .setTitle("Protest")
                        .setAuthor({ name: i.user.displayName, iconURL: i.user.displayAvatarURL() })
                        .setDescription(`Reason: ${protestReason}\n\nExplanation: ${protestExplanation}\n\nEvidence: ${protestEvidence}`)
                        .setColor("Red");

                    await thread.send({ embeds: [protestEmbed] });

                    await modalInteraction.reply({ content: "Protest submitted successfully!", ephemeral: true });
                })
        }
    });

    collector.on("end", async () => {
        await thread.send("This report is now closed.");
        await thread.setArchived(true);
    });
};
