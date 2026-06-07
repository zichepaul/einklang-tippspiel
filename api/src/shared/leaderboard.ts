// Ranglisten-Berechnung – rein funktional.
//
// Sortierung nach Gesamtpunkten (inkl. Weltmeister-Wette). Bei Gleichstand:
//   (1) mehr exakte Ergebnistreffer
//   (2) mehr Tendenztreffer
//   (3) alphabetisch nach Anzeigename
//
// "Tendenztreffer" zählt hier alle Tipps mit korrekter Tendenz, also auch
// exakte und Tordifferenz-Treffer (diese sind ja ebenfalls tendenziell richtig).

export interface LeaderboardInput {
  userId: string;
  displayName: string; // Spitzname oder echter Name (vom Aufrufer aufgelöst)
  totalPoints: number;
  exactHits: number;
  tendencyHits: number;
}

export interface LeaderboardRow extends LeaderboardInput {
  rank: number;
}

export function buildLeaderboard(entries: LeaderboardInput[]): LeaderboardRow[] {
  const sorted = [...entries].sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.exactHits !== a.exactHits) return b.exactHits - a.exactHits;
    if (b.tendencyHits !== a.tendencyHits) return b.tendencyHits - a.tendencyHits;
    return a.displayName.localeCompare(b.displayName, 'de');
  });

  // Echte Plätze: Teilnehmer mit identischen Tie-Break-Kriterien teilen sich den Rang.
  const rows: LeaderboardRow[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const e = sorted[i];
    const prev = rows[i - 1];
    const prevRaw = sorted[i - 1];
    const tied =
      prev &&
      prevRaw.totalPoints === e.totalPoints &&
      prevRaw.exactHits === e.exactHits &&
      prevRaw.tendencyHits === e.tendencyHits;
    rows.push({ ...e, rank: tied ? prev.rank : i + 1 });
  }
  return rows;
}
