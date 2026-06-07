# Punktelogik

Die gesamte Bewertung ist rein funktional in `api/src/shared/scoring.ts` implementiert und durch
Unit-Tests abgesichert (`scoring.test.ts`). Maßgeblich ist stets das **Ergebnis nach 90 Minuten**
regulärer Spielzeit – Verlängerung und Elfmeterschießen zählen für den Ergebnistipp **nicht**.

## Pro Spiel (klassisch 4/3/2)

| Bedingung                                                        | Punkte |
| --------------------------------------------------------------- | ------ |
| Exaktes Ergebnis getippt                                        | **4**  |
| Richtige Tordifferenz (nur bei Nicht-Unentschieden), nicht exakt | **3**  |
| Richtige Tendenz (Sieger bzw. Unentschieden korrekt)            | **2**  |
| Sonst                                                           | **0**  |

Alle Spiele werden gleich gewertet – **kein Multiplikator** für K.-o.-Runden.

### Beispiele

| Tipp | Ergebnis | Punkte | Begründung                          |
| ---- | -------- | ------ | ----------------------------------- |
| 2:1  | 2:1      | 4      | exakt                               |
| 2:1  | 3:2      | 3      | gleiche Differenz (+1), Heimsieg    |
| 1:0  | 3:0      | 2      | richtige Tendenz, andere Differenz  |
| 1:1  | 2:2      | 2      | Remis korrekt – bei Remis nie 3 Pkt |
| 2:1  | 0:1      | 0      | falsche Tendenz                     |

> Bei einem **Unentschieden** kann es keine 3-Punkte-Wertung geben: Die Tordifferenz ist immer 0
> und damit identisch zur Tendenz – ein nicht-exakt getipptes Remis ergibt daher 2 Punkte.

## Weltmeister-Wette

- Genau **eine** Wette pro Person: der Weltmeister.
- **15 Punkte** bei korrektem Tipp, sonst 0 (`championBetPoints`, konfigurierbar).
- Abgabe/Änderung nur **bis zum Anpfiff des Eröffnungsspiels** (`tournamentStartUtc`), danach
  gesperrt.
- Gewertet wird, sobald das Finale beendet ist. Bei einem 90-Min-Remis im Finale bestätigt der
  Admin den tatsächlichen Sieger (nach Verlängerung/Elfmeter) – siehe [Admin-Funktionen](admin.md).

## Deadlines & Sichtbarkeit

- Jeder Spieltipp ist bis zum **Anpfiff der jeweiligen Partie** abgebbar/änderbar, danach
  automatisch gesperrt (`api/src/shared/deadlines.ts`).
- Nicht abgegebene Tipps = 0 Punkte.
- Die **Tipps anderer** werden erst **nach Anpfiff** des jeweiligen Spiels sichtbar. Vorher sieht
  jede Person nur die eigenen Tipps.

## Rangliste & Gleichstand

Sortierung nach Gesamtpunkten (inkl. Weltmeister-Wette). Bei Gleichstand entscheidet:

1. mehr **exakte** Ergebnistreffer,
2. dann mehr **Tendenztreffer** (jeder Treffer mit > 0 Punkten),
3. dann **alphabetisch** nach Anzeigename.

Implementiert in `api/src/shared/leaderboard.ts`.

## Idempotenz

Die Punkteberechnung setzt stets den **absoluten** Punktwert eines Tipps neu (kein Inkrement).
Mehrfacher Sync oder wiederholte Admin-Eingaben erzeugen daher **keine doppelten Punkte**
(`api/src/shared/scoringService.ts`).
