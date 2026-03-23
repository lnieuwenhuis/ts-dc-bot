import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    ButtonInteraction,
    MessageFlags,
    Guild,
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

// ─── Name resolution ──────────────────────────────────────────────────────────
//
// Priority: server nickname → account username → global display name → 'Unknown User'
//
// We batch-fetch all members on the current page + rank context in one call so
// we never hit rate limits with individual requests.

async function resolveDisplayNames(
    guild: Guild,
    userIds: string[],
): Promise<Map<string, string>> {
    const nameMap = new Map<string, string>();
    if (userIds.length === 0) return nameMap;

    try {
        const members = await guild.members.fetch({ user: userIds });
        for (const [id, member] of members) {
            nameMap.set(
                id,
                member.nickname
                    ?? member.user.username
                    ?? member.user.globalName
                    ?? 'Unknown User',
            );
        }
    } catch {
        // Batch fetch failed — fall back to individual fetches so partial data
        // is still better than nothing.
        await Promise.allSettled(
            userIds.map(async userId => {
                try {
                    const member = await guild.members.fetch(userId);
                    nameMap.set(
                        userId,
                        member.nickname
                            ?? member.user.username
                            ?? member.user.globalName
                            ?? 'Unknown User',
                    );
                } catch {
                    nameMap.set(userId, 'Unknown User');
                }
            }),
        );
    }

    // Fill in anything that wasn't returned (e.g. user left the server)
    for (const id of userIds) {
        if (!nameMap.has(id)) nameMap.set(id, 'Unknown User');
    }

    return nameMap;
}

function withResolvedName(entry: LeaderboardEntry, nameMap: Map<string, string>): LeaderboardEntry {
    return { ...entry, username: nameMap.get(entry.user_id) ?? entry.username };
}

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

    if (rankContext) {
        const { userEntry, above, below } = rankContext;
        const lines: string[] = [];

        if (above) lines.push(formatEntry(above));
        lines.push(`${formatEntry(userEntry)} ← **you**`);
        if (below) lines.push(formatEntry(below));

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
    guild: Guild,
    requestingUserId: string,
    page: number,
): Promise<LeaderboardResponse> {
    const guildId = guild.id;

    const totalUsers = await UserGuildModel.getTotalUsersInGuild(guildId);
    const totalPages = Math.max(1, Math.ceil(totalUsers / PAGE_SIZE));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const offset = (safePage - 1) * PAGE_SIZE;

    const [entries, rankContext] = await Promise.all([
        UserGuildModel.getLeaderboardPage(guildId, offset, PAGE_SIZE),
        UserGuildModel.getUserRankContext(requestingUserId, guildId),
    ]);

    // Collect every user ID we'll render so we can batch-resolve names once.
    const idsToResolve = new Set<string>(entries.map(e => e.user_id));
    if (rankContext) {
        idsToResolve.add(rankContext.userEntry.user_id);
        if (rankContext.above) idsToResolve.add(rankContext.above.user_id);
        if (rankContext.below) idsToResolve.add(rankContext.below.user_id);
    }

    const nameMap = await resolveDisplayNames(guild, [...idsToResolve]);

    // Apply resolved names to every entry before rendering.
    const resolvedEntries = entries.map(e => withResolvedName(e, nameMap));
    const resolvedContext: UserRankContext | null = rankContext
        ? {
            userEntry: withResolvedName(rankContext.userEntry, nameMap),
            above: rankContext.above ? withResolvedName(rankContext.above, nameMap) : null,
            below: rankContext.below ? withResolvedName(rankContext.below, nameMap) : null,
        }
        : null;

    const embed = buildEmbed(guild.name, resolvedEntries, totalUsers, safePage, totalPages, resolvedContext);
    const row = buildButtonRow(safePage, totalPages, requestingUserId);

    return { embed, row };
}

// ─── Slash command execute ────────────────────────────────────────────────────

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) {
        await interaction.reply({
            content: 'This command can only be used in a server!',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const page = interaction.options.getInteger('page') ?? 1;

    await interaction.deferReply();

    try {
        const { embed, row } = await buildLeaderboardResponse(interaction.guild, interaction.user.id, page);

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
    if (!interaction.guild) return;

    // customId format: leaderboard_{targetPage}_{requestingUserId}
    // Discord user IDs are purely numeric so splitting on '_' is unambiguous.
    const parts = interaction.customId.split('_');
    const targetPage = parseInt(parts[1]!, 10);
    const requestingUserId = parts[2];

    if (isNaN(targetPage) || !requestingUserId) return;

    // Only the original requester can paginate.
    if (interaction.user.id !== requestingUserId) {
        await interaction.reply({
            content: 'Only the person who ran this command can navigate the pages!',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    await interaction.deferUpdate();

    try {
        const { embed, row } = await buildLeaderboardResponse(interaction.guild, requestingUserId, targetPage);

        await interaction.editReply({
            embeds: [embed],
            components: row ? [row] : [],
        });
    } catch (error) {
        console.error('Error handling leaderboard pagination:', error);
    }
}
