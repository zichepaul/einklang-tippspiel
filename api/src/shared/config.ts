// Lädt/erstellt das Singleton-Konfigurationsdokument und stellt die effektive
// Konfiguration bereit (App-Settings haben für Stammdaten Vorrang, das
// Cosmos-Dokument hält die im Admin-Bereich einsehbaren Regeln).

import { getContainer, CONTAINERS } from './cosmos';
import { DEFAULT_POINT_RULES, DEFAULT_CHAMPION_BET_POINTS } from './scoring';
import { getAdminEmails } from './auth';
import type { AppConfig } from './types';

export async function getConfig(): Promise<AppConfig> {
  const container = await getContainer(CONTAINERS.config);
  const { resource } = await container.item('config', 'config').read<AppConfig>();

  const tournamentStartUtc =
    process.env.TOURNAMENT_START_UTC ?? resource?.tournamentStartUtc ?? '2026-06-11T18:00:00Z';
  const championBetPoints = process.env.CHAMPION_BET_POINTS
    ? Number(process.env.CHAMPION_BET_POINTS)
    : (resource?.championBetPoints ?? DEFAULT_CHAMPION_BET_POINTS);

  // Admins: ENV-Liste (Stamm-Admin Paul) vereinigt mit zur Laufzeit im
  // Admin-Bereich ergänzten E-Mails (z.B. Lucas) aus dem Config-Dokument.
  const adminEmails = Array.from(
    new Set([
      ...getAdminEmails(),
      ...(resource?.adminEmails ?? []).map((e) => e.toLowerCase()),
    ]),
  );

  const config: AppConfig = {
    id: 'config',
    tournamentStartUtc,
    pointRules: resource?.pointRules ?? DEFAULT_POINT_RULES,
    championBetPoints,
    adminEmails,
  };
  return config;
}

/** Vereinigte, effektive Admin-Liste (ENV ∪ Cosmos-Config). */
export async function resolveAdminEmails(): Promise<string[]> {
  try {
    return (await getConfig()).adminEmails;
  } catch {
    return getAdminEmails();
  }
}

/** Stellt sicher, dass ein Konfigurationsdokument existiert (z.B. beim Seed). */
export async function ensureConfig(): Promise<AppConfig> {
  const container = await getContainer(CONTAINERS.config);
  const config = await getConfig();
  await container.items.upsert(config);
  return config;
}
