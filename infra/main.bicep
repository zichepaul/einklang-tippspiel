// Infrastruktur für das Einklang WM-2026-Tippspiel.
// Legt an: Azure Static Web App (Standard, inkl. integrierter Functions) und
// ein serverless Cosmos-DB-Konto mit Datenbank und Containern – alles in der
// EU-Region.
//
// Deploy (Beispiel):
//   az group create -n rg-tippspiel -l westeurope
//   az deployment group create -g rg-tippspiel -f infra/main.bicep \
//     -p adminEmails='paul@einklang-energy.de,lucas@einklang-energy.de' \
//        repositoryUrl='https://github.com/<org>/<repo>' \
//        tournamentStartUtc='2026-06-11T18:00:00Z'
//
// Hinweis: Der Static-Web-App-Deploy-Token sowie die Secrets (AAD_CLIENT_ID,
// AAD_CLIENT_SECRET, FOOTBALL_API_KEY) werden NICHT im Bicep gespeichert,
// sondern nach dem Deploy gesetzt (siehe README).

@description('Region für alle Ressourcen (EU).')
@allowed([
  'westeurope'
  'germanywestcentral'
])
param location string = 'westeurope'

@description('Basisname; daraus werden die Ressourcennamen abgeleitet.')
param appName string = 'einklang-tippspiel'

@description('Static Web Apps ist nicht in jeder Region verfügbar – EU: westeurope.')
@allowed([
  'westeurope'
])
param swaLocation string = 'westeurope'

@description('Komma-separierte Admin-E-Mails (Stamm-Admins).')
param adminEmails string = ''

@description('Erlaubte E-Mail-Domain für den Zugriff.')
param allowedEmailDomain string = 'einklang-energy.de'

@description('Anpfiff Eröffnungsspiel (UTC) – Deadline der Weltmeister-Wette.')
param tournamentStartUtc string = '2026-06-11T18:00:00Z'

@description('Football-Daten-Provider.')
param footballApiProvider string = 'football-data'

@description('Wettbewerbs-Code (football-data.org).')
param footballCompetitionCode string = 'WC'

@description('GitHub-Repo-URL für die SWA-CI/CD-Verknüpfung (optional).')
param repositoryUrl string = ''

@description('Branch für Production-Deploys.')
param branch string = 'main'

var cosmosAccountName = toLower('${appName}-cosmos-${uniqueString(resourceGroup().id)}')
var databaseName = 'tippspiel'
var staticSiteName = '${appName}-swa'

// --- Cosmos DB (serverless, Core/NoSQL) ------------------------------------

resource cosmos 'Microsoft.DocumentDB/databaseAccounts@2024-05-15' = {
  name: cosmosAccountName
  location: location
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    enableFreeTier: false
    capabilities: [
      { name: 'EnableServerless' }
    ]
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    // DSGVO: Daten verbleiben in der gewählten EU-Region.
    disableKeyBasedMetadataWriteAccess: false
  }
}

resource database 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2024-05-15' = {
  parent: cosmos
  name: databaseName
  properties: {
    resource: {
      id: databaseName
    }
  }
}

var containers = [
  { name: 'users', pk: '/id' }
  { name: 'matches', pk: '/id' }
  { name: 'predictions', pk: '/userId' }
  { name: 'tournamentBets', pk: '/userId' }
  { name: 'config', pk: '/id' }
]

resource cosmosContainers 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = [
  for c in containers: {
    parent: database
    name: c.name
    properties: {
      resource: {
        id: c.name
        partitionKey: {
          paths: [c.pk]
          kind: 'Hash'
        }
      }
    }
  }
]

// --- Static Web App (Standard) ---------------------------------------------

resource staticSite 'Microsoft.Web/staticSites@2023-12-01' = {
  name: staticSiteName
  location: swaLocation
  sku: {
    // Standard ist nötig für eigene Entra-App-Registrierung (Single-Tenant)
    // und benannte App-Settings im integrierten Functions-Backend.
    name: 'Standard'
    tier: 'Standard'
  }
  properties: {
    repositoryUrl: empty(repositoryUrl) ? null : repositoryUrl
    branch: empty(repositoryUrl) ? null : branch
    buildProperties: {
      appLocation: '/'
      apiLocation: 'api'
      outputLocation: 'dist'
    }
  }
}

// Nicht-geheime App-Settings für das Functions-Backend.
// Secrets (AAD_CLIENT_ID/SECRET, FOOTBALL_API_KEY, COSMOS_KEY) werden nach dem
// Deploy gesetzt – siehe README. COSMOS_KEY hier per listKeys referenziert.
resource staticSiteSettings 'Microsoft.Web/staticSites/config@2023-12-01' = {
  parent: staticSite
  name: 'appsettings'
  properties: {
    COSMOS_ENDPOINT: cosmos.properties.documentEndpoint
    COSMOS_KEY: cosmos.listKeys().primaryMasterKey
    COSMOS_DATABASE: databaseName
    ADMIN_EMAILS: adminEmails
    ALLOWED_EMAIL_DOMAIN: allowedEmailDomain
    TOURNAMENT_START_UTC: tournamentStartUtc
    CHAMPION_BET_POINTS: '15'
    FOOTBALL_API_PROVIDER: footballApiProvider
    FOOTBALL_COMPETITION_CODE: footballCompetitionCode
    // Per CLI/Portal nachtragen (Secrets):
    //   AAD_CLIENT_ID, AAD_CLIENT_SECRET, FOOTBALL_API_KEY
  }
}

output staticSiteName string = staticSite.name
output staticSiteDefaultHostname string = staticSite.properties.defaultHostname
output cosmosAccountName string = cosmos.name
output cosmosEndpoint string = cosmos.properties.documentEndpoint
