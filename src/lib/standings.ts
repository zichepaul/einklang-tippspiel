// Berechnung der Gruppentabellen aus den (beendeten) Gruppenspielen.
// Sortierung vereinfacht nach FIFA-Logik: Punkte, Tordifferenz, geschossene Tore,
// dann Teamname. (Direkter Vergleich / Fair-Play als Feinkriterien bleiben außen vor.)

import type { MatchDto } from './types';

export interface StandingRow {
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number; // erzielte Tore
  ga: number; // Gegentore
  gd: number; // Differenz
  points: number;
}

export interface GroupStanding {
  group: string;
  rows: StandingRow[];
}

function blankRow(team: string): StandingRow {
  return { team, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 };
}

export function computeGroupStandings(matches: MatchDto[]): GroupStanding[] {
  const groups = new Map<string, Map<string, StandingRow>>();

  const ensure = (group: string, team: string): StandingRow => {
    if (!groups.has(group)) groups.set(group, new Map());
    const g = groups.get(group)!;
    if (!g.has(team)) g.set(team, blankRow(team));
    return g.get(team)!;
  };

  for (const m of matches) {
    if (m.stage !== 'group' || !m.group) continue;
    if (m.homeTeam === 'TBD' || m.awayTeam === 'TBD') continue;

    // Teams immer registrieren, damit die Tabelle alle 4 Mannschaften zeigt.
    const home = ensure(m.group, m.homeTeam);
    const away = ensure(m.group, m.awayTeam);

    if (m.status !== 'finished' || m.resultHome == null || m.resultAway == null) continue;

    home.played++;
    away.played++;
    home.gf += m.resultHome;
    home.ga += m.resultAway;
    away.gf += m.resultAway;
    away.ga += m.resultHome;

    if (m.resultHome > m.resultAway) {
      home.won++;
      home.points += 3;
      away.lost++;
    } else if (m.resultHome < m.resultAway) {
      away.won++;
      away.points += 3;
      home.lost++;
    } else {
      home.drawn++;
      away.drawn++;
      home.points++;
      away.points++;
    }
  }

  return [...groups.keys()]
    .sort((a, b) => a.localeCompare(b))
    .map((group) => {
      const rows = [...groups.get(group)!.values()];
      rows.forEach((r) => (r.gd = r.gf - r.ga));
      rows.sort(
        (a, b) =>
          b.points - a.points ||
          b.gd - a.gd ||
          b.gf - a.gf ||
          a.team.localeCompare(b.team, 'de'),
      );
      return { group, rows };
    });
}
