import { SlashCommandBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Purges a number of messages from the channel")
    .addIntegerOption(option =>
        option
            .setName("amount")
            .setDescription("The number of messages to purge")
            .setRequired(true)
    )
    .addMentionableOption(option =>
        option
            .setName("user")
            .setDescription("The user to purge messages from")
            .setRequired(false)
    );

export async function execute(interaction: any) {
    const amount = interaction.options.getInteger('amount');
    const user = interaction.options.getMentionable('user');

    try {
        if (user) {
            // When a user is specified, fetch messages and filter by user
            let deletedCount = 0;
            let lastMessageId: string | undefined;
            
            while (deletedCount < amount) {
                try {
                    // Fetch messages in batches (Discord API limit is 100)
                    const fetchLimit = Math.min(100, amount * 2); // Fetch more to account for filtering
                    const messages = await interaction.channel.messages.fetch({
                        limit: fetchLimit,
                        before: lastMessageId
                    });
                    
                    if (messages.size === 0) {
                        // No more messages to fetch
                        break;
                    }
                    
                    // Filter messages from the specified user
                    const userMessages = messages.filter((msg: any) => msg.author.id === user.id);
                    
                    if (userMessages.size === 0) {
                        // No messages from this user in this batch, update lastMessageId and continue
                        lastMessageId = messages.last()?.id;
                        continue;
                    }
                    
                    // Take only the amount we still need to delete
                    const messagesToDelete = userMessages.first(amount - deletedCount);
                    
                    // Delete the messages
                    for (const message of messagesToDelete.values()) {
                        try {
                            await message.delete();
                            deletedCount++;
                        } catch (error) {
                            console.error('Failed to delete individual message:', error);
                        }
                    }
                    
                    // Update lastMessageId for next iteration
                    lastMessageId = messages.last()?.id;
                } catch (error) {
                    console.error('Failed to fetch messages:', error);
                    break; // Exit the while loop if fetching fails
                }
            }
            
            await interaction.reply({ 
                content: `Purged ${deletedCount} messages from ${user.displayName || user.username}`, 
                ephemeral: true 
            });
        } else {
            // No user specified, delete latest messages
            try {
                await interaction.channel.bulkDelete(amount);
                await interaction.reply({ content: `Purged ${amount} messages`, ephemeral: true });
            } catch (error) {
                console.error('Failed to bulk delete messages:', error);
                await interaction.reply({ 
                    content: 'Failed to purge messages. Please check bot permissions and try again.', 
                    ephemeral: true 
                });
            }
        }
    } catch (error) {
        console.error('Error in purge command:', error);
        try {
            await interaction.reply({ 
                content: 'An error occurred while executing the purge command.', 
                ephemeral: true 
            });
        } catch (replyError) {
            console.error('Failed to send error reply:', replyError);
        }
    }
}