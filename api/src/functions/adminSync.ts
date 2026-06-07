// POST /api/admin/sync – Spielplan-/Ergebnis-Sync manuell auslösen.

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAdmin, isErrorResponse, ok, json } from '../shared/http';
import { runSync } from '../shared/syncService';

export async function adminSyncHandler(
  req: HttpRequest,
  ctx: InvocationContext,
): Promise<HttpResponseInit> {
  const auth = await requireAdmin(req);
  if (isErrorResponse(auth)) return auth;

  try {
    const result = await runSync({
      info: (m, ...a) => ctx.log(m, ...a),
      warn: (m, ...a) => ctx.warn(m, ...a),
      error: (m, ...a) => ctx.error(m, ...a),
    });
    ctx.log(`Manueller Sync durch ${auth.email}`);
    return ok(result);
  } catch (err) {
    ctx.error(`Sync fehlgeschlagen: ${String(err)}`);
    return json(502, { error: `Sync fehlgeschlagen: ${String(err)}` });
  }
}

app.http('adminSync', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'adminSync',
  handler: adminSyncHandler,
});
