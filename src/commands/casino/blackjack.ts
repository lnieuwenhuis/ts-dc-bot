import { SlashCommandBuilder, ModalBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { buildModalTextInputs } from "../../helpers/buildModalTextInputs";
import { UserModel } from "../../database/models/User";

// Card and game logic
interface Card {
    suit: string;
    rank: string;
    value: number;
}

class BlackjackGame {
    private deck: Card[] = [];
    private playerHand: Card[] = [];
    private dealerHand: Card[] = [];
    private bet: number;
    private gameOver: boolean = false;
    private playerStand: boolean = false;

    constructor(bet: number, userId: string) {
        this.bet = bet;
        this.initializeDeck();
        this.shuffleDeck();
        this.dealInitialCards();
    }

    private initializeDeck(): void {
        const suits = ['♠️', '♥️', '♦️', '♣️'];
        const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        
        this.deck = [];
        for (const suit of suits) {
            for (const rank of ranks) {
                let value = parseInt(rank);
                if (rank === 'A') value = 11;
                else if (['J', 'Q', 'K'].includes(rank)) value = 10;
                
                this.deck.push({ suit, rank, value });
            }
        }
    }

    private shuffleDeck(): void {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    private dealCard(): Card {
        return this.deck.pop()!;
    }

    private dealInitialCards(): void {
        this.playerHand.push(this.dealCard());
        this.dealerHand.push(this.dealCard());
        this.playerHand.push(this.dealCard());
        this.dealerHand.push(this.dealCard());
    }

    private calculateHandValue(hand: Card[]): number {
        let value = 0;
        let aces = 0;
        
        for (const card of hand) {
            if (card.rank === 'A') {
                aces++;
                value += 11;
            } else {
                value += card.value;
            }
        }
        
        // Adjust for aces
        while (value > 21 && aces > 0) {
            value -= 10;
            aces--;
        }
        
        return value;
    }

    private formatHand(hand: Card[], hideFirst: boolean = false): string {
        return hand.map((card, index) => {
            if (hideFirst && index === 0) return '🎴';
            return `${card.rank}${card.suit}`;
        }).join(' ');
    }

    public hit(): void {
        if (!this.gameOver && !this.playerStand) {
            this.playerHand.push(this.dealCard());
            if (this.calculateHandValue(this.playerHand) > 21) {
                this.gameOver = true;
            }
        }
    }

    public stand(): void {
        this.playerStand = true;
        this.playDealer();
    }

    private playDealer(): void {
        while (this.calculateHandValue(this.dealerHand) < 17) {
            this.dealerHand.push(this.dealCard());
        }
        this.gameOver = true;
    }

    public getGameState(): any {
        const playerValue = this.calculateHandValue(this.playerHand);
        const dealerValue = this.calculateHandValue(this.dealerHand);
        const isGameOver = this.gameOver;
        
        let result = '';
        let winnings = 0;
        
        if (isGameOver) {
            if (playerValue > 21) {
                result = 'Player Busted! Dealer Wins!';
                winnings = -this.bet;
            } else if (dealerValue > 21) {
                result = 'Dealer Busted! Player Wins!';
                winnings = this.bet;
            } else if (playerValue === 21 && this.playerHand.length === 2) {
                result = 'Blackjack! Player Wins!';
                winnings = Math.floor(this.bet * 1.5);
            } else if (playerValue > dealerValue) {
                result = 'Player Wins!';
                winnings = this.bet;
            } else if (dealerValue > playerValue) {
                result = 'Dealer Wins!';
                winnings = -this.bet;
            } else {
                result = 'Push! It\'s a tie!';
                winnings = 0;
            }
        }
        
        return {
            playerHand: this.formatHand(this.playerHand),
            dealerHand: this.formatHand(this.dealerHand, !isGameOver),
            playerValue,
            dealerValue: isGameOver ? dealerValue : '?',
            isGameOver,
            result,
            winnings,
            canHit: !isGameOver && !this.playerStand && playerValue < 21,
            canStand: !isGameOver && !this.playerStand
        };
    }
}

// Store active games
const activeGames = new Map<string, BlackjackGame>();

export const data = new SlashCommandBuilder()
    .setName("blackjack")
    .setDescription("Play a game of blackjack")
    .addIntegerOption(option =>
        option
            .setName("bet")
            .setDescription("The amount of money you want to bet")
            .setRequired(true)
    );

export async function execute(interaction: any) {
    const bet = interaction.options.getInteger("bet");
    const user = interaction.user;

    // Get the amount of chips the user has
    try {
        // First, ensure the user exists in the database
        await UserModel.createOrUpdate(user.id, user.username, user.discriminator);
        
        // Get the user's current chip count
        const userData = await UserModel.findById(user.id);
        
        if (!userData) {
            await interaction.reply({
                content: "❌ Unable to retrieve your account data. Please try again.",
                ephemeral: true
            });
            return;
        }
        
        // Check if the bet is valid (positive and not more than available chips)
        if (bet <= 0) {
            await interaction.reply({
                content: "❌ Your bet must be a positive number!",
                ephemeral: true
            });
            return;
        }
        
        if (bet > userData.chips) {
            await interaction.reply({
                content: `❌ You don't have enough chips! You have **${userData.chips}** chips, but you're trying to bet **${bet}**. Please bet ${userData.chips} or less.`,
                ephemeral: true
            });
            return;
        }
        
        // Check if user already has an active game
        if (activeGames.has(user.id)) {
            await interaction.reply({
                content: "❌ You already have an active blackjack game! Finish it first.",
                ephemeral: true
            });
            return;
        }
        
        // Create new game
        const game = new BlackjackGame(bet, user.id);
        activeGames.set(user.id, game);
        
        // Get initial game state
        const gameState = game.getGameState();
        
        // Create embed
        const embed = new EmbedBuilder()
            .setTitle('🃏 Blackjack Game')
            .setColor(0x00ff00)
            .addFields(
                { name: '🎯 Your Hand', value: `${gameState.playerHand} (${gameState.playerValue})`, inline: true },
                { name: '🏠 Dealer Hand', value: `${gameState.dealerHand} (${gameState.dealerValue})`, inline: true },
                { name: '💰 Bet', value: `${bet} chips`, inline: true }
            )
            .setFooter({ text: `Chips: ${userData.chips} | Bet: ${bet}` });
        
        // Create action buttons
        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`blackjack_hit_${user.id}`)
                    .setLabel('Hit')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(!gameState.canHit),
                new ButtonBuilder()
                    .setCustomId(`blackjack_stand_${user.id}`)
                    .setLabel('Stand')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(!gameState.canStand)
            );
        
        await interaction.reply({
            embeds: [embed],
            components: [row]
        });
        
    } catch (error) {
        console.error('Error in blackjack command:', error);
        await interaction.reply({
            content: "❌ An error occurred while processing your request. Please try again.",
            ephemeral: true
        });
    }
}

