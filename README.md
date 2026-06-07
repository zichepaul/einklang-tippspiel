# Einklang Tippspiel · WM 2026

Internes Tippspiel zur FIFA-Weltmeisterschaft 2026 (USA/Kanada/Mexiko, 11. Juni – 19. Juli 2026,
48 Teams, 104 Spiele) für die Mitarbeitenden von **Einklang Energy**. Anmeldung mit dem
Microsoft-Firmenkonto, Ergebnis- und Weltmeister-Tipps, automatische Punkteberechnung und
Live-Rangliste. UI-Sprache: Deutsch.

> Hinweis: Anmeldung ausschließlich für Konten der Domain `einklang-energy.de`.

---

## Tech-Stack

| Schicht        | Technologie                                                       |
| -------------- | ----------------------------------------------------------------- |
| Hosting        | Azure Static Web Apps (Standard, EU-Region)                       |
| Frontend       | React + Vite + TypeScript                                         |
| Backend        | Azure Functions (Node.js 20, TypeScript, v4-Modell) unter `/api`  |
| Datenbank      | Azure Cosmos DB (serverless, Core/NoSQL)                          |
| Auth           | Microsoft Entra ID (Single-Tenant) über das native SWA-Auth-Feature |
| CI/CD          | GitHub Actions → Azure Static Web Apps (Push auf `main`)          |

---

## Projektstruktur

```
.
├── index.html                       # Vite-Einstiegspunkt
├── src/                             # React-Frontend
│   ├── pages/                       # Login, Tippen, Weltmeister, Spielplan, Rangliste, Profil, Admin
│   ├── components/                  # Layout, Logo, MatchCard, Toast, ErrorBoundary
│   └── lib/                         # API-Client, Auth-Hook, Formatierung, Typen
├── api/                             # Azure Functions
│   ├── src/functions/               # HTTP- & Timer-Funktionen
│   ├── src/shared/                  # Punktelogik, Deadlines, Cosmos, Sync, Auth …
│   ├── scripts/seed.ts              # Spielplan-Import
│   └── src/shared/*.test.ts         # Unit-Tests (Punkte & Deadlines)
├── infra/main.bicep                 # Azure-Infrastruktur
├── staticwebapp.config.json         # Routing, Auth, Rollen, Security-Header
└── .github/workflows/               # CI/CD (Build, Test, Deploy)
```

---

## Lokale Entwicklung

