import { createResource, For, Show } from 'solid-js';
import { A } from '@solidjs/router';
import { api } from '../lib/api';

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

export default function Guilds() {
  const [guilds] = createResource(() => api.guilds());

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  return (
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-white">Guilds</h1>
        <p class="text-slate-400 text-sm mt-1">All Discord servers using the bot</p>
      </div>

      <div class="bg-slate-800 rounded-xl border border-slate-700">
        <Show
          when={!guilds.loading}
          fallback={<Spinner />}
        >
          <Show
            when={!guilds.error}
            fallback={
              <div class="p-6 text-red-400 text-sm">Failed to load guilds</div>
            }
          >
            <Show
              when={guilds()?.length ?? 0 > 0}
              fallback={
                <div class="p-12 text-center text-slate-500">
                  <svg class="w-12 h-12 mx-auto mb-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  No guilds found
                </div>
              }
            >
              <div class="overflow-x-auto">
                <table class="w-full">
                  <thead>
                    <tr class="border-b border-slate-700">
                      <th class="text-left text-slate-400 text-xs font-medium uppercase tracking-wider px-6 py-3">Name</th>
                      <th class="text-left text-slate-400 text-xs font-medium uppercase tracking-wider px-6 py-3">Members</th>
                      <th class="text-left text-slate-400 text-xs font-medium uppercase tracking-wider px-6 py-3">Owner ID</th>
                      <th class="text-left text-slate-400 text-xs font-medium uppercase tracking-wider px-6 py-3">Created</th>
                      <th class="text-left text-slate-400 text-xs font-medium uppercase tracking-wider px-6 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={guilds()}>
                      {(guild) => (
                        <tr class="border-b border-slate-700/50 last:border-0 hover:bg-slate-700/20 transition-colors">
                          <td class="px-6 py-4">
                            <div class="flex items-center gap-3">
                              <div class="w-9 h-9 rounded-lg bg-blurple/20 flex items-center justify-center">
                                <svg class="w-5 h-5 text-blurple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                              </div>
                              <span class="text-white font-medium">{guild.name}</span>
                            </div>
                          </td>
                          <td class="px-6 py-4 text-slate-300">
                            {guild.member_count.toLocaleString()}
                          </td>
                          <td class="px-6 py-4 text-slate-400 font-mono text-xs">
                            {guild.owner_id ?? '—'}
                          </td>
                          <td class="px-6 py-4 text-slate-400 text-sm">
                            {formatDate(guild.created_at)}
                          </td>
                          <td class="px-6 py-4">
                            <A
                              href={`/guilds/${guild.id}`}
                              class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blurple/20 hover:bg-blurple text-blurple hover:text-white rounded-lg text-sm font-medium transition-colors"
                            >
                              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View
                            </A>
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </Show>
          </Show>
        </Show>
      </div>
    </div>
  );
}
