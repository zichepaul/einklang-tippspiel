// GET /api/leaderboard – Gesamtrangliste inkl. Weltmeister-Wette.
// Sortierung & Gleichstand: siehe shared/leaderboard.ts.

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAuth, isErrorResponse, ok } from '../shared/http';
import { getOrCreateUser, rosterName } from '../shared/userService';
import { getContainer, CONTAINERS } from '../shared/cosmos';
import { getConfig } from '../shared/config';
import { buildLeaderboard, type LeaderboardInput } from '../shared/leaderboard';
import type { Prediction, TournamentBet, User } from '../shared/types';

export async function leaderboardHandler(
  req: HttpRequest,
  _ctx: InvocationContext,
): Promise<HttpResponseInit> {
  const auth = requireAuth(req);
  if (isErrorResponse(auth)) return auth;
  const me = await getOrCreateUser(auth.principal, auth.email);

  const config = await getConfig();
  const exactPoints = config.pointRules.exact;

  const [usersC, predsC, betsC] = await Promise.all([
    getContainer(CONTAINERS.users),
    getContainer(CONTAINERS.predictions),
    getContainer(CONTAINERS.tournamentBets),
  ]);
  const [{ resources: users }, { resources: preds }, { resources: bets }] = await Promise.all([
    usersC.items.query<User>({ query: 'SELECT * FROM c' }).fetchAll(),
    predsC.items.query<Prediction>({ query: 'SELECT * FROM c' }).fetchAll(),
    betsC.items.query<TournamentBet>({ query: 'SELECT * FROM c' }).fetchAll(),
  ]);

  const championByUser = new Map(bets.map((b) => [b.userId, b.points ?? 0]));

  const stats = new Map<string, { total: number; exact: number; tendency: number }>();
  for (const u of users) {
    stats.set(u.id, { total: championByUser.get(u.id) ?? 0, exact: 0, tendency: 0 });
  }
  for (const p of preds) {
    const s = stats.get(p.userId);
    if (!s || p.points == null) continue;
    s.total += p.points;
    if (p.points > 0) s.tendency += 1; // jeder Treffer ist mind. tendenziell korrekt
    if (p.points === exactPoints) s.exact += 1;
  }

  const input: LeaderboardInput[] = users.map((u) => {
    const s = stats.get(u.id)!;
    return {
      userId: u.id,
      displayName: rosterName(u),
      totalPoints: s.total,
      exactHits: s.exact,
      tendencyHits: s.tendency,
    };
  });

  const rows = buildLeaderboard(input).map((r) => ({
    rank: r.rank,
    name: r.displayName,
    totalPoints: r.totalPoints,
    exactHits: r.exactHits,
    isMe: r.userId === me.id,
  }));

  return ok({ leaderboard: rows });
}

app.http('leaderboard', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'leaderboard',
  handler: leaderboardHandler,
});