Voraussetzungen: Node.js 20+, [Azure Functions Core Tools v4](https://learn.microsoft.com/azure/azure-functions/functions-run-local),
optional [SWA CLI](https://azure.github.io/static-web-apps-cli/) für das vollständige Auth-/Proxy-Erlebnis.

```bash
# 1) Abhängigkeiten
npm install
npm --prefix api install

# 2) Backend-Konfiguration
cp api/local.settings.json.example api/local.settings.json
#   → COSMOS_*, FOOTBALL_API_KEY, ADMIN_EMAILS etc. eintragen

# 3) Unit-Tests (Punkte- & Deadline-Logik)
npm --prefix api test

# 4) Frontend + API gemeinsam starten (SWA-Emulator, inkl. /.auth)
npm install -g @azure/static-web-apps-cli
npm run swa            # startet Vite, Functions und den Auth-Emulator auf :4280
```

Alternativ getrennt: `npm run dev` (Frontend, :5173) und in `api/` `npm start` (Functions, :7071).
Der Vite-Dev-Proxy leitet `/api` und `/.auth` weiter.

> Beim lokalen SWA-Emulator können Sie eine beliebige Test-Identität mit E-Mail
> `…@einklang-energy.de` anlegen, um die Domain-Beschränkung zu testen.

---

## Setup in Azure — Schritt für Schritt

### 1. Azure-Ressourcen anlegen (Bicep)

```bash
az login
az group create -n rg-tippspiel -l westeurope

az deployment group create -g rg-tippspiel -f infra/main.bicep \
  -p adminEmails='paul@einklang-energy.de,lucas@einklang-energy.de' \
     tournamentStartUtc='2026-06-11T18:00:00Z' \
     repositoryUrl='https://github.com/<org>/<repo>'
```

Das legt die Static Web App (Standard) sowie das serverlose Cosmos-DB-Konto inkl. Datenbank und
Containern an und schreibt die nicht-geheimen App-Settings (inkl. `COSMOS_KEY` via `listKeys`).

### 2. Entra-App-Registrierung (Single-Tenant + Domain-Beschränkung)

1. **Azure Portal → Microsoft Entra ID → App-Registrierungen → Neue Registrierung**
   - Name: `Einklang Tippspiel`
   - Unterstützte Kontotypen: **Nur Konten in diesem Organisationsverzeichnis (Single-Tenant)**
   - Redirect-URI (Web): `https://<swa-hostname>/.auth/login/aad/callback`
2. **Zertifikate & Geheimnisse → Neuer geheimer Clientschlüssel** → Wert kopieren.
3. **Token-Konfiguration** → optionalen Claim `email` ergänzen (sowie `upn`), damit die Domain
   serverseitig geprüft werden kann.
4. Notieren: **Anwendungs-(Client-)ID** und **Verzeichnis-(Mandanten-)ID**.

Die Single-Tenant-Registrierung sorgt bereits dafür, dass nur Konten Ihres Tenants anmelden
können. Zusätzlich prüft das Backend (`ALLOWED_EMAIL_DOMAIN`) die Domain `einklang-energy.de` und
zeigt nicht-berechtigten Nutzern eine klare Fehlermeldung.

### 3. `staticwebapp.config.json` anpassen

Tenant-ID eintragen:

```json
"openIdIssuer": "https://login.microsoftonline.com/<TENANT_ID>/v2.0"
```

### 4. Secrets als App-Settings hinterlegen

Der **Football-API-Key wird ausschließlich serverseitig** als App-Setting gespeichert, niemals im
Frontend.

```bash
az staticwebapp appsettings set -n <swa-name> --setting-names \
  AAD_CLIENT_ID=<client-id> \
  AAD_CLIENT_SECRET=<client-secret> \
  FOOTBALL_API_KEY=<football-data-token>
```

### 5. CI/CD verbinden

- Im Azure-Portal der Static Web App **Deployment-Token** kopieren und als GitHub-Secret
  `AZURE_STATIC_WEB_APPS_API_TOKEN` hinterlegen.
- Push auf `main` löst den Workflow aus: Unit-Tests → Build → Deploy
  (`.github/workflows/azure-static-web-apps.yml`).

### 6. Spielplan importieren (Seed)

```bash
# Variante A: kompletter Spielplan von der Fußball-API
npm run seed

# Variante B: statischer Import (falls die API die WM 2026 noch nicht abdeckt)
npm --prefix api run seed -- --file scripts/sample-schedule.json
```

Danach synchronisiert die Timer-Funktion Ergebnisse automatisch; ein manueller Sync ist im
Admin-Bereich möglich.

---

## Fußball-Daten-API

- **Primär:** [football-data.org](https://www.football-data.org/) – Wettbewerbs-Code über
  `FOOTBALL_COMPETITION_CODE` (z. B. `WC`). `score.fullTime` liefert das **90-Minuten-Ergebnis**
  (Verlängerung/Elfmeter stehen separat) – genau wie vom Regelwerk gefordert.
- **Alternativ:** [API-Football](https://www.api-football.com/) – `FOOTBALL_API_PROVIDER=api-football`,
  zusätzlich `FOOTBALL_LEAGUE_ID` / `FOOTBALL_SEASON`.

> **Vor dem Turnier prüfen:** Deckt der gewählte (kostenlose) Tarif die WM 2026 inkl. aller 104
> Spiele und der 90-Minuten-Ergebnisse ab? Der Provider ist in `api/src/shared/footballApi.ts`
> gekapselt und leicht austauschbar. Bis dahin lässt sich der Spielplan über den statischen Import
> (Variante B) befüllen und per Admin-Bereich pflegen.

API-Aufrufe laufen **immer serverseitig** (Timer- bzw. Admin-Funktion); der Key wird nie an den
Client ausgeliefert.

---

## Tests

```bash
npm --prefix api test
```

Abgedeckt: Punktelogik (4/3/2, Tordifferenz nur bei Nicht-Remis, Tendenz, Weltmeister-Wette,
konfigurierbare Regeln), Deadline-/Sperrlogik (Spiel & Weltmeister-Wette) sowie die
Ranglisten-Sortierung inkl. Gleichstandsregel. Die Tests laufen auch in der CI vor jedem Deploy.

---

## Datenschutz (DSGVO)

- Gespeichert werden **nur** Anzeigename und E-Mail aus dem Firmenkonto (plus optionaler Spitzname).
- Keine externen Tracker/Analytics. Alle Ressourcen in der EU-Region (West Europe).
- Ein kurzer Datenschutzhinweis ist im App-Footer eingebunden.

Weitere Dokumentation: [Punktelogik](docs/punktelogik.md) · [Admin-Funktionen](docs/admin.md).
