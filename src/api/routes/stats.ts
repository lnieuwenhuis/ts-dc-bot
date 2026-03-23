import { Context, router } from '../router.js';
import { getDbConnection } from '../../database/connection.js';

router.get('/api/stats', async ({ res }: Context) => {
  const db = getDbConnection();
  const total_users = (await db.get<{ count: number }>('SELECT COUNT(*) as count FROM users'))?.count ?? 0;
  const total_guilds = (await db.get<{ count: number }>('SELECT COUNT(*) as count FROM guilds'))?.count ?? 0;
  const total_messages = (await db.get<{ total: number }>('SELECT COALESCE(SUM(guild_messages), 0) as total FROM user_guilds'))?.total ?? 0;
  const avg_level = (await db.get<{ avg: number }>('SELECT COALESCE(AVG(overall_level), 0) as avg FROM users'))?.avg ?? 0;
  router.json(res, 200, { total_users, total_guilds, total_messages, avg_level });
});
