import { 
    EmbedBuilder, 
    ModalSubmitInteraction, 
    PrivateThreadChannel, 
    PublicThreadChannel 
} from "discord.js";

export const protestHandler = async (
    thread: PrivateThreadChannel | PublicThreadChannel,
    interaction: ModalSubmitInteraction,
    selectedUserSnowflake: string
) => {
    const reason = interaction.fields.getTextInputValue("reason-input");
    const explanation = interaction.fields.getTextInputValue("explanation-input");
    const session = interaction.fields.getTextInputValue("session-input");

    const selectedUser = interaction.guild?.members.cache.get(selectedUserSnowflake)?.user.displayName;

    const title = `Report: ${selectedUser}`;

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
        .setDescription(`Reason: ${reason}\n\nExplanation: ${explanation}\n\nSession: ${session}`);

    await thread.send({ embeds: [embed] });
}