import { SlashCommandBuilder, ModalBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { buildModalTextInputs } from "../../helpers/buildModalTextInputs";

interface ConversationExchange {
    quote: string;
    speaker: string;
}

interface ConversationData {
    exchanges: ConversationExchange[];
    year?: string;
}

export const data = new SlashCommandBuilder()
    .setName("multiquote")
    .setDescription("Creates a beautiful quoted conversation")

export async function execute(interaction: any) {
    const conversationData: ConversationData = { exchanges: [] };
    
    await showConversationModal(interaction, conversationData, 1);
}

async function showConversationModal(interaction: any, conversationData: ConversationData, exchangeNumber: number) {
    const multiQuoteModal = new ModalBuilder({
        customId: `multiQuote-modal-${exchangeNumber}`,
        title: `Conversation Exchange ${exchangeNumber}`,
    });

    // Add year field only for the first exchange
    const inputs = [
        { customId: 'quote', label: 'Quote/Statement', style: TextInputStyle.Paragraph, required: true },
        { customId: 'speaker', label: 'Speaker Name', style: TextInputStyle.Short, required: true },
    ];
    
    if (exchangeNumber === 1) {
        inputs.push({ customId: 'year', label: 'Year', style: TextInputStyle.Short, required: true });
    }

    const actionRows = buildModalTextInputs(inputs);

    multiQuoteModal.addComponents(...actionRows);
    await interaction.showModal(multiQuoteModal);

    // Listen for modal submission on the original interaction
    const filter = (i: any) => i.user.id === interaction.user.id && i.customId === `multiQuote-modal-${exchangeNumber}`;
    
    try {
        const modalInteraction = await interaction.awaitModalSubmit({ filter, time: 60000 });
        
        const quote = modalInteraction.fields.getTextInputValue('quote');
        const speaker = modalInteraction.fields.getTextInputValue('speaker');
        
        // Get year only from the first exchange
        if (exchangeNumber === 1) {
            conversationData.year = modalInteraction.fields.getTextInputValue('year');
        }

        conversationData.exchanges.push({ quote, speaker });

        // Show continue/finish buttons
        await showContinueOptions(modalInteraction, conversationData, exchangeNumber);
    } catch (e) {
        console.error('Modal submission error:', e);
        // Only reply if the interaction hasn't been replied to yet
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: 'MultiQuote creation timed out', flags: 64 }); // Use flags instead of ephemeral
        }
    }
}

