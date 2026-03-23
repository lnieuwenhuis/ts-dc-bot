import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    ButtonInteraction,
    MessageFlags,
} from 'discord.js';
import { UserGuildModel, type LeaderboardEntry, type UserRankContext } from '../../database/index.js';

const PAGE_SIZE = 5;

export const data = new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the server XP leaderboard')
    .addIntegerOption(option =>
        option
            .setName('page')
            .setDescription('Page number to view (default: 1)')
            .setMinValue(1)
            .setRequired(false)
    );

// ─── Formatting helpers ────────────────────────────────────────────────────────

function getRankDisplay(rank: number): string {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `\`#${rank}\``;
}

function formatEntry(entry: LeaderboardEntry): string {
    return (
        `${getRankDisplay(entry.rank)} **${entry.username}** — ` +
        `Level ${entry.guild_level} ` +
        `(${entry.guild_xp.toLocaleString()} XP) • ` +
        `${entry.guild_messages.toLocaleString()} msgs`
    );
}

// ─── Embed builder ─────────────────────────────────────────────────────────────

function buildEmbed(
    guildName: string,
    entries: LeaderboardEntry[],
    totalUsers: number,
    currentPage: number,
    totalPages: number,
    requestingUserId: string,
    rankContext: UserRankContext | null,
): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setTitle(`🏆 ${guildName} Leaderboard`)
        .setColor(0xFFD700)
        .setFooter({ text: `Page ${currentPage}/${totalPages} • ${totalUsers.toLocaleString()} users` })
        .setTimestamp();

    if (entries.length === 0) {
        embed.setDescription('No users have earned XP in this server yet!');
    } else {
        embed.setDescription(entries.map(formatEntry).join('\n'));
    }

    // Always show the requesting user's rank context
    if (rankContext) {
        const { userEntry, above, below } = rankContext;
        const lines: string[] = [];

        if (above) {
            lines.push(formatEntry(above));
        }
        lines.push(`${formatEntry(userEntry)} ← **you**`);
        if (below) {
            lines.push(formatEntry(below));
        }

        embed.addFields({
            name: `📍 Your Position — #${userEntry.rank} of ${totalUsers.toLocaleString()}`,
            value: lines.join('\n'),
        });
    } else {
        embed.addFields({
            name: '📍 Your Position',
            value: 'Send some messages to appear on the leaderboard!',
        });
    }

    return embed;
}

// ─── Button row builder ────────────────────────────────────────────────────────

function buildButtonRow(
    currentPage: number,
    totalPages: number,
    requestingUserId: string,
): ActionRowBuilder<ButtonBuilder> | null {
    if (totalPages <= 1) return null;

    const prevButton = new ButtonBuilder()
        .setCustomId(`leaderboard_${currentPage - 1}_${requestingUserId}`)
        .setLabel('◀ Previous')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage <= 1);

    const nextButton = new ButtonBuilder()
        .setCustomId(`leaderboard_${currentPage + 1}_${requestingUserId}`)
        .setLabel('Next ▶')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage >= totalPages);

    return new ActionRowBuilder<ButtonBuilder>().addComponents(prevButton, nextButton);
}

// ─── Core data fetcher ────────────────────────────────────────────────────────

interface LeaderboardResponse {
    embed: EmbedBuilder;
    row: ActionRowBuilder<ButtonBuilder> | null;
}

async function buildLeaderboardResponse(
    guildId: string,
    guildName: string,
    requestingUserId: string,
    page: number,
): Promise<LeaderboardResponse> {
    const totalUsers = await UserGuildModel.getTotalUsersInGuild(guildId);
    const totalPages = Math.max(1, Math.ceil(totalUsers / PAGE_SIZE));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const offset = (safePage - 1) * PAGE_SIZE;

    const [entries, rankContext] = await Promise.all([
        UserGuildModel.getLeaderboardPage(guildId, offset, PAGE_SIZE),
        UserGuildModel.getUserRankContext(requestingUserId, guildId),
    ]);

    const embed = buildEmbed(guildName, entries, totalUsers, safePage, totalPages, requestingUserId, rankContext);
    const row = buildButtonRow(safePage, totalPages, requestingUserId);

    return { embed, row };
}

// ─── Slash command execute ────────────────────────────────────────────────────

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guildId = interaction.guild?.id;
    const guildName = interaction.guild?.name ?? 'Server';

    if (!guildId) {
        await interaction.reply({
            content: 'This command can only be used in a server!',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const page = interaction.options.getInteger('page') ?? 1;

    await interaction.deferReply();

    try {
        const { embed, row } = await buildLeaderboardResponse(guildId, guildName, interaction.user.id, page);

        await interaction.editReply({
            embeds: [embed],
            components: row ? [row] : [],
        });
    } catch (error) {
        console.error('Error in leaderboard command:', error);
        await interaction.editReply({ content: 'There was an error retrieving the leaderboard!' });
    }
}

// ─── Button interaction handler (called from main.ts) ─────────────────────────

export async function handleLeaderboardInteraction(interaction: ButtonInteraction): Promise<void> {
    const guildId = interaction.guild?.id;
    const guildName = interaction.guild?.name ?? 'Server';

    if (!guildId) return;

    // customId format: leaderboard_{targetPage}_{requestingUserId}
    // Discord user IDs are numeric only, so splitting on '_' is safe.
    const parts = interaction.customId.split('_');
    const targetPage = parseInt(parts[1]!, 10);
    const requestingUserId = parts[2];

    if (isNaN(targetPage) || !requestingUserId) return;

    // Only the original requester can paginate
    if (interaction.user.id !== requestingUserId) {
        await interaction.reply({
            content: 'Only the person who ran this command can navigate the pages!',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    await interaction.deferUpdate();

    try {
        const { embed, row } = await buildLeaderboardResponse(guildId, guildName, requestingUserId, targetPage);

        await interaction.editReply({
            embeds: [embed],
            components: row ? [row] : [],
        });
    } catch (error) {
        console.error('Error handling leaderboard pagination:', error);
    }
}
