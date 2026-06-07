import { describe, it, expect } from 'vitest';
import { buildLeaderboard } from './leaderboard';

describe('buildLeaderboard – Sortierung & Gleichstand', () => {
  it('sortiert nach Gesamtpunkten absteigend', () => {
    const rows = buildLeaderboard([
      { userId: 'a', displayName: 'Anna', totalPoints: 10, exactHits: 1, tendencyHits: 3 },
      { userId: 'b', displayName: 'Bert', totalPoints: 25, exactHits: 2, tendencyHits: 5 },
    ]);
    expect(rows.map((r) => r.userId)).toEqual(['b', 'a']);
    expect(rows[0].rank).toBe(1);
    expect(rows[1].rank).toBe(2);
  });

  it('bricht Gleichstand über exakte Treffer', () => {
    const rows = buildLeaderboard([
      { userId: 'a', displayName: 'Anna', totalPoints: 20, exactHits: 2, tendencyHits: 6 },
      { userId: 'b', displayName: 'Bert', totalPoints: 20, exactHits: 4, tendencyHits: 6 },
    ]);
    expect(rows[0].userId).toBe('b');
  });

  it('bricht Gleichstand über Tendenztreffer, dann alphabetisch', () => {
    const rows = buildLeaderboard([
      { userId: 'z', displayName: 'Zoe', totalPoints: 20, exactHits: 2, tendencyHits: 8 },
      { userId: 'a', displayName: 'Anna', totalPoints: 20, exactHits: 2, tendencyHits: 8 },
      { userId: 'm', displayName: 'Mark', totalPoints: 20, exactHits: 2, tendencyHits: 5 },
    ]);
    // Anna und Zoe haben mehr Tendenztreffer -> vor Mark; untereinander alphabetisch.
    expect(rows.map((r) => r.displayName)).toEqual(['Anna', 'Zoe', 'Mark']);
  });

  it('teilt bei vollständigem Gleichstand denselben Rang', () => {
    const rows = buildLeaderboard([
      { userId: 'a', displayName: 'Anna', totalPoints: 20, exactHits: 2, tendencyHits: 8 },
      { userId: 'b', displayName: 'Bea', totalPoints: 20, exactHits: 2, tendencyHits: 8 },
      { userId: 'c', displayName: 'Cara', totalPoints: 10, exactHits: 1, tendencyHits: 4 },
    ]);
    expect(rows[0].rank).toBe(1);
    expect(rows[1].rank).toBe(1);
    expect(rows[2].rank).toBe(3);
  });
});