async function showContinueOptions(interaction: any, conversationData: ConversationData, exchangeNumber: number) {
    const continueButton = new ButtonBuilder()
        .setCustomId(`continue-conversation-${Date.now()}`)
        .setLabel('Add Another Exchange')
        .setStyle(ButtonStyle.Primary);

    const finishButton = new ButtonBuilder()
        .setCustomId(`finish-conversation-${Date.now()}`)
        .setLabel('Finish Conversation')
        .setStyle(ButtonStyle.Success);

    const actionRow = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(continueButton, finishButton);

    await interaction.reply({
        content: `Exchange ${exchangeNumber} added! Would you like to add another exchange or finish the conversation?`,
        components: [actionRow],
        flags: 64 // Use flags instead of ephemeral: true
    });

    const buttonCollector = interaction.channel.createMessageComponentCollector({
        filter: (i: any) => i.user.id === interaction.user.id && (i.customId.startsWith('continue-conversation') || i.customId.startsWith('finish-conversation')),
        time: 60000,
        max: 1
    });

    buttonCollector.on('collect', async (buttonInteraction: any) => {
        try {
            if (buttonInteraction.customId.startsWith('continue-conversation')) {
                // Create a new modal for the next exchange
                const nextModal = new ModalBuilder({
                    customId: `multiQuote-modal-${exchangeNumber + 1}`,
                    title: `Conversation Exchange ${exchangeNumber + 1}`,
                });

                const actionRows = buildModalTextInputs([
                    { customId: 'quote', label: 'Quote/Statement', style: TextInputStyle.Paragraph, required: true },
                    { customId: 'speaker', label: 'Speaker Name', style: TextInputStyle.Short, required: true },
                ]);

                nextModal.addComponents(...actionRows);
                
                // We need to wait for the user to trigger a new interaction for the modal
                // Let's create a button that will show the modal
                const showModalButton = new ButtonBuilder()
                    .setCustomId(`show-modal-${exchangeNumber + 1}-${Date.now()}`)
                    .setLabel(`Add Exchange ${exchangeNumber + 1}`)
                    .setStyle(ButtonStyle.Secondary);

                const modalActionRow = new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(showModalButton);

                // Check if interaction has been acknowledged before updating
                if (!buttonInteraction.replied && !buttonInteraction.deferred) {
                    await buttonInteraction.update({
                        content: 'Click the button to add the next exchange:',
                        components: [modalActionRow]
                    });
                } else {
                    await buttonInteraction.editReply({
                        content: 'Click the button to add the next exchange:',
                        components: [modalActionRow]
                    });
                }

                // Listen for the modal button click
                const modalButtonCollector = buttonInteraction.channel.createMessageComponentCollector({
                    filter: (i: any) => i.user.id === interaction.user.id && i.customId.startsWith(`show-modal-${exchangeNumber + 1}`),
                    time: 60000,
                    max: 1
                });

                modalButtonCollector.on('collect', async (modalButtonInteraction: any) => {
                    await modalButtonInteraction.showModal(nextModal);
                    
                    // Wait for the modal submission
                    try {
                        const nextModalInteraction = await modalButtonInteraction.awaitModalSubmit({
                            filter: (i: any) => i.user.id === interaction.user.id && i.customId === `multiQuote-modal-${exchangeNumber + 1}`,
                            time: 60000
                        });
                        
                        const quote = nextModalInteraction.fields.getTextInputValue('quote');
                        const speaker = nextModalInteraction.fields.getTextInputValue('speaker');

                        conversationData.exchanges.push({ quote, speaker });
                        await showContinueOptions(nextModalInteraction, conversationData, exchangeNumber + 1);
                    } catch (e) {
                        console.error('Next modal submission error:', e);
                    }
                });

            } else if (buttonInteraction.customId.startsWith('finish-conversation')) {
                if (!buttonInteraction.deferred && !buttonInteraction.replied) {
                    await buttonInteraction.deferUpdate();
                }
                await displayConversation(buttonInteraction, conversationData);
            }
        } catch (error) {
            console.error('Button interaction error:', error);
        }
    });

    buttonCollector.on('end', (collected: any) => {
        if (collected.size === 0) {
            try {
                interaction.editReply({
                    content: 'Conversation building timed out. Use the command again to start over.',
                    components: []
                });
            } catch (e) {
                console.error('Error editing reply on timeout:', e);
            }
        }
    });
}

async function displayConversation(interaction: any, conversationData: ConversationData) {
    if (conversationData.exchanges.length === 0) {
        await interaction.editReply({
            content: 'No conversation data to display.',
            components: []
        });
        return;
    }

    // Build the conversation string in the requested format
    const conversationText = conversationData.exchanges
        .map(exchange => `\"${exchange.quote}\" - ${exchange.speaker}`)
        .join('\n');

    const multiQuoteEmbed = {
        color: 0x0099FF,
        title: 'Quoted Conversation',
        description: conversationText,
        footer: {
            text: `${conversationData.exchanges.length} exchange(s)${conversationData.year ? ` • ${conversationData.year}` : ''}`
        }
    };

    // Make the final conversation public (remove ephemeral: true)
    await interaction.editReply({
        content: '',
        embeds: [multiQuoteEmbed],
        components: []
    });
    
    // Send a public follow-up message with the conversation
    await interaction.followUp({
        embeds: [multiQuoteEmbed]
    });
}