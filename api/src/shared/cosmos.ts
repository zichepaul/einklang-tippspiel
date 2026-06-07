// Cosmos-DB-Zugriff (Core/NoSQL, serverless). Container werden bei Bedarf
// idempotent angelegt – praktisch für lokale Entwicklung und ersten Deploy.

import { CosmosClient, Container, Database } from '@azure/cosmos';

const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;
const databaseId = process.env.COSMOS_DATABASE ?? 'tippspiel';

let client: CosmosClient | undefined;
let database: Database | undefined;
const containerCache = new Map<string, Container>();

interface ContainerDef {
  id: string;
  partitionKey: string;
}

export const CONTAINERS = {
  users: { id: 'users', partitionKey: '/id' },
  matches: { id: 'matches', partitionKey: '/id' },
  predictions: { id: 'predictions', partitionKey: '/userId' },
  tournamentBets: { id: 'tournamentBets', partitionKey: '/userId' },
  config: { id: 'config', partitionKey: '/id' },
} satisfies Record<string, ContainerDef>;

function getClient(): CosmosClient {
  if (!endpoint || !key) {
    throw new Error(
      'Cosmos-Konfiguration fehlt: COSMOS_ENDPOINT und COSMOS_KEY müssen als App-Settings gesetzt sein.',
    );
  }
  if (!client) {
    client = new CosmosClient({ endpoint, key });
  }
  return client;
}

async function getDatabase(): Promise<Database> {
  if (!database) {
    const { database: db } = await getClient().databases.createIfNotExists({ id: databaseId });
    database = db;
  }
  return database;
}

export async function getContainer(def: ContainerDef): Promise<Container> {
  const cached = containerCache.get(def.id);
  if (cached) return cached;

  const db = await getDatabase();
  const { container } = await db.containers.createIfNotExists({
    id: def.id,
    partitionKey: { paths: [def.partitionKey] },
  });
  containerCache.set(def.id, container);
  return container;
}
