import { For, Show } from 'solid-js';
import { LeaderboardEntry } from '../lib/api';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  loading: boolean;
}

function RankBadge(props: { rank: number }) {
  if (props.rank === 1) {
    return (
      <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-500/20 text-yellow-400 font-bold text-sm">
        1
      </span>
    );
  }
  if (props.rank === 2) {
    return (
      <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-400/20 text-slate-300 font-bold text-sm">
        2
      </span>
    );
  }
  if (props.rank === 3) {
    return (
      <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-orange-700/20 text-orange-400 font-bold text-sm">
        3
      </span>
    );
  }
  return (
    <span class="inline-flex items-center justify-center w-8 h-8 text-slate-400 font-medium text-sm">
      {props.rank}
    </span>
  );
}

function LevelPill(props: { level: number }) {
  const color =
    props.level >= 50
      ? 'bg-purple-500/20 text-purple-400'
      : props.level >= 25
      ? 'bg-blue-500/20 text-blue-400'
      : props.level >= 10
      ? 'bg-green-500/20 text-green-400'
      : 'bg-slate-600/50 text-slate-400';

  return (
    <span class={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      Lv {props.level}
    </span>
  );
}

export default function LeaderboardTable(props: LeaderboardTableProps) {
  return (
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="border-b border-slate-700">
            <th class="text-left text-slate-400 text-xs font-medium uppercase tracking-wider pb-3 pr-4">Rank</th>
            <th class="text-left text-slate-400 text-xs font-medium uppercase tracking-wider pb-3 pr-4">User</th>
            <th class="text-left text-slate-400 text-xs font-medium uppercase tracking-wider pb-3 pr-4">Level</th>
            <th class="text-right text-slate-400 text-xs font-medium uppercase tracking-wider pb-3 pr-4">XP</th>
            <th class="text-right text-slate-400 text-xs font-medium uppercase tracking-wider pb-3">Messages</th>
          </tr>
        </thead>
        <tbody>
          <Show
            when={!props.loading}
            fallback={
              <tr>
                <td colspan="5" class="py-12 text-center">
                  <div class="flex items-center justify-center gap-3 text-slate-400">
                    <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Loading...
                  </div>
                </td>
              </tr>
            }
          >
            <Show
              when={props.entries.length > 0}
              fallback={
                <tr>
                  <td colspan="5" class="py-12 text-center text-slate-500">
                    No entries found
                  </td>
                </tr>
              }
            >
              <For each={props.entries}>
                {(entry) => (
                  <tr class="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                    <td class="py-3 pr-4">
                      <RankBadge rank={entry.rank} />
                    </td>
                    <td class="py-3 pr-4">
                      <span class="text-white font-medium">{entry.username}</span>
                      <span class="text-slate-500 text-xs ml-2">#{entry.user_id.slice(-4)}</span>
                    </td>
                    <td class="py-3 pr-4">
                      <LevelPill level={entry.guild_level} />
                    </td>
                    <td class="py-3 pr-4 text-right text-slate-300 font-mono text-sm">
                      {entry.guild_xp.toLocaleString()}
                    </td>
                    <td class="py-3 text-right text-slate-300 font-mono text-sm">
                      {entry.guild_messages.toLocaleString()}
                    </td>
                  </tr>
                )}
              </For>
            </Show>
          </Show>
        </tbody>
      </table>
    </div>
  );
}
