import { Context, router } from '../router.js';
import { UserModel } from '../../database/models/User.js';
import { getDbConnection } from '../../database/connection.js';

router.get('/api/users', async ({ res, query }: Context) => {
  const page = Math.max(1, parseInt(query.page ?? '1'));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '20')));
  const offset = (page - 1) * limit;
  const db = getDbConnection();
  const [data, totalRow] = await Promise.all([
    db.all('SELECT * FROM users ORDER BY total_xp DESC LIMIT ? OFFSET ?', [limit, offset]),
    db.get<{ count: number }>('SELECT COUNT(*) as count FROM users'),
  ]);
  router.json(res, 200, { data, total: totalRow?.count ?? 0, page, limit });
});

router.get('/api/users/:id', async ({ res, params }: Context) => {
  const user = await UserModel.findById(params.id);
  if (!user) { router.json(res, 404, { error: 'User not found' }); return; }
  router.json(res, 200, user);
});

router.get('/api/users/:id/guilds', async ({ res, params }: Context) => {
  const db = getDbConnection();
  const entries = await db.all(
    `SELECT ug.id, ug.user_id, ug.guild_id, g.name as guild_name,
            ug.guild_xp, ug.guild_level, ug.guild_messages,
            ug.joined_at, ug.last_message_at, ug.created_at, ug.updated_at
     FROM user_guilds ug JOIN guilds g ON ug.guild_id = g.id
     WHERE ug.user_id = ? ORDER BY ug.guild_xp DESC`,
    [params.id]
  );
  router.json(res, 200, entries);
});

router.patch('/api/users/:id', async ({ res, params, body }: Context) => {
  const user = await UserModel.findById(params.id);
  if (!user) { router.json(res, 404, { error: 'User not found' }); return; }
  const b = body as { chips?: number; total_xp?: number };
  const newChips = b.chips ?? user.chips;
  const newXp = b.total_xp ?? user.total_xp;
  const newLevel = Math.floor(Math.sqrt(newXp / 50)) + 1;
  const db = getDbConnection();
  await db.run(
    `UPDATE users SET chips = ?, total_xp = ?, overall_level = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [newChips, newXp, newLevel, params.id]
  );
  router.json(res, 200, await UserModel.findById(params.id));
});
