import { describe, it, expect } from 'vitest';
import {
  scorePrediction,
  scoreChampionBet,
  classifyPrediction,
  DEFAULT_POINT_RULES,
} from './scoring';

describe('scorePrediction – 4/3/2-System', () => {
  it('vergibt 4 Punkte für ein exaktes Ergebnis', () => {
    expect(scorePrediction(2, 1, 2, 1)).toBe(4);
    expect(scorePrediction(0, 0, 0, 0)).toBe(4);
    expect(scorePrediction(3, 3, 3, 3)).toBe(4);
  });

  it('vergibt 3 Punkte für richtige Tordifferenz bei Nicht-Unentschieden', () => {
    // Tipp 2:1 (Diff +1), Ergebnis 3:2 (Diff +1), beide Heimsieg
    expect(scorePrediction(2, 1, 3, 2)).toBe(3);
    // Auswärtssieg mit gleicher Differenz
    expect(scorePrediction(1, 2, 2, 3)).toBe(3);
    // größere gleiche Differenz
    expect(scorePrediction(0, 2, 1, 3)).toBe(3);
  });

  it('vergibt KEINE Tordifferenz-Punkte bei Remis (nur Tendenz)', () => {
    // Tipp 1:1, Ergebnis 2:2 -> gleiche Differenz (0), aber Remis => nur Tendenz (2)
    expect(scorePrediction(1, 1, 2, 2)).toBe(2);
    expect(scorePrediction(3, 3, 0, 0)).toBe(2);
  });

  it('vergibt 2 Punkte für richtige Tendenz ohne passende Differenz', () => {
    // Beide Heimsieg, aber andere Differenz
    expect(scorePrediction(1, 0, 3, 0)).toBe(2);
    // Beide Auswärtssieg, andere Differenz
    expect(scorePrediction(0, 1, 0, 3)).toBe(2);
  });

  it('vergibt 0 Punkte bei falscher Tendenz', () => {
    // Heimsieg getippt, Auswärtssieg passiert
    expect(scorePrediction(2, 1, 0, 1)).toBe(0);
    // Remis getippt, Heimsieg passiert
    expect(scorePrediction(1, 1, 2, 1)).toBe(0);
    // Heimsieg getippt, Remis passiert
    expect(scorePrediction(2, 0, 1, 1)).toBe(0);
  });

  it('respektiert abweichende Punkteregeln', () => {
    const rules = { exact: 10, goalDiff: 5, tendency: 3 };
    expect(scorePrediction(2, 1, 2, 1, rules)).toBe(10);
    expect(scorePrediction(2, 1, 3, 2, rules)).toBe(5);
    expect(scorePrediction(1, 0, 4, 0, rules)).toBe(3);
    expect(scorePrediction(2, 1, 0, 1, rules)).toBe(0);
  });

  it('verwendet standardmäßig 4/3/2', () => {
    expect(DEFAULT_POINT_RULES).toEqual({ exact: 4, goalDiff: 3, tendency: 2 });
  });
});

describe('scoreChampionBet – Weltmeister-Wette', () => {
  it('vergibt 15 Punkte bei korrektem Tipp', () => {
    expect(scoreChampionBet('Deutschland', 'Deutschland')).toBe(15);
  });

  it('ist case- und whitespace-tolerant', () => {
    expect(scoreChampionBet('  deutschland ', 'Deutschland')).toBe(15);
    expect(scoreChampionBet('BRASILIEN', 'Brasilien')).toBe(15);
  });

  it('vergibt 0 Punkte bei falschem Tipp', () => {
    expect(scoreChampionBet('Frankreich', 'Argentinien')).toBe(0);
  });

  it('respektiert konfigurierbare Punktzahl', () => {
    expect(scoreChampionBet('Spanien', 'Spanien', 20)).toBe(20);
    expect(scoreChampionBet('Spanien', 'Italien', 20)).toBe(0);
  });
});

describe('classifyPrediction', () => {
  it('klassifiziert korrekt', () => {
    expect(classifyPrediction(2, 1, 2, 1)).toBe('exact');
    expect(classifyPrediction(2, 1, 3, 2)).toBe('goalDiff');
    expect(classifyPrediction(1, 0, 3, 0)).toBe('tendency');
    expect(classifyPrediction(1, 1, 2, 2)).toBe('tendency'); // Remis ohne exakt
    expect(classifyPrediction(2, 1, 0, 1)).toBe('miss');
  });
});
