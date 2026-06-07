// PUT /api/predictions – einen Spieltipp abgeben/ändern.
// Body: { matchId, predHome, predAway }
// Sperre: nur bis zum Anpfiff der jeweiligen Partie möglich.

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import {
  requireAuth,
  isErrorResponse,
  ok,
  badRequest,
  locked,
  json,
} from '../shared/http';
import { getOrCreateUser } from '../shared/userService';
import { getContainer, CONTAINERS } from '../shared/cosmos';
import { isMatchLocked } from '../shared/deadlines';
import type { Match, Prediction } from '../shared/types';

function isValidGoals(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 99;
}

export async function predictionsHandler(
  req: HttpRequest,
  _ctx: InvocationContext,
): Promise<HttpResponseInit> {
  const auth = requireAuth(req);
  if (isErrorResponse(auth)) return auth;
  const me = await getOrCreateUser(auth.principal, auth.email);

  const body = (await req.json().catch(() => null)) as
    | { matchId?: string; predHome?: number; predAway?: number }
    | null;
  if (!body?.matchId || !isValidGoals(body.predHome) || !isValidGoals(body.predAway)) {
    return badRequest('Ungültige Eingabe. Bitte ganze Zahlen für beide Tore angeben.');
  }

  const matchesC = await getContainer(CONTAINERS.matches);
  const { resource: match } = await matchesC.item(body.matchId, body.matchId).read<Match>();
  if (!match) return json(404, { error: 'Spiel nicht gefunden.' });

  if (isMatchLocked(match.kickoffUtc)) {
    return locked('Dieses Spiel hat bereits begonnen – der Tipp ist gesperrt.');
  }

  const predsC = await getContainer(CONTAINERS.predictions);
  const id = `${me.id}:${match.id}`;
  const prediction: Prediction = {
    id,
    userId: me.id,
    matchId: match.id,
    predHome: body.predHome,
    predAway: body.predAway,
    points: null, // wird bei Spielende berechnet
    submittedAt: new Date().toISOString(),
  };
  await predsC.items.upsert(prediction);

  return ok({
    matchId: match.id,
    predHome: prediction.predHome,
    predAway: prediction.predAway,
    points: prediction.points,
  });
}

app.http('predictions', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'predictions',
  handler: predictionsHandler,
});
