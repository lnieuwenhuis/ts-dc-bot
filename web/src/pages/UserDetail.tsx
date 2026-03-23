import { createResource, createSignal, For, Show } from 'solid-js';
import { useParams, A } from '@solidjs/router';
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

export default function UserDetail() {
  const params = useParams();
  const [editing, setEditing] = createSignal(false);
  const [editChips, setEditChips] = createSignal(0);
  const [editXp, setEditXp] = createSignal(0);
  const [saving, setSaving] = createSignal(false);
  const [saveError, setSaveError] = createSignal('');

  const [user, { refetch: refetchUser }] = createResource(
    () => params.id,
    (id) => api.user(id)
  );

  const [userGuilds] = createResource(
    () => params.id,
    (id) => api.userGuilds(id)
  );

  function startEdit() {
    const u = user();
    if (!u) return;
    setEditChips(u.chips);
    setEditXp(u.total_xp);
    setEditing(true);
    setSaveError('');
  }

  function cancelEdit() {
    setEditing(false);
    setSaveError('');
  }

  async function saveEdit() {
    setSaving(true);
    setSaveError('');
    try {
      await api.patchUser(params.id, {
        chips: editChips(),
        total_xp: editXp(),
      });
      setEditing(false);
      refetchUser();
    } catch (e: any) {
      setSaveError(e.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  function formatDateShort(dateStr: string | undefined) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  return (
    <div class="space-y-8">
      {/* User Header */}
      <Show
        when={!user.loading}
        fallback={<Spinner />}
      >
        <Show
          when={user()}
          fallback={
            <div class="text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg p-4">
              User not found
            </div>
          }
        >
          {(u) => (
            <div class="bg-slate-800 rounded-xl border border-slate-700 p-6">
              <div class="flex items-start justify-between gap-4">
                <div class="flex items-center gap-4">
                  <div class="w-16 h-16 rounded-full bg-blurple/20 flex items-center justify-center text-blurple font-bold text-2xl">
                    {u().username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h1 class="text-2xl font-bold text-white">{u().username}</h1>
                    <Show when={u().discriminator}>
                      <p class="text-slate-400 text-sm">#{u().discriminator}</p>
                    </Show>
                    <p class="text-slate-500 text-xs font-mono mt-0.5">ID: {u().id}</p>
                  </div>
                </div>
                <button
                  onClick={startEdit}
                  class="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                <div class="bg-slate-900/50 rounded-lg p-3">
                  <p class="text-slate-400 text-xs font-medium">Global Level</p>
                  <p class="text-white font-semibold text-lg mt-0.5">{u().overall_level}</p>
                </div>
                <div class="bg-slate-900/50 rounded-lg p-3">
                  <p class="text-slate-400 text-xs font-medium">Total XP</p>
                  <p class="text-white font-semibold text-lg mt-0.5">{u().total_xp.toLocaleString()}</p>
                </div>
                <div class="bg-slate-900/50 rounded-lg p-3">
                  <p class="text-slate-400 text-xs font-medium">Chips</p>
                  <p class="text-yellow-400 font-semibold text-lg mt-0.5">{u().chips.toLocaleString()}</p>
                </div>
                <div class="bg-slate-900/50 rounded-lg p-3">
                  <p class="text-slate-400 text-xs font-medium">Member Since</p>
                  <p class="text-white text-sm mt-0.5">{formatDate(u().created_at)}</p>
                </div>
              </div>
            </div>
          )}
        </Show>
      </Show>

      {/* Edit Modal */}
      <Show when={editing()}>
        <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div class="bg-slate-800 rounded-xl border border-slate-700 p-6 w-full max-w-md shadow-2xl">
            <h2 class="text-lg font-semibold text-white mb-4">Edit User</h2>

            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-1.5">Chips</label>
                <input
                  type="number"
                  value={editChips()}
                  onInput={(e) => setEditChips(parseInt(e.currentTarget.value) || 0)}
                  class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blurple focus:ring-1 focus:ring-blurple transition-colors"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-1.5">
                  Total XP
                  <span class="text-slate-500 text-xs ml-1">(level auto-recalculates)</span>
                </label>
                <input
                  type="number"
                  value={editXp()}
                  onInput={(e) => setEditXp(parseInt(e.currentTarget.value) || 0)}
                  class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blurple focus:ring-1 focus:ring-blurple transition-colors"
                />
                <p class="text-slate-500 text-xs mt-1">
                  Calculated level: {Math.floor(Math.sqrt(editXp() / 50)) + 1}
                </p>
              </div>

              <Show when={saveError()}>
                <p class="text-red-400 text-sm">{saveError()}</p>
              </Show>
            </div>

            <div class="flex gap-3 mt-6">
              <button
                onClick={cancelEdit}
                class="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={saving()}
                class="flex-1 px-4 py-2 bg-blurple hover:bg-blurple-dark disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {saving() ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </Show>

      {/* Guild Memberships */}
      <div class="bg-slate-800 rounded-xl border border-slate-700">
        <div class="px-6 py-4 border-b border-slate-700">
          <h2 class="text-lg font-semibold text-white">Guild Memberships</h2>
        </div>

        <Show
          when={!userGuilds.loading}
          fallback={<Spinner />}
        >
          <Show
            when={(userGuilds()?.length ?? 0) > 0}
            fallback={
              <div class="p-12 text-center text-slate-500">
                This user is not in any guilds
              </div>
            }
          >
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="border-b border-slate-700">
                    <th class="text-left text-slate-400 text-xs font-medium uppercase tracking-wider px-6 py-3">Guild</th>
                    <th class="text-left text-slate-400 text-xs font-medium uppercase tracking-wider px-6 py-3">Level</th>
                    <th class="text-right text-slate-400 text-xs font-medium uppercase tracking-wider px-6 py-3">Guild XP</th>
                    <th class="text-right text-slate-400 text-xs font-medium uppercase tracking-wider px-6 py-3">Messages</th>
                    <th class="text-left text-slate-400 text-xs font-medium uppercase tracking-wider px-6 py-3">Last Message</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={userGuilds()}>
                    {(entry) => (
                      <tr class="border-b border-slate-700/50 last:border-0 hover:bg-slate-700/20 transition-colors">
                        <td class="px-6 py-4">
                          <A
                            href={`/guilds/${entry.guild_id}`}
                            class="text-white font-medium hover:text-blurple transition-colors"
                          >
                            {entry.guild_name}
                          </A>
                        </td>
                        <td class="px-6 py-4">
                          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blurple/20 text-blurple">
                            Lv {entry.guild_level}
                          </span>
                        </td>
                        <td class="px-6 py-4 text-right text-slate-300 font-mono text-sm">
                          {entry.guild_xp.toLocaleString()}
                        </td>
                        <td class="px-6 py-4 text-right text-slate-300 font-mono text-sm">
                          {entry.guild_messages.toLocaleString()}
                        </td>
                        <td class="px-6 py-4 text-slate-400 text-sm">
                          {formatDateShort(entry.last_message_at)}
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
