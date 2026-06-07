// PUT /api/admin/result – Ergebnis manuell setzen/überschreiben (Fallback).
// Body: { matchId, resultHome, resultAway, status?, champion? }
// Löst dieselbe (idempotente) Punkteberechnung aus wie der API-Sync.

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAdmin, isErrorResponse, ok, badRequest, json } from '../shared/http';
import { getContainer, CONTAINERS } from '../shared/cosmos';
import { scoreMatchPredictions, scoreChampionBets } from '../shared/scoringService';
import type { Match } from '../shared/types';

function isValidGoals(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 99;
}

export async function adminResultHandler(
  req: HttpRequest,
  ctx: InvocationContext,
): Promise<HttpResponseInit> {
  const auth = await requireAdmin(req);
  if (isErrorResponse(auth)) return auth;

  const body = (await req.json().catch(() => null)) as {
    matchId?: string;
    resultHome?: number;
    resultAway?: number;
    status?: Match['status'];
    champion?: string;
  } | null;

  if (!body?.matchId || !isValidGoals(body.resultHome) || !isValidGoals(body.resultAway)) {
    return badRequest('Bitte matchId sowie ganze Zahlen für beide Tore angeben.');
  }

  const matchesC = await getContainer(CONTAINERS.matches);
  const { resource: match } = await matchesC.item(body.matchId, body.matchId).read<Match>();
  if (!match) return json(404, { error: 'Spiel nicht gefunden.' });

  match.resultHome = body.resultHome;
  match.resultAway = body.resultAway;
  match.status = body.status ?? 'finished';
  match.resultSource = 'admin';
  match.updatedAt = new Date().toISOString();
  await matchesC.items.upsert(match);

  const scored = await scoreMatchPredictions(match);

  // Optional: bei manuell bestätigtem Finale die Weltmeister-Wette werten.
  let championScored = 0;
  if (match.stage === 'final' && body.champion) {
    championScored = await scoreChampionBets(body.champion.trim());
  }

  ctx.log(`Admin ${auth.email} setzte Ergebnis ${match.id} = ${match.resultHome}:${match.resultAway}`);
  return ok({
    match: {
      id: match.id,
      resultHome: match.resultHome,
      resultAway: match.resultAway,
      status: match.status,
      resultSource: match.resultSource,
    },
    predictionsScored: scored,
    championScored,
  });
}

app.http('adminResult', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'admin/result',
  handler: adminResultHandler,
});
