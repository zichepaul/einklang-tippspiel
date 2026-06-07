// Deadline- und Sperrlogik – rein funktional und damit gut testbar.
//
// - Spieltipp: abgebbar/änderbar bis zum Anpfiff der jeweiligen Partie.
// - Weltmeister-Tipp: abgebbar/änderbar bis zum Anpfiff des Eröffnungsspiels.
// - Fremde Tipps werden erst NACH Anpfiff des jeweiligen Spiels sichtbar.

/**
 * Ist der Tipp für eine Partie gesperrt?
 * Gesperrt = aktuelle Zeit liegt am oder nach dem Anpfiff.
 */
export function isMatchLocked(kickoffUtc: string, now: Date = new Date()): boolean {
  const kickoff = new Date(kickoffUtc).getTime();
  return now.getTime() >= kickoff;
}

/** Ist die Weltmeister-Wette gesperrt? Stichtag: Anpfiff Eröffnungsspiel. */
export function isChampionBetLocked(
  tournamentStartUtc: string,
  now: Date = new Date(),
): boolean {
  return now.getTime() >= new Date(tournamentStartUtc).getTime();
}

/**
 * Dürfen fremde Tipps zu dieser Partie angezeigt werden?
 * Erst ab Anpfiff (= sobald die Partie für alle gesperrt ist).
 */
export function arePredictionsVisible(kickoffUtc: string, now: Date = new Date()): boolean {
  return isMatchLocked(kickoffUtc, now);
}
