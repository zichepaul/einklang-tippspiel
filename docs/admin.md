# Admin-Funktionen

Der Admin-Bereich ist nur für Administratoren sichtbar und erreichbar. Der Zugriff wird
serverseitig über `requireAdmin` abgesichert (Prüfung der E-Mail gegen die effektive Admin-Liste).

> Hinweis zu den Routen: Azure Static Web Apps (Managed Functions) routet zuverlässig nur bei
> kleingeschriebenen Ein-Wort-Funktionsnamen. Die Admin-Endpunkte heißen daher `showconfig`,
> `runsync`, `setresult` und `manageusers` (nicht `admin/...`).

## Wer ist Admin?

- **Stamm-Admins** stehen im App-Setting `ADMIN_EMAILS` (z. B. Paul). Sie sind in der UI
  „geschützt" und können dort nicht entfernt werden.
- **Weitere Admins** (z. B. Lucas) werden zur Laufzeit im Admin-Bereich per E-Mail vergeben und im
  Konfigurationsdokument gespeichert. Die effektive Admin-Liste ist die Vereinigung beider Quellen.

## Funktionen

### 1. Spielplan-Sync auslösen

Lädt Spielplan und Ergebnisse von der Fußball-API und berechnet betroffene Tipps neu. Läuft
zusätzlich automatisch per GitHub-Actions-Cron (alle ~10 Minuten, `.github/workflows/cron.yml` → `/api/cronsync`).
Endpunkt: `POST /api/runsync`.

### 2. Ergebnis manuell setzen / überschreiben

Fallback bei verzögerter oder fehlerhafter API. Es zählt das **90-Minuten-Ergebnis**. Die Eingabe
löst **dieselbe** (idempotente) Punkteberechnung aus wie der Sync. Ein manuell gesetztes Ergebnis
hat Vorrang: der API-Sync überschreibt es nicht (`resultSource = 'admin'`).
Endpunkt: `PUT /api/setresult`.

Beim **Finale** kann der Admin den Weltmeister explizit bestätigen – wichtig, wenn das Spiel erst
nach Verlängerung/Elfmeter entschieden wird (das 90-Min-Ergebnis kann remis sein). Das wertet die
Weltmeister-Wetten.

### 3. Nutzer- & Admin-Verwaltung

Übersicht aller angemeldeten Nutzer; Admin-Rechte per E-Mail vergeben oder entziehen
(Stamm-Admins ausgenommen). Endpunkt: `GET/PUT /api/manageusers`.

### 4. Regel- & Punkte-Konfiguration einsehen

Anzeige von Turnierstart (Deadline der Weltmeister-Wette), Punkteregeln (4/3/2), Punkten der
Weltmeister-Wette und der Admin-Liste. Endpunkt: `GET /api/showconfig`.

## Robustheit

- API-Aufrufe verwenden Retry mit Backoff; ein API-Ausfall bricht den nächsten geplanten Lauf nicht ab.
- Die Punkteberechnung ist idempotent (absolute Werte) – mehrfacher Sync erzeugt keine doppelten
  Punkte.
