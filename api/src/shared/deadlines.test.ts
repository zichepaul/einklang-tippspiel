import { describe, it, expect } from 'vitest';
import { isMatchLocked, isChampionBetLocked, arePredictionsVisible } from './deadlines';

const kickoff = '2026-06-15T16:00:00Z';

describe('isMatchLocked', () => {
  it('ist offen vor dem Anpfiff', () => {
    expect(isMatchLocked(kickoff, new Date('2026-06-15T15:59:59Z'))).toBe(false);
  });

  it('ist exakt zum Anpfiff gesperrt', () => {
    expect(isMatchLocked(kickoff, new Date('2026-06-15T16:00:00Z'))).toBe(true);
  });

  it('ist nach dem Anpfiff gesperrt', () => {
    expect(isMatchLocked(kickoff, new Date('2026-06-15T16:00:01Z'))).toBe(true);
  });

  it('ist eine Sekunde vorher noch offen', () => {
    expect(isMatchLocked(kickoff, new Date('2026-06-15T15:00:00Z'))).toBe(false);
  });
});

describe('isChampionBetLocked', () => {
  const start = '2026-06-11T18:00:00Z';

  it('ist vor dem Eröffnungsspiel offen', () => {
    expect(isChampionBetLocked(start, new Date('2026-06-11T17:59:00Z'))).toBe(false);
  });

  it('ist ab Anpfiff des Eröffnungsspiels gesperrt', () => {
    expect(isChampionBetLocked(start, new Date('2026-06-11T18:00:00Z'))).toBe(true);
    expect(isChampionBetLocked(start, new Date('2026-07-01T00:00:00Z'))).toBe(true);
  });
});

describe('arePredictionsVisible', () => {
  it('verbirgt fremde Tipps vor dem Anpfiff', () => {
    expect(arePredictionsVisible(kickoff, new Date('2026-06-15T15:59:59Z'))).toBe(false);
  });

  it('gibt fremde Tipps ab Anpfiff frei', () => {
    expect(arePredictionsVisible(kickoff, new Date('2026-06-15T16:00:00Z'))).toBe(true);
  });
});