// Handle button interactions
export async function handleBlackjackInteraction(interaction: any) {
    const [action, userId] = interaction.customId.split('_').slice(1);
    
    if (interaction.user.id !== userId) {
        await interaction.reply({
            content: "❌ This is not your game!",
            ephemeral: true
        });
        return;
    }
    
    const game = activeGames.get(userId);
    if (!game) {
        await interaction.reply({
            content: "❌ No active game found!",
            ephemeral: true
        });
        return;
    }
    
    // Perform action
    if (action === 'hit') {
        game.hit();
    } else if (action === 'stand') {
        game.stand();
    }
    
    // Get updated game state
    const gameState = game.getGameState();
    
    // Update embed
    const embed = new EmbedBuilder()
        .setTitle('🃏 Blackjack Game')
        .setColor(gameState.isGameOver ? (gameState.winnings > 0 ? 0x00ff00 : gameState.winnings < 0 ? 0xff0000 : 0xffff00) : 0x00ff00)
        .addFields(
            { name: '🎯 Your Hand', value: `${gameState.playerHand} (${gameState.playerValue})`, inline: true },
            { name: '🏠 Dealer Hand', value: `${gameState.dealerHand} (${gameState.dealerValue})`, inline: true }
        );
    
    if (gameState.isGameOver) {
        embed.addFields(
            { name: '🎉 Result', value: gameState.result, inline: false },
            { name: '💰 Winnings', value: `${gameState.winnings > 0 ? '+' : ''}${gameState.winnings} chips`, inline: true }
        );
        
        // Update user chips
        const userData = await UserModel.findById(userId);
        if (userData) {
            const newChips = userData.chips + gameState.winnings;
            await UserModel.updateChips(userId, newChips);
            embed.setFooter({ text: `New chip balance: ${newChips}` });
        }
        
        // Remove game from active games
        activeGames.delete(userId);
        
        await interaction.update({
            embeds: [embed],
            components: []
        });
    } else {
        // Update buttons
        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`blackjack_hit_${userId}`)
                    .setLabel('Hit')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(!gameState.canHit),
                new ButtonBuilder()
                    .setCustomId(`blackjack_stand_${userId}`)
                    .setLabel('Stand')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(!gameState.canStand)
            );
        
        await interaction.update({
            embeds: [embed],
            components: [row]
        });
    }
}