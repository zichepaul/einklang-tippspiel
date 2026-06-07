// Timer-getriggerter Sync. Standard: alle 10 Minuten. Während aktiver
// Spielfenster ist das ein guter Kompromiss aus Aktualität und API-Quota.
// CRON kann via App-Setting "SYNC_SCHEDULE" überschrieben werden.

import { app, InvocationContext, Timer } from '@azure/functions';
import { runSync } from '../shared/syncService';

const SCHEDULE = process.env.SYNC_SCHEDULE ?? '0 */10 * * * *';

export async function syncTimer(_timer: Timer, ctx: InvocationContext): Promise<void> {
  try {
    const result = await runSync({
      info: (m, ...a) => ctx.log(m, ...a),
      warn: (m, ...a) => ctx.warn(m, ...a),
      error: (m, ...a) => ctx.error(m, ...a),
    });
    ctx.log(`Timer-Sync ok: ${JSON.stringify(result)}`);
  } catch (err) {
    // Bewusst geschluckt: ein API-Ausfall darf den Timer nicht dauerhaft killen.
    ctx.error(`Timer-Sync fehlgeschlagen (wird beim nächsten Lauf erneut versucht): ${String(err)}`);
  }
}

app.timer('syncTimer', {
  schedule: SCHEDULE,
  runOnStartup: false,
  handler: syncTimer,
});
