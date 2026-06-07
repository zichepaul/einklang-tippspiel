// Wendet die Punktelogik auf gespeicherte Tipps an. Bewusst idempotent:
// es wird stets der ABSOLUTE Punktwert neu gesetzt (kein Inkrement), damit
// mehrfacher Sync oder erneute Admin-Eingaben keine doppelten Punkte erzeugen.

import { getContainer, CONTAINERS } from './cosmos';
import { scorePrediction, scoreChampionBet } from './scoring';
import { getConfig } from './config';
import type { Match, Prediction, TournamentBet } from './types';

/**
 * Bewertet alle Tipps für eine (beendete) Partie neu.
 * @returns Anzahl der aktualisierten Tipps.
 */
export async function scoreMatchPredictions(match: Match): Promise<number> {
  if (
    match.status !== 'finished' ||
    match.resultHome == null ||
    match.resultAway == null
  ) {
    return 0;
  }

  const config = await getConfig();
  const container = await getContainer(CONTAINERS.predictions);
  const { resources } = await container.items
    .query<Prediction>({
      query: 'SELECT * FROM c WHERE c.matchId = @matchId',
      parameters: [{ name: '@matchId', value: match.id }],
    })
    .fetchAll();

  const nowIso = new Date().toISOString();
  let updated = 0;
  for (const pred of resources) {
    const points = scorePrediction(
      pred.predHome,
      pred.predAway,
      match.resultHome,
      match.resultAway,
      config.pointRules,
    );
    if (pred.points !== points) {
      pred.points = points;
      pred.scoredAt = nowIso;
      await container.items.upsert(pred);
      updated++;
    }
  }
  return updated;
}

/**
 * Bewertet die Weltmeister-Wetten, sobald das Finale beendet ist.
 * Der Sieger ergibt sich aus dem Finalspiel (Ergebnis inkl. ggf. Verlängerung/
 * Elfmeter wird über den `winner` bzw. das 90-Min-Ergebnis bestimmt – siehe
 * Aufrufer, der den tatsächlichen Champion übergibt).
 */
export async function scoreChampionBets(actualChampion: string): Promise<number> {
  const config = await getConfig();
  const container = await getContainer(CONTAINERS.tournamentBets);
  const { resources } = await container.items
    .query<TournamentBet>({ query: 'SELECT * FROM c' })
    .fetchAll();

  let updated = 0;
  for (const bet of resources) {
    const points = scoreChampionBet(bet.championTeam, actualChampion, config.championBetPoints);
    if (bet.points !== points) {
      bet.points = points;
      await container.items.upsert(bet);
      updated++;
    }
  }
  return updated;
}
