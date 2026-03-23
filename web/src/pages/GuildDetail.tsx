import { createResource, createSignal, Show } from 'solid-js';
import { useParams } from '@solidjs/router';
import { api } from '../lib/api';
import LeaderboardTable from '../components/LeaderboardTable';
import Pagination from '../components/Pagination';

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

export default function GuildDetail() {
  const params = useParams();
  const [page, setPage] = createSignal(1);
  const [editing, setEditing] = createSignal(false);
  const [editName, setEditName] = createSignal('');
  const [editMemberCount, setEditMemberCount] = createSignal(0);
  const [saving, setSaving] = createSignal(false);
  const [saveError, setSaveError] = createSignal('');

  const [guild, { refetch: refetchGuild }] = createResource(
    () => params.id,
    (id) => api.guild(id)
  );

  const [leaderboard, { refetch: refetchLeaderboard }] = createResource(
    () => ({ id: params.id, page: page() }),
    ({ id, page }) => api.guildLeaderboard(id, page)
  );

  function startEdit() {
    const g = guild();
    if (!g) return;
    setEditName(g.name);
    setEditMemberCount(g.member_count);
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
      await api.patchGuild(params.id, {
        name: editName(),
        member_count: editMemberCount(),
      });
      setEditing(false);
      refetchGuild();
    } catch (e: any) {
      setSaveError(e.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  const totalPages = () => {
    const lb = leaderboard();
    if (!lb) return 1;
    return Math.max(1, Math.ceil(lb.total / lb.limit));
  };

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  return (
    <div class="space-y-8">
      {/* Header */}
      <Show
        when={!guild.loading}
        fallback={<Spinner />}
      >
        <Show
          when={guild()}
          fallback={
            <div class="text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg p-4">
              Guild not found
            </div>
          }
        >
          {(g) => (
            <div class="bg-slate-800 rounded-xl border border-slate-700 p-6">
              <div class="flex items-start justify-between gap-4">
                <div class="flex items-center gap-4">
                  <div class="w-14 h-14 rounded-xl bg-blurple/20 flex items-center justify-center">
                    <svg class="w-8 h-8 text-blurple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <h1 class="text-2xl font-bold text-white">{g().name}</h1>
                    <p class="text-slate-400 text-sm mt-0.5">ID: {g().id}</p>
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

              <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6">
                <div class="bg-slate-900/50 rounded-lg p-3">
                  <p class="text-slate-400 text-xs font-medium">Members</p>
                  <p class="text-white font-semibold text-lg mt-0.5">{g().member_count.toLocaleString()}</p>
                </div>
                <div class="bg-slate-900/50 rounded-lg p-3">
                  <p class="text-slate-400 text-xs font-medium">Owner ID</p>
                  <p class="text-white font-mono text-sm mt-0.5 truncate">{g().owner_id ?? '—'}</p>
                </div>
                <div class="bg-slate-900/50 rounded-lg p-3">
                  <p class="text-slate-400 text-xs font-medium">Created</p>
                  <p class="text-white text-sm mt-0.5">{formatDate(g().created_at)}</p>
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
            <h2 class="text-lg font-semibold text-white mb-4">Edit Guild</h2>

            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-1.5">Name</label>
                <input
                  type="text"
                  value={editName()}
                  onInput={(e) => setEditName(e.currentTarget.value)}
                  class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blurple focus:ring-1 focus:ring-blurple transition-colors"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-1.5">Member Count</label>
                <input
                  type="number"
                  value={editMemberCount()}
                  onInput={(e) => setEditMemberCount(parseInt(e.currentTarget.value) || 0)}
                  class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blurple focus:ring-1 focus:ring-blurple transition-colors"
                />
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

      {/* Leaderboard */}
      <div class="bg-slate-800 rounded-xl border border-slate-700">
        <div class="px-6 py-4 border-b border-slate-700">
          <h2 class="text-lg font-semibold text-white">Leaderboard</h2>
          <Show when={leaderboard()}>
            <p class="text-slate-400 text-sm mt-0.5">{leaderboard()!.total.toLocaleString()} members</p>
          </Show>
        </div>
        <div class="p-6">
          <LeaderboardTable
            entries={leaderboard()?.data ?? []}
            loading={leaderboard.loading}
          />
          <Pagination
            page={page()}
            totalPages={totalPages()}
            onPageChange={(p) => setPage(p)}
          />
        </div>
      </div>
    </div>
  );
}
