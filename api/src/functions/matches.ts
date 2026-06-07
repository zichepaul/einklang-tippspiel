// GET /api/matches – kompletter Spielplan mit Status, 90-Min-Ergebnis,
// eigenem Tipp + erzielten Punkten. Fremde Tipps werden erst ab Anpfiff
// der jeweiligen Partie mitgeliefert (Sichtbarkeitsregel).

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAuth, isErrorResponse, ok } from '../shared/http';
import { getOrCreateUser, rosterName } from '../shared/userService';
import { getContainer, CONTAINERS } from '../shared/cosmos';
import { isMatchLocked, arePredictionsVisible } from '../shared/deadlines';
import type { Match, Prediction, User } from '../shared/types';

export async function matchesHandler(
  req: HttpRequest,
  _ctx: InvocationContext,
): Promise<HttpResponseInit> {
  const auth = requireAuth(req);
  if (isErrorResponse(auth)) return auth;
  const me = await getOrCreateUser(auth.principal, auth.email);

  const [matchesC, predsC, usersC] = await Promise.all([
    getContainer(CONTAINERS.matches),
    getContainer(CONTAINERS.predictions),
    getContainer(CONTAINERS.users),
  ]);

  const [{ resources: matches }, { resources: preds }, { resources: users }] = await Promise.all([
    matchesC.items.query<Match>({ query: 'SELECT * FROM c' }).fetchAll(),
    predsC.items.query<Prediction>({ query: 'SELECT * FROM c' }).fetchAll(),
    usersC.items.query<User>({ query: 'SELECT c.id, c.displayName, c.nickname FROM c' }).fetchAll(),
  ]);

  const nameById = new Map(users.map((u) => [u.id, rosterName(u)]));
  const predsByMatch = new Map<string, Prediction[]>();
  for (const p of preds) {
    const list = predsByMatch.get(p.matchId) ?? [];
    list.push(p);
    predsByMatch.set(p.matchId, list);
  }

  const now = new Date();
  const dto = matches
    .sort((a, b) => a.kickoffUtc.localeCompare(b.kickoffUtc))
    .map((m) => {
      const matchPreds = predsByMatch.get(m.id) ?? [];
      const mine = matchPreds.find((p) => p.userId === me.id);
      const visible = arePredictionsVisible(m.kickoffUtc, now);
      return {
        id: m.id,
        externalId: m.externalId,
        stage: m.stage,
        group: m.group ?? null,
        matchday: m.matchday ?? null,
        kickoffUtc: m.kickoffUtc,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        status: m.status,
        resultHome: m.resultHome ?? null,
        resultAway: m.resultAway ?? null,
        locked: isMatchLocked(m.kickoffUtc, now),
        myPrediction: mine
          ? { predHome: mine.predHome, predAway: mine.predAway, points: mine.points }
          : null,
        // Fremde Tipps nur nach Anpfiff.
        otherPredictions: visible
          ? matchPreds
              .filter((p) => p.userId !== me.id)
              .map((p) => ({
                name: nameById.get(p.userId) ?? 'Unbekannt',
                predHome: p.predHome,
                predAway: p.predAway,
                points: p.points,
              }))
              .sort((a, b) => a.name.localeCompare(b.name, 'de'))
          : null,
      };
    });

  return ok({ matches: dto });
}

app.http('matches', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'matches',
  handler: matchesHandler,
});
