import { createResource, For, Show } from 'solid-js';
import { A } from '@solidjs/router';
import { api } from '../lib/api';
import StatCard from '../components/StatCard';

function Spinner() {
  return (
    <div class="flex items-center justify-center py-12">
      <svg class="w-8 h-8 animate-spin text-blurple" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  );
}

export default function Dashboard() {
  const [stats] = createResource(() => api.stats());
  const [topUsers] = createResource(() => api.users(1, 5));

  return (
    <div class="space-y-8">
      <div>
        <h1 class="text-2xl font-bold text-white">Dashboard</h1>
        <p class="text-slate-400 text-sm mt-1">Overview of your bot's activity</p>
      </div>

      {/* Stats Grid */}
      <Show
        when={!stats.loading}
        fallback={<Spinner />}
      >
        <Show
          when={stats()}
          fallback={
            <div class="text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg p-4 text-sm">
              Failed to load stats
            </div>
          }
        >
          {(s) => (
            <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <StatCard
                title="Total Users"
                value={s().total_users.toLocaleString()}
                icon={
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                }
                color="text-blurple"
              />
              <StatCard
                title="Total Guilds"
                value={s().total_guilds.toLocaleString()}
                icon={
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                }
                color="text-green-400"
              />
              <StatCard
                title="Total Messages"
                value={s().total_messages.toLocaleString()}
                icon={
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                }
                color="text-yellow-400"
              />
              <StatCard
                title="Avg Level"
                value={s().avg_level.toFixed(1)}
                subtitle="Global average"
                icon={
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                }
                color="text-purple-400"
              />
            </div>
          )}
        </Show>
      </Show>

      {/* Top Users */}
      <div class="bg-slate-800 rounded-xl border border-slate-700">
        <div class="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
          <h2 class="text-lg font-semibold text-white">Top Users</h2>
          <A href="/users" class="text-blurple hover:text-blurple-dark text-sm font-medium transition-colors">
            View all
          </A>
        </div>

        <Show
          when={!topUsers.loading}
          fallback={<Spinner />}
        >
          <Show
            when={topUsers()?.data && topUsers()!.data.length > 0}
            fallback={
              <div class="p-6 text-center text-slate-500">No users found</div>
            }
          >
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="border-b border-slate-700/50">
                    <th class="text-left text-slate-400 text-xs font-medium uppercase tracking-wider px-6 py-3">User</th>
                    <th class="text-left text-slate-400 text-xs font-medium uppercase tracking-wider px-6 py-3">Level</th>
                    <th class="text-right text-slate-400 text-xs font-medium uppercase tracking-wider px-6 py-3">Total XP</th>
                    <th class="text-right text-slate-400 text-xs font-medium uppercase tracking-wider px-6 py-3">Chips</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={topUsers()?.data}>
                    {(user, i) => (
                      <tr class="border-b border-slate-700/30 last:border-0 hover:bg-slate-700/20 transition-colors">
                        <td class="px-6 py-3">
                          <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full bg-blurple/20 flex items-center justify-center text-blurple font-bold text-sm">
                              {i() + 1}
                            </div>
                            <A
                              href={`/users/${user.id}`}
                              class="text-white font-medium hover:text-blurple transition-colors"
                            >
                              {user.username}
                            </A>
                          </div>
                        </td>
                        <td class="px-6 py-3">
                          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blurple/20 text-blurple">
                            Lv {user.overall_level}
                          </span>
                        </td>
                        <td class="px-6 py-3 text-right text-slate-300 font-mono text-sm">
                          {user.total_xp.toLocaleString()}
                        </td>
                        <td class="px-6 py-3 text-right text-yellow-400 font-mono text-sm">
                          {user.chips.toLocaleString()}
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </Show>
        </Show>
      </div>
    </div>
  );
}
