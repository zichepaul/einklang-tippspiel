/**
 * Seed-/Import-Skript für den WM-2026-Spielplan.
 *
 * Aufruf (im Ordner /api):
 *   npm run seed                 → lädt den kompletten Spielplan von der
 *                                  Fußball-API und schreibt ihn nach Cosmos DB
 *                                  (nutzt dieselbe Sync-Logik wie der Timer).
 *   npm run seed -- --file <pfad> → importiert einen statischen Spielplan
 *                                  (JSON-Array im NormalizedMatch-Format) –
 *                                  praktisch, falls die API die WM 2026 noch
 *                                  nicht abdeckt. Siehe scripts/sample-schedule.json.
 *
 * Voraussetzung: dieselben App-Settings/Umgebungsvariablen wie das Backend
 * (COSMOS_ENDPOINT, COSMOS_KEY, COSMOS_DATABASE, FOOTBALL_*). Lokal werden sie
 * aus api/local.settings.json gelesen, falls vorhanden.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { getContainer, CONTAINERS } from '../src/shared/cosmos';
import { ensureConfig } from '../src/shared/config';
import { runSync } from '../src/shared/syncService';
import type { NormalizedMatch } from '../src/shared/footballApi';
import type { Match } from '../src/shared/types';

// local.settings.json (Functions-Format) in process.env laden, falls vorhanden.
function loadLocalSettings() {
  const p = resolve(__dirname, '..', 'local.settings.json');
  if (existsSync(p)) {
    const { Values } = JSON.parse(readFileSync(p, 'utf-8')) as { Values?: Record<string, string> };
    for (const [k, v] of Object.entries(Values ?? {})) {
      if (process.env[k] === undefined) process.env[k] = v;
    }
    console.log('local.settings.json geladen.');
  }
}

const logger = {
  info: (m: string, ...a: unknown[]) => console.log(m, ...a),
  warn: (m: string, ...a: unknown[]) => console.warn(m, ...a),
  error: (m: string, ...a: unknown[]) => console.error(m, ...a),
};

async function importFromFile(path: string) {
  const raw = readFileSync(resolve(process.cwd(), path), 'utf-8');
  const matches = JSON.parse(raw) as NormalizedMatch[];
  console.log(`${matches.length} Partien aus Datei importieren...`);
  const container = await getContainer(CONTAINERS.matches);
  let count = 0;
  for (const n of matches) {
    const doc: Match = {
      id: `m-${n.externalId}`,
      externalId: n.externalId,
      stage: n.stage,
      group: n.group,
      matchday: n.matchday,
      kickoffUtc: n.kickoffUtc,
      homeTeam: n.homeTeam,
      awayTeam: n.awayTeam,
      status: n.status,
      resultHome: n.resultHome ?? null,
      resultAway: n.resultAway ?? null,
      resultSource: 'api',
      updatedAt: new Date().toISOString(),
    };
    await container.items.upsert(doc);
    count++;
  }
  console.log(`${count} Partien importiert.`);
}

async function main() {
  loadLocalSettings();
  console.log('Konfiguration sicherstellen...');
  await ensureConfig();

  const fileIdx = process.argv.indexOf('--file');
  if (fileIdx !== -1 && process.argv[fileIdx + 1]) {
    await importFromFile(process.argv[fileIdx + 1]);
  } else {
    console.log('Spielplan von der Fußball-API laden (runSync)...');
    const result = await runSync(logger);
    console.log('Ergebnis:', result);
  }
  console.log('Seed abgeschlossen.');
}

main().catch((err) => {
  console.error('Seed fehlgeschlagen:', err);
  process.exit(1);
});
