import { 
    SlashCommandBuilder, 
    ModalBuilder, 
    TextInputStyle, 
    UserSelectMenuBuilder, 
    ActionRowBuilder, 
    ComponentType, 
    Message, 
    ModalSubmitInteraction,
    PermissionFlagsBits
} from "discord.js";
import { buildModalTextInputs } from "../../helpers/buildModalTextInputs";

export const data = new SlashCommandBuilder()
    .setName("mute")
    .setDescription("Mutes a user")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export async function execute(interaction: any) {
    // Check if bot has necessary permissions
    const botMember = interaction.guild?.members.me;
    if (!botMember?.permissions.has(PermissionFlagsBits.ManageRoles)) {
        await interaction.reply({
            content: "I don't have permission to manage roles. Please give me the 'Manage Roles' permission.",
            ephemeral: true
        });
        return;
    }

    const userMenu = new UserSelectMenuBuilder()
        .setCustomId('mute-user-menu')
        .setPlaceholder('Select a user to mute')
        .setMinValues(1)
        .setMaxValues(1);
    const userActionRow = new ActionRowBuilder<UserSelectMenuBuilder>();
    userActionRow.addComponents(userMenu);

    await interaction.reply({
        content: "Please select a user to mute.",
        components: [userActionRow],
        ephemeral: true,
    });

    const replyMessage = (await interaction.fetchReply()) as Message;
    const collector = replyMessage.createMessageComponentCollector({
        time: 120000,
        componentType: ComponentType.UserSelect,
        filter: (i) => i.customId === "mute-user-menu",
        max: 1,
    });

    collector.on("collect", async (i) => {
        const selectedUserSnowflake = i.values[0];
        const selectedUser = i.guild?.members.cache.get(selectedUserSnowflake)?.user.displayName;

        const modal = new ModalBuilder({
            customId: `mute-modal-${selectedUserSnowflake}`,
            title: `Mute ${selectedUser}`,
        })

        const actionRows = buildModalTextInputs([
            { customId: "duration-input", label: "Duration (ex. 1d 2h 3m 4s)", style: TextInputStyle.Short, required: true },
            { customId: "reason-input", label: "Reason", style: TextInputStyle.Short, required: false },
        ]);

        modal.addComponents(...actionRows);

        await i.showModal(modal);
        await interaction.editReply({
            content: `User ${selectedUser} has been selected.`,
        });

        const filter = (modalInt: ModalSubmitInteraction) => modalInt.customId === `mute-modal-${selectedUserSnowflake}`;

        interaction
            .awaitModalSubmit({
                time: 60000,
                filter,
            })
            .then(async (modalInteraction: any) => {
                try {
                    const duration = modalInteraction.fields.getTextInputValue("duration-input");
                    const reason = modalInteraction.fields.getTextInputValue("reason-input");

                    const decodedDuration = (() => {
                        const regex = /(?:(\d+)d)?\s*(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+)s)?/;
                        const match = duration.match(regex);
                        
                        if (!match) return 0;
                        
                        const days = parseInt(match[1] || '0');
                        const hours = parseInt(match[2] || '0');
                        const minutes = parseInt(match[3] || '0');
                        const seconds = parseInt(match[4] || '0');
                        
                        return (days * 24 * 60 * 60 + hours * 60 * 60 + minutes * 60 + seconds) * 1000;
                    })();

                    // Find or create the mute role
                    let muteRole = interaction.guild?.roles.cache.find((role: any) => role.name === "Muted");
                    if (!muteRole) {
                        muteRole = await interaction.guild?.roles.create({
                            name: "Muted",
                            color: 0x000000,
                            permissions: [],
                        });
                    }

                    const member = interaction.guild?.members.cache.get(selectedUserSnowflake);
                    if (!member) {
                        await modalInteraction.reply({
                            content: "User not found in this server.",
                            ephemeral: true
                        });
                        return;
                    }

                    // Check if target user has higher role than bot
                    if (member.roles.highest.position >= botMember.roles.highest.position) {
                        await modalInteraction.reply({
                            content: "I cannot mute this user because they have a higher or equal role than me.",
                            ephemeral: true
                        });
                        return;
                    }

                    // Add the mute role
                    await member.roles.add(muteRole);

                    let timeoutApplied = false;
                    let timeoutError = null;

                    // Apply Discord timeout if duration is specified and less than 28 days
                    if (decodedDuration > 0 && decodedDuration <= 28 * 24 * 60 * 60 * 1000) {
                        try {
                            // Check if bot has ModerateMembers permission
                            if (botMember?.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                                await member.timeout(decodedDuration, reason || 'No reason provided');
                                timeoutApplied = true;
                            } else {
                                timeoutError = "Bot lacks 'Moderate Members' permission for timeout.";
                            }
                        } catch (error: any) {
                            timeoutError = `Failed to apply timeout: ${error.message}`;
                            console.error('Timeout error:', error);
                        }
                    }

                    // Send success message
                    const reasonText = reason ? ` Reason: ${reason}` : "";
                    const durationText = decodedDuration > 0 ? ` Duration: ${duration}` : "";
                    let successMessage = `Successfully muted ${selectedUser}.${durationText}${reasonText}`;
                    
                    if (decodedDuration > 0 && !timeoutApplied) {
                        successMessage += `\n⚠️ Note: ${timeoutError || 'Discord timeout not applied.'} Only role-based mute is active.`;
                    }
                    
                    await modalInteraction.reply({
                        content: successMessage,
                        ephemeral: true
                    });

                    // Log the mute action
                    console.log(`User ${selectedUser} (${selectedUserSnowflake}) was muted by ${interaction.user.tag}. Duration: ${duration}, Reason: ${reason || 'No reason provided'}, Timeout applied: ${timeoutApplied}`);

                } catch (error) {
                    console.error('Error muting user:', error);
                    await modalInteraction.reply({
                        content: "An error occurred while muting the user. Please check bot permissions and try again.",
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
                content: "No user selected. Mute command cancelled.",
                components: []
            });
        }
    });
}