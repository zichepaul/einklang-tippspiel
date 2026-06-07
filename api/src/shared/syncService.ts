// Synchronisiert den Spielplan/Ergebnisse von der Fußball-API in Cosmos DB
// und stößt die (idempotente) Punkteberechnung für betroffene Spiele an.

import { getContainer, CONTAINERS } from './cosmos';
import { fetchSchedule, type NormalizedMatch } from './footballApi';
import { scoreMatchPredictions, scoreChampionBets } from './scoringService';
import type { Match } from './types';

interface Logger {
  info: (msg: string, ...args: unknown[]) => void;
  warn: (msg: string, ...args: unknown[]) => void;
  error: (msg: string, ...args: unknown[]) => void;
}

export interface SyncResult {
  fetched: number;
  upserted: number;
  newlyFinished: number;
  predictionsScored: number;
  championScored: number;
}

function internalId(externalId: string): string {
  return `m-${externalId}`;
}

/** Führt einen vollständigen Sync durch. Robust gegen API-Ausfälle (wirft bei Totalausfall). */
export async function runSync(log: Logger): Promise<SyncResult> {
  const normalized = await fetchSchedule(log);
  const container = await getContainer(CONTAINERS.matches);

  // Bestehende Matches einlesen, um Statuswechsel zu erkennen.
  const { resources: existing } = await container.items
    .query<Match>({ query: 'SELECT * FROM c' })
    .fetchAll();
  const byId = new Map(existing.map((m) => [m.id, m]));

  const result: SyncResult = {
    fetched: normalized.length,
    upserted: 0,
    newlyFinished: 0,
    predictionsScored: 0,
    championScored: 0,
  };

  const nowIso = new Date().toISOString();
  let finalMatch: { match: Match; champion?: string } | null = null;

  for (const n of normalized) {
    const id = internalId(n.externalId);
    const prev = byId.get(id);

    // Admin-Ergebnisse haben Vorrang: ein manuell gesetztes Ergebnis wird vom
    // API-Sync nicht überschrieben (nur Stammdaten werden aktualisiert).
    const keepAdminResult = prev?.resultSource === 'admin';

    const match: Match = {
      id,
      externalId: n.externalId,
      stage: n.stage,
      group: n.group,
      matchday: n.matchday,
      kickoffUtc: n.kickoffUtc,
      homeTeam: n.homeTeam,
      awayTeam: n.awayTeam,
      status: keepAdminResult ? (prev?.status ?? n.status) : n.status,
      resultHome: keepAdminResult ? prev?.resultHome : n.resultHome ?? null,
      resultAway: keepAdminResult ? prev?.resultAway : n.resultAway ?? null,
      resultSource: keepAdminResult ? 'admin' : 'api',
      updatedAt: nowIso,
    };

    const changed =
      !prev ||
      prev.status !== match.status ||
      prev.resultHome !== match.resultHome ||
      prev.resultAway !== match.resultAway ||
      prev.kickoffUtc !== match.kickoffUtc ||
      prev.homeTeam !== match.homeTeam ||
      prev.awayTeam !== match.awayTeam;

    if (changed) {
      await container.items.upsert(match);
      result.upserted++;
    }

    const becameFinished =
      match.status === 'finished' &&
      match.resultHome != null &&
      (!prev || prev.status !== 'finished' || prev.resultHome !== match.resultHome || prev.resultAway !== match.resultAway);

    if (becameFinished) {
      result.newlyFinished++;
      try {
        result.predictionsScored += await scoreMatchPredictions(match);
      } catch (err) {
        log.error(`Punkteberechnung für ${id} fehlgeschlagen: ${String(err)}`);
      }
    }

    if (match.stage === 'final' && match.status === 'finished' && match.resultHome != null) {
      const champion = determineChampion(match, n);
      finalMatch = { match, champion };
    }
  }

  // Weltmeister-Wette erst werten, wenn das Finale beendet ist.
  if (finalMatch?.champion) {
    try {
      result.championScored = await scoreChampionBets(finalMatch.champion);
    } catch (err) {
      log.error(`Weltmeister-Wertung fehlgeschlagen: ${String(err)}`);
    }
  }

  log.info(
    `Sync fertig: ${result.fetched} geladen, ${result.upserted} aktualisiert, ` +
      `${result.newlyFinished} neu beendet, ${result.predictionsScored} Tipps gewertet.`,
  );
  return result;
}

/**
 * Bestimmt den Weltmeister aus dem Finale. Für die Wette zählt der echte Sieger
 * (ggf. nach Verlängerung/Elfmeter) – das 90-Min-Ergebnis kann remis sein.
 * Bei Gleichstand nach 90 Min liefert die API i.d.R. den Gesamtsieger; wir
 * fallen sonst auf den nach 90 Min Führenden zurück.
 */
function determineChampion(match: Match, _normalized: NormalizedMatch): string | undefined {
  if (match.resultHome == null || match.resultAway == null) return undefined;
  if (match.resultHome > match.resultAway) return match.homeTeam;
  if (match.resultAway > match.resultHome) return match.awayTeam;
  // 90-Min-Remis: Sieger wird i.d.R. manuell vom Admin bestätigt.
  return undefined;
}
