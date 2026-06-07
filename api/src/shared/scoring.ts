// Punktelogik des Tippspiels – rein funktional und damit gut testbar.
//
// Regelwerk (klassisch 4/3/2):
//   - Exaktes Ergebnis              -> 4 Punkte
//   - Richtige Tordifferenz         -> 3 Punkte (nur bei Nicht-Unentschieden)
//   - Richtige Tendenz (Sieger/Remis) -> 2 Punkte
//   - sonst                         -> 0 Punkte
// Alle Spiele werden gleich gewertet (kein K.o.-Multiplikator).
// In K.o.-Runden zählt das Ergebnis nach 90 Min (ohne Verlängerung/Elfmeter);
// dieser Schnitt wird beim Einlesen des Ergebnisses sichergestellt, nicht hier.

import type { PointRules } from './types';

export const DEFAULT_POINT_RULES: PointRules = {
  exact: 4,
  goalDiff: 3,
  tendency: 2,
};

export const DEFAULT_CHAMPION_BET_POINTS = 15;

type Sign = -1 | 0 | 1;

/** Vorzeichen der Tordifferenz: 1 = Heimsieg, -1 = Auswärtssieg, 0 = Remis. */
function outcome(home: number, away: number): Sign {
  if (home > away) return 1;
  if (home < away) return -1;
  return 0;
}

/**
 * Berechnet die Punkte für einen einzelnen Spieltipp.
 *
 * @param predHome   getippte Heimtore
 * @param predAway   getippte Auswärtstore
 * @param resultHome tatsächliche Heimtore (90 Min)
 * @param resultAway tatsächliche Auswärtstore (90 Min)
 * @param rules      Punkteregeln (Default 4/3/2)
 */
export function scorePrediction(
  predHome: number,
  predAway: number,
  resultHome: number,
  resultAway: number,
  rules: PointRules = DEFAULT_POINT_RULES,
): number {
  // 1) Exaktes Ergebnis
  if (predHome === resultHome && predAway === resultAway) {
    return rules.exact;
  }

  const predOutcome = outcome(predHome, predAway);
  const realOutcome = outcome(resultHome, resultAway);

  // Falsche Tendenz -> 0 Punkte. (Schließt auch falsch getipptes Remis aus.)
  if (predOutcome !== realOutcome) {
    return 0;
  }

  // 2) Richtige Tordifferenz – nur sinnvoll bei Nicht-Unentschieden.
  // (Bei Remis ist die Differenz immer 0 und damit identisch zur Tendenz;
  //  ein nicht-exaktes Remis-Tipp gibt deshalb nur Tendenzpunkte.)
  if (realOutcome !== 0 && predHome - predAway === resultHome - resultAway) {
    return rules.goalDiff;
  }

  // 3) Richtige Tendenz
  return rules.tendency;
}

/**
 * Punkte für die Weltmeister-Wette.
 * Teamnamen werden case-insensitiv und ohne Randleerzeichen verglichen.
 */
export function scoreChampionBet(
  championPick: string,
  actualChampion: string,
  championBetPoints: number = DEFAULT_CHAMPION_BET_POINTS,
): number {
  const norm = (s: string) => s.trim().toLowerCase();
  return norm(championPick) === norm(actualChampion) ? championBetPoints : 0;
}

/** Klassifizierung eines Tipps – u.a. für die Gleichstand-Regel der Rangliste. */
export type HitKind = 'exact' | 'goalDiff' | 'tendency' | 'miss';

export function classifyPrediction(
  predHome: number,
  predAway: number,
  resultHome: number,
  resultAway: number,
): HitKind {
  if (predHome === resultHome && predAway === resultAway) return 'exact';
  const predOutcome = outcome(predHome, predAway);
  const realOutcome = outcome(resultHome, resultAway);
  if (predOutcome !== realOutcome) return 'miss';
  if (realOutcome !== 0 && predHome - predAway === resultHome - resultAway) {
    return 'goalDiff';
  }
  return 'tendency';
}
