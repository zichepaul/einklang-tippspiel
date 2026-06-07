// GET /api/admin/config – Regel-/Punkte-Konfiguration einsehen.

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAdmin, isErrorResponse, ok } from '../shared/http';
import { getConfig } from '../shared/config';
import { isChampionBetLocked } from '../shared/deadlines';

export async function adminConfigHandler(
  req: HttpRequest,
  _ctx: InvocationContext,
): Promise<HttpResponseInit> {
  const auth = await requireAdmin(req);
  if (isErrorResponse(auth)) return auth;

  const config = await getConfig();
  return ok({
    tournamentStartUtc: config.tournamentStartUtc,
    pointRules: config.pointRules,
    championBetPoints: config.championBetPoints,
    adminEmails: config.adminEmails,
    championBetLocked: isChampionBetLocked(config.tournamentStartUtc),
  });
}

app.http('adminConfig', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'admin/config',
  handler: adminConfigHandler,
});
