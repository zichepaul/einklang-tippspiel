// POST/GET /api/cronreminder – von GitHub Actions täglich aufgerufen.
// Sendet die Teams-Erinnerung. Geschützt über CRON_SECRET.

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireCronKey, ok, json } from '../shared/http';
import { runReminder } from '../shared/reminderService';
import { teamsConfigured, postTeamsCard } from '../shared/teams';

export async function cronreminderHandler(
  req: HttpRequest,
  ctx: InvocationContext,
): Promise<HttpResponseInit> {
  const denied = requireCronKey(req);
  if (denied) return denied;

  // ?test=1 sendet eine einmalige Testnachricht (unabhängig von heutigen Spielen),
  // um die Teams-Anbindung zu prüfen.
  if (req.query.get('test') === '1') {
    if (!teamsConfigured()) return json(400, { error: 'TEAMS_WEBHOOK_URL nicht gesetzt.' });
    await postTeamsCard({
      title: 'Test: Tippspiel-Erinnerung',
      lines: [
        'Dies ist eine Testnachricht. Wenn sie im Kanal erscheint, funktioniert der Teams-Reminder.',
        'Echte Erinnerungen kommen automatisch an Spieltagen.',
      ],
      appUrl: process.env.APP_URL || undefined,
    });
    return ok({ sent: true, test: true });
  }

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
