// POST/GET /api/cronsync – von GitHub Actions zeitgesteuert aufgerufen.
// Führt den Spielplan-/Ergebnis-Sync aus. Geschützt über CRON_SECRET, da SWA
// Managed Functions keine Timer-Trigger unterstützen.

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireCronKey, ok, json } from '../shared/http';
import { runSync } from '../shared/syncService';

export async function cronsyncHandler(
  req: HttpRequest,
  ctx: InvocationContext,
): Promise<HttpResponseInit> {
  const denied = requireCronKey(req);
  if (denied) return denied;

  try {
    const result = await runSync({
      info: (m, ...a) => ctx.log(m, ...a),
      warn: (m, ...a) => ctx.warn(m, ...a),
      error: (m, ...a) => ctx.error(m, ...a),
    });
    return ok(result);
  } catch (err) {
    ctx.error(`cronsync fehlgeschlagen: ${String(err)}`);
    return json(502, { error: String(err) });
  }
}

app.http('cronsync', {
  methods: ['POST', 'GET'],
  authLevel: 'anonymous',
  route: 'cronsync',
  handler: cronsyncHandler,
});
