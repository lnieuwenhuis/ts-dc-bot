import { 
    SlashCommandBuilder, 
    ModalBuilder, 
    TextInputStyle, 
    UserSelectMenuBuilder, 
    ActionRowBuilder, 
    ComponentType, 
    Message, 
    ModalSubmitInteraction
} from "discord.js";
import { buildModalTextInputs } from "../../helpers/buildModalTextInputs";

export const data = new SlashCommandBuilder()
    .setName("unmute")
    .setDescription("Unmutes a user");

export async function execute(interaction: any) {
    const userMenu = new UserSelectMenuBuilder()
        .setCustomId('unmute-user-menu')
        .setPlaceholder('Select a user to unmute')
        .setMinValues(1)
        .setMaxValues(1);
    const userActionRow = new ActionRowBuilder<UserSelectMenuBuilder>();
    userActionRow.addComponents(userMenu);

    await interaction.reply({
        content: "Please select a user to unmute.",
        components: [userActionRow],
        ephemeral: true,
    });

    const replyMessage = (await interaction.fetchReply()) as Message;
    const collector = replyMessage.createMessageComponentCollector({
        time: 120000,
        componentType: ComponentType.UserSelect,
        filter: (i) => i.customId === "unmute-user-menu",
        max: 1,
    });

    collector.on("collect", async (i) => {
        const selectedUserSnowflake = i.values[0];
        const selectedUser = i.guild?.members.cache.get(selectedUserSnowflake)?.user.displayName;

        const modal = new ModalBuilder({
            customId: `unmute-modal-${selectedUserSnowflake}`,
            title: `Unmute ${selectedUser}`,
        })

        const actionRows = buildModalTextInputs([
            { customId: "reason-input", label: "Reason (optional)", style: TextInputStyle.Short, required: false },
        ]);

        modal.addComponents(...actionRows);

        await i.showModal(modal);
        await interaction.editReply({
            content: `User ${selectedUser} has been selected for unmuting.`,
        });

        const filter = (modalInt: ModalSubmitInteraction) => modalInt.customId === `unmute-modal-${selectedUserSnowflake}`;

        interaction
            .awaitModalSubmit({
                time: 60000,
                filter,
            })
            .then(async (modalInteraction: any) => {
                const reason = modalInteraction.fields.getTextInputValue("reason-input");

                try {
                    const muteRole = interaction.guild?.roles.cache.find((role: any) => role.name === "Muted");
                    const member = interaction.guild?.members.cache.get(selectedUserSnowflake);
                    
                    if (!member) {
                        await modalInteraction.reply({
                            content: "User not found in this server.",
                            ephemeral: true
                        });
                        return;
                    }

                    if (!muteRole) {
                        await modalInteraction.reply({
                            content: "Muted role not found. User may not be muted.",
                            ephemeral: true
                        });
                        return;
                    }

                    if (!member.roles.cache.has(muteRole.id)) {
                        await modalInteraction.reply({
                            content: `${selectedUser} is not currently muted.`,
                            ephemeral: true
                        });
                        return;
                    }

                    // Remove the mute role
                    await member.roles.remove(muteRole);

                    // Remove timeout if it exists
                    if (member.isCommunicationDisabled()) {
                        await member.timeout(null);
                    }

                    const reasonText = reason ? ` Reason: ${reason}` : "";
                    await modalInteraction.reply({
                        content: `Successfully unmuted ${selectedUser}.${reasonText}`,
                        ephemeral: true
                    });

                    // Optional: Log the unmute action
                    console.log(`User ${selectedUser} (${selectedUserSnowflake}) was unmuted by ${interaction.user.tag}. Reason: ${reason || 'No reason provided'}`);

                } catch (error) {
                    console.error('Error unmuting user:', error);
                    await modalInteraction.reply({
                        content: "An error occurred while unmuting the user. Please check bot permissions and try again.",
                        ephemeral: true
                    });
                }
            })
            .catch((error: any) => {
                console.error('Modal submission timeout or error:', error);
            });
    });

    collector.on('end', (collected) => {
        if (collected.size === 0) {
            interaction.editReply({
                content: "No user was selected. Unmute command timed out.",
                components: []
            });
        }
    });
}