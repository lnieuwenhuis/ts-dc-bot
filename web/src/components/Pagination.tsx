import { For, Show } from 'solid-js';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination(props: PaginationProps) {
  function getPageNumbers() {
    const pages: (number | null)[] = [];
    const total = props.totalPages;
    const current = props.page;

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (current > 3) pages.push(null); // ellipsis
      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (current < total - 2) pages.push(null); // ellipsis
      pages.push(total);
    }
    return pages;
  }

  return (
    <Show when={props.totalPages > 1}>
      <div class="flex items-center justify-center gap-1 mt-6">
        <button
          onClick={() => props.onPageChange(props.page - 1)}
          disabled={props.page <= 1}
          class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-slate-400 hover:text-white hover:bg-slate-700"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <For each={getPageNumbers()}>
          {(p) =>
            p === null ? (
              <span class="px-2 py-1.5 text-slate-500 text-sm">...</span>
            ) : (
              <button
                onClick={() => props.onPageChange(p)}
                class={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                  p === props.page
                    ? 'bg-blurple text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {p}
              </button>
            )
          }
        </For>

        <button
          onClick={() => props.onPageChange(props.page + 1)}
          disabled={props.page >= props.totalPages}
          class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-slate-400 hover:text-white hover:bg-slate-700"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </Show>
  );
}
