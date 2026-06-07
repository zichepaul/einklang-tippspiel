# Admin-Funktionen

Der Admin-Bereich ist nur für Administratoren sichtbar und erreichbar. Der Zugriff ist doppelt
abgesichert: über die SWA-Rollenbeschränkung (`/api/admin/*` erfordert die Rolle `admin`, die beim
Login dynamisch über `/api/roles` vergeben wird) **und** über eine serverseitige Prüfung der
E-Mail gegen die Admin-Liste.

## Wer ist Admin?

- **Stamm-Admins** stehen im App-Setting `ADMIN_EMAILS` (z. B. Paul). Sie sind in der UI
  „geschützt" und können dort nicht entfernt werden.
- **Weitere Admins** (z. B. Lucas) werden zur Laufzeit im Admin-Bereich per E-Mail vergeben und im
  Konfigurationsdokument gespeichert. Die effektive Admin-Liste ist die Vereinigung beider Quellen.

## Funktionen

### 1. Spielplan-Sync auslösen

Lädt Spielplan und Ergebnisse von der Fußball-API und berechnet betroffene Tipps neu. Läuft
zusätzlich automatisch per Timer (`SYNC_SCHEDULE`, Standard alle 10 Minuten).
Endpunkt: `POST /api/admin/sync`.

### 2. Ergebnis manuell setzen / überschreiben

Fallback bei verzögerter oder fehlerhafter API. Es zählt das **90-Minuten-Ergebnis**. Die Eingabe
löst **dieselbe** (idempotente) Punkteberechnung aus wie der Sync. Ein manuell gesetztes Ergebnis
hat Vorrang: der API-Sync überschreibt es nicht (`resultSource = 'admin'`).
Endpunkt: `PUT /api/admin/result`.

Beim **Finale** kann der Admin den Weltmeister explizit bestätigen – wichtig, wenn das Spiel erst
nach Verlängerung/Elfmeter entschieden wird (das 90-Min-Ergebnis kann remis sein). Das wertet die
Weltmeister-Wetten.

### 3. Nutzer- & Admin-Verwaltung

Übersicht aller angemeldeten Nutzer; Admin-Rechte per E-Mail vergeben oder entziehen
(Stamm-Admins ausgenommen). Endpunkt: `GET/PUT /api/admin/users`.

### 4. Regel- & Punkte-Konfiguration einsehen

Anzeige von Turnierstart (Deadline der Weltmeister-Wette), Punkteregeln (4/3/2), Punkten der
Weltmeister-Wette und der Admin-Liste. Endpunkt: `GET /api/admin/config`.

## Robustheit

- API-Aufrufe verwenden Retry mit Backoff; ein API-Ausfall bricht den Timer nicht dauerhaft ab.
- Die Punkteberechnung ist idempotent (absolute Werte) – mehrfacher Sync erzeugt keine doppelten
  Punkte.
