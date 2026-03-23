import { Context, router } from '../router.js';
import { GuildModel } from '../../database/models/Guild.js';
import { UserGuildModel } from '../../database/models/UserGuild.js';
import { getDbConnection } from '../../database/connection.js';

router.get('/api/guilds', async ({ res }: Context) => {
  const guilds = await GuildModel.findAll();
  router.json(res, 200, guilds);
});

router.get('/api/guilds/:id', async ({ res, params }: Context) => {
  const guild = await GuildModel.findById(params.id);
  if (!guild) { router.json(res, 404, { error: 'Guild not found' }); return; }
  router.json(res, 200, guild);
});

router.get('/api/guilds/:id/leaderboard', async ({ res, params, query }: Context) => {
  const page = Math.max(1, parseInt(query.page ?? '1'));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '20')));
  const offset = (page - 1) * limit;
  const [data, total] = await Promise.all([
    UserGuildModel.getLeaderboardPage(params.id, offset, limit),
    UserGuildModel.getTotalUsersInGuild(params.id),
  ]);
  router.json(res, 200, { data, total, page, limit });
});

router.patch('/api/guilds/:id', async ({ res, params, body }: Context) => {
  const guild = await GuildModel.findById(params.id);
  if (!guild) { router.json(res, 404, { error: 'Guild not found' }); return; }
  const b = body as { name?: string; member_count?: number };
  const db = getDbConnection();
  await db.run(
    `UPDATE guilds SET name = ?, member_count = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [b.name ?? guild.name, b.member_count ?? guild.member_count, params.id]
  );
  const updated = await GuildModel.findById(params.id);
  router.json(res, 200, updated);
});
