import { createResource, createSignal, For, Show } from 'solid-js';
import { A } from '@solidjs/router';
import { api } from '../lib/api';
import Pagination from '../components/Pagination';

const LIMIT = 20;

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

export default function Users() {
  const [page, setPage] = createSignal(1);

  const [users] = createResource(
    () => page(),
    (p) => api.users(p, LIMIT)
  );

  const totalPages = () => {
    const u = users();
    if (!u) return 1;
    return Math.max(1, Math.ceil(u.total / LIMIT));
  };

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
        <h1 class="text-2xl font-bold text-white">Users</h1>
        <Show when={users()}>
          <p class="text-slate-400 text-sm mt-1">{users()!.total.toLocaleString()} total users</p>
        </Show>
      </div>

      <div class="bg-slate-800 rounded-xl border border-slate-700">
        <Show
          when={!users.loading}
          fallback={<Spinner />}
        >
          <Show
            when={!users.error}
            fallback={
              <div class="p-6 text-red-400 text-sm">Failed to load users</div>
            }
          >
            <Show
              when={(users()?.data?.length ?? 0) > 0}
              fallback={
                <div class="p-12 text-center text-slate-500">
                  <svg class="w-12 h-12 mx-auto mb-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  No users found
                </div>
              }
            >
              <div class="overflow-x-auto">
                <table class="w-full">
                  <thead>
                    <tr class="border-b border-slate-700">
                      <th class="text-left text-slate-400 text-xs font-medium uppercase tracking-wider px-6 py-3">Username</th>
                      <th class="text-left text-slate-400 text-xs font-medium uppercase tracking-wider px-6 py-3">Level</th>
                      <th class="text-right text-slate-400 text-xs font-medium uppercase tracking-wider px-6 py-3">Total XP</th>
                      <th class="text-right text-slate-400 text-xs font-medium uppercase tracking-wider px-6 py-3">Chips</th>
                      <th class="text-left text-slate-400 text-xs font-medium uppercase tracking-wider px-6 py-3">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={users()?.data}>
                      {(user) => (
                        <tr class="border-b border-slate-700/50 last:border-0 hover:bg-slate-700/20 transition-colors">
                          <td class="px-6 py-4">
                            <A
                              href={`/users/${user.id}`}
                              class="text-white font-medium hover:text-blurple transition-colors flex items-center gap-2"
                            >
                              <div class="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 text-xs font-bold">
                                {user.username.charAt(0).toUpperCase()}
                              </div>
                              {user.username}
                            </A>
                          </td>
                          <td class="px-6 py-4">
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blurple/20 text-blurple">
                              Lv {user.overall_level}
                            </span>
                          </td>
                          <td class="px-6 py-4 text-right text-slate-300 font-mono text-sm">
                            {user.total_xp.toLocaleString()}
                          </td>
                          <td class="px-6 py-4 text-right text-yellow-400 font-mono text-sm">
                            {user.chips.toLocaleString()}
                          </td>
                          <td class="px-6 py-4 text-slate-400 text-sm">
                            {formatDate(user.created_at)}
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>

              <div class="px-6 pb-4">
                <Pagination
                  page={page()}
                  totalPages={totalPages()}
                  onPageChange={(p) => setPage(p)}
                />
              </div>
            </Show>
          </Show>
        </Show>
      </div>
    </div>
  );
}
