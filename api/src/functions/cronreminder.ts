// POST/GET /api/cronreminder – von GitHub Actions täglich aufgerufen.
// Sendet die Teams-Erinnerung. Geschützt über CRON_SECRET.

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireCronKey, ok, json } from '../shared/http';
import { runReminder } from '../shared/reminderService';

export async function cronreminderHandler(
  req: HttpRequest,
  ctx: InvocationContext,
): Promise<HttpResponseInit> {
  const denied = requireCronKey(req);
  if (denied) return denied;

  try {
    const result = await runReminder({
      info: (m, ...a) => ctx.log(m, ...a),
      error: (m, ...a) => ctx.error(m, ...a),
    });
    return ok(result);
  } catch (err) {
    ctx.error(`cronreminder fehlgeschlagen: ${String(err)}`);
    return json(502, { error: String(err) });
  }
}

app.http('cronreminder', {
  methods: ['POST', 'GET'],
  authLevel: 'anonymous',
  route: 'cronreminder',
  handler: cronreminderHandler,
});
