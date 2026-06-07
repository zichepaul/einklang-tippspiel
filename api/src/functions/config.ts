// GET /api/config – öffentliche (eingeloggte) Sicht auf Turnierstart & Regeln.

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAuth, isErrorResponse, ok } from '../shared/http';
import { getConfig } from '../shared/config';
import { isChampionBetLocked } from '../shared/deadlines';

export async function configHandler(
  req: HttpRequest,
  _ctx: InvocationContext,
): Promise<HttpResponseInit> {
  const auth = requireAuth(req);
  if (isErrorResponse(auth)) return auth;

  const config = await getConfig();
  return ok({
    tournamentStartUtc: config.tournamentStartUtc,
    pointRules: config.pointRules,
    championBetPoints: config.championBetPoints,
    championBetLocked: isChampionBetLocked(config.tournamentStartUtc),
  });
}

app.http('config', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'config',
  handler: configHandler,
});
