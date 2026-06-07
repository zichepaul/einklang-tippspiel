// Zentrale Datentypen für das Einklang WM-2026-Tippspiel.
// Diese Typen spiegeln das Cosmos-DB-Datenmodell wider.

export type Stage =
  | 'group'
  | 'round32'
  | 'round16'
  | 'quarter'
  | 'semi'
  | 'third_place'
  | 'final';

export type MatchStatus = 'scheduled' | 'live' | 'finished';

/** Cosmos-Container `users` (Partition Key: /id). */
export interface User {
  id: string; // SWA userId (oid/sub aus dem Entra-Token)
  displayName: string;
  email: string;
  nickname?: string;
  isAdmin: boolean;
  createdAt: string; // ISO-8601 UTC
}

/** Cosmos-Container `matches` (Partition Key: /id). */
export interface Match {
  id: string; // intern, z.B. "m-<externalId>"
  externalId: string; // ID der Fußball-API
  stage: Stage;
  group?: string; // "A".."L" – nur in der Gruppenphase
  matchday?: number; // Spieltag (1..3) in der Gruppenphase
  kickoffUtc: string; // ISO-8601 UTC – Anpfiff
  homeTeam: string;
  awayTeam: string;
  status: MatchStatus;
  // Ergebnis NACH 90 Minuten regulärer Spielzeit (ohne Verlängerung/Elfmeter).
  resultHome?: number | null;
  resultAway?: number | null;
  // Quelle des aktuellen Ergebnisses – für Admin-Nachvollziehbarkeit.
  resultSource?: 'api' | 'admin';
  updatedAt?: string;
}

/** Cosmos-Container `predictions` (Partition Key: /userId). */
export interface Prediction {
  id: string; // `${userId}:${matchId}`
  userId: string;
  matchId: string;
  predHome: number;
  predAway: number;
  points: number | null; // null = noch nicht gewertet
  submittedAt: string;
  scoredAt?: string;
}

/** Cosmos-Container `tournamentBets` (Partition Key: /userId). */
export interface TournamentBet {
  id: string; // = userId (genau eine Wette pro Nutzer)
  userId: string;
  championTeam: string;
  points: number | null;
  submittedAt: string;
}

export interface PointRules {
  exact: number; // exaktes Ergebnis
  goalDiff: number; // richtige Tordifferenz (nur bei Nicht-Unentschieden)
  tendency: number; // richtige Tendenz (Sieger/Unentschieden)
}

/** Cosmos-Container `config` – Singleton-Dokument id="config". */
export interface AppConfig {
  id: 'config';
  tournamentStartUtc: string; // Anpfiff Eröffnungsspiel (Deadline Weltmeister-Tipp)
  pointRules: PointRules;
  championBetPoints: number;
  adminEmails: string[];
}

/** Authentifizierter Nutzer aus dem SWA `x-ms-client-principal`-Header. */
export interface ClientPrincipal {
  userId: string;
  userDetails: string; // i.d.R. die E-Mail / UPN
  identityProvider: string;
  userRoles: string[];
  claims?: { typ: string; val: string }[];
}
