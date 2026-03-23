const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8081';

function getToken() { return localStorage.getItem('token'); }
export function setToken(t: string) { localStorage.setItem('token', t); }
export function clearToken() { localStorage.removeItem('token'); }
export function isAuthenticated() { return !!getToken(); }

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (res.status === 401) { clearToken(); window.location.href = '/login'; }
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const api = {
  login: (password: string) => request<{ token: string }>('/auth/login', { method: 'POST', body: JSON.stringify({ password }) }),
  stats: () => request<Stats>('/api/stats'),
  guilds: () => request<Guild[]>('/api/guilds'),
  guild: (id: string) => request<Guild>(`/api/guilds/${id}`),
  guildLeaderboard: (id: string, page = 1, limit = 20) => request<LeaderboardResponse>(`/api/guilds/${id}/leaderboard?page=${page}&limit=${limit}`),
  patchGuild: (id: string, body: Partial<Guild>) => request<Guild>(`/api/guilds/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  users: (page = 1, limit = 20) => request<UsersResponse>(`/api/users?page=${page}&limit=${limit}`),
  user: (id: string) => request<User>(`/api/users/${id}`),
  userGuilds: (id: string) => request<UserGuildEntry[]>(`/api/users/${id}/guilds`),
  patchUser: (id: string, body: Partial<User>) => request<User>(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
};

// Types
export interface Stats { total_users: number; total_guilds: number; total_messages: number; avg_level: number; }
export interface Guild { id: string; name: string; owner_id?: string; member_count: number; created_at: string; updated_at: string; }
export interface User { id: string; username: string; discriminator?: string; chips: number; total_xp: number; overall_level: number; created_at: string; updated_at: string; }
export interface LeaderboardEntry { rank: number; user_id: string; username: string; guild_level: number; guild_xp: number; guild_messages: number; }
export interface LeaderboardResponse { data: LeaderboardEntry[]; total: number; page: number; limit: number; }
export interface UsersResponse { data: User[]; total: number; page: number; limit: number; }
export interface UserGuildEntry { id: number; user_id: string; guild_id: string; guild_name: string; guild_xp: number; guild_level: number; guild_messages: number; joined_at: string; last_message_at?: string; }
