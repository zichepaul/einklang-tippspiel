// Anbindung an die Fußball-Daten-API. Alle Aufrufe laufen serverseitig;
// der API-Key wird ausschließlich aus den App-Settings gelesen.
//
// Primär: football-data.org (Wettbewerbs-Code via FOOTBALL_COMPETITION_CODE, z.B. "WC").
// Alternativ: API-Football (api-sports.io) – als Provider "api-football" wählbar.
//
// WICHTIG vor dem produktiven Einsatz prüfen (siehe README):
//   - Deckt der gewählte Tarif die WM 2026 inkl. aller 104 Spiele ab?
//   - Liefert die API das 90-Minuten-Ergebnis getrennt von Verlängerung/Elfmeter?
// football-data.org liefert in `score.fullTime` das Ergebnis der regulären
// Spielzeit (Verlängerung/Elfmeter stehen separat in extraTime/penalties) –
// genau das, was das Regelwerk fordert.

import type { Stage, MatchStatus } from './types';

export interface NormalizedMatch {
  externalId: string;
  stage: Stage;
  group?: string;
  matchday?: number;
  kickoffUtc: string;
  homeTeam: string;
  awayTeam: string;
  status: MatchStatus;
  // Ergebnis nach 90 Min – nur gesetzt, wenn das Spiel beendet ist.
  resultHome?: number | null;
  resultAway?: number | null;
}

const PROVIDER = process.env.FOOTBALL_API_PROVIDER ?? 'football-data';
const API_KEY = process.env.FOOTBALL_API_KEY ?? '';
const COMPETITION = process.env.FOOTBALL_COMPETITION_CODE ?? 'WC';

interface Logger {
  info: (msg: string, ...args: unknown[]) => void;
  warn: (msg: string, ...args: unknown[]) => void;
  error: (msg: string, ...args: unknown[]) => void;
}

const consoleLogger: Logger = {
  info: (m, ...a) => console.log(m, ...a),
  warn: (m, ...a) => console.warn(m, ...a),
  error: (m, ...a) => console.error(m, ...a),
};

/** fetch mit einfachem Retry (exponentielles Backoff) für robuste Sync-Läufe. */
async function fetchWithRetry(
  url: string,
  init: RequestInit,
  log: Logger,
  retries = 3,
): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, init);
      if (res.status === 429 || res.status >= 500) {
        throw new Error(`Upstream-Status ${res.status}`);
      }
      return res;
    } catch (err) {
      lastErr = err;
      log.warn(`football-api Versuch ${attempt}/${retries} fehlgeschlagen: ${String(err)}`);
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 500 * 2 ** (attempt - 1)));
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('football-api nicht erreichbar');
}

// ---------------------------------------------------------------------------
// football-data.org
// ---------------------------------------------------------------------------

const FD_STAGE_MAP: Record<string, Stage> = {
  GROUP_STAGE: 'group',
  LAST_32: 'round32',
  ROUND_OF_32: 'round32',
  LAST_16: 'round16',
  ROUND_OF_16: 'round16',
  QUARTER_FINALS: 'quarter',
  QUARTER_FINAL: 'quarter',
  SEMI_FINALS: 'semi',
  SEMI_FINAL: 'semi',
  THIRD_PLACE: 'third_place',
  FINAL: 'final',
};

function mapFdStatus(status: string): MatchStatus {
  switch (status) {
    case 'FINISHED':
    case 'AWARDED':
      return 'finished';
    case 'IN_PLAY':
    case 'PAUSED':
    case 'SUSPENDED':
      return 'live';
    default:
      return 'scheduled';
  }
}

interface FdMatch {
  id: number;
  utcDate: string;
  status: string;
  matchday?: number;
  stage: string;
  group?: string | null;
  homeTeam: { name?: string; shortName?: string };
  awayTeam: { name?: string; shortName?: string };
  score?: { fullTime?: { home: number | null; away: number | null } };
}

function normalizeFd(m: FdMatch): NormalizedMatch {
  const status = mapFdStatus(m.status);
  const stage = FD_STAGE_MAP[m.stage] ?? 'group';
  const group = m.group ? m.group.replace(/^Group\s+/i, '').trim() : undefined;
  const out: NormalizedMatch = {
    externalId: String(m.id),
    stage,
    group: stage === 'group' ? group : undefined,
    matchday: m.matchday,
    kickoffUtc: m.utcDate,
    homeTeam: m.homeTeam.name ?? m.homeTeam.shortName ?? 'TBD',
    awayTeam: m.awayTeam.name ?? m.awayTeam.shortName ?? 'TBD',
    status,
  };
  if (status === 'finished' && m.score?.fullTime) {
    out.resultHome = m.score.fullTime.home;
    out.resultAway = m.score.fullTime.away;
  }
  return out;
}

async function fetchFootballData(log: Logger): Promise<NormalizedMatch[]> {
  if (!API_KEY) throw new Error('FOOTBALL_API_KEY fehlt.');
  const url = `https://api.football-data.org/v4/competitions/${COMPETITION}/matches`;
  const res = await fetchWithRetry(url, { headers: { 'X-Auth-Token': API_KEY } }, log);
  if (!res.ok) {
    throw new Error(`football-data.org antwortete mit ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { matches?: FdMatch[] };
  return (data.matches ?? []).map(normalizeFd);
}

// ---------------------------------------------------------------------------
// API-Football (api-sports.io) – alternative Implementierung
// ---------------------------------------------------------------------------

async function fetchApiFootball(log: Logger): Promise<NormalizedMatch[]> {
  if (!API_KEY) throw new Error('FOOTBALL_API_KEY fehlt.');
  // League 1 = WM, Saison 2026. Ggf. an den Tarif anpassen.
  const league = process.env.FOOTBALL_LEAGUE_ID ?? '1';
  const season = process.env.FOOTBALL_SEASON ?? '2026';
  const url = `https://v3.football.api-sports.io/fixtures?league=${league}&season=${season}`;
  const res = await fetchWithRetry(url, { headers: { 'x-apisports-key': API_KEY } }, log);
  if (!res.ok) {
    throw new Error(`api-football antwortete mit ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { response?: ApiFootballFixture[] };
  return (data.response ?? []).map(normalizeApiFootball);
}

interface ApiFootballFixture {
  fixture: { id: number; date: string; status: { short: string } };
  league: { round: string };
  teams: { home: { name: string }; away: { name: string } };
  score: { fulltime: { home: number | null; away: number | null } };
}

function normalizeApiFootball(f: ApiFootballFixture): NormalizedMatch {
  const short = f.fixture.status.short;
  const status: MatchStatus =
    short === 'FT' || short === 'AET' || short === 'PEN'
      ? 'finished'
      : ['1H', '2H', 'HT', 'ET', 'P', 'LIVE'].includes(short)
        ? 'live'
        : 'scheduled';
  const round = f.league.round ?? '';
  let stage: Stage = 'group';
  let group: string | undefined;
  if (/group/i.test(round)) {
    stage = 'group';
    group = round.replace(/.*group\s*/i, '').trim().charAt(0).toUpperCase();
  } else if (/round of 32|last 32/i.test(round)) stage = 'round32';
  else if (/round of 16|last 16|8th/i.test(round)) stage = 'round16';
  else if (/quarter/i.test(round)) stage = 'quarter';
  else if (/semi/i.test(round)) stage = 'semi';
  else if (/3rd place|third/i.test(round)) stage = 'third_place';
  else if (/final/i.test(round)) stage = 'final';

  const out: NormalizedMatch = {
    externalId: String(f.fixture.id),
    stage,
    group,
    kickoffUtc: f.fixture.date,
    homeTeam: f.teams.home.name,
    awayTeam: f.teams.away.name,
    status,
  };
  // api-football: score.fulltime = Ergebnis nach 90 Min (AET/PEN separat).
  if (status === 'finished' && f.score?.fulltime) {
    out.resultHome = f.score.fulltime.home;
    out.resultAway = f.score.fulltime.away;
  }
  return out;
}

// ---------------------------------------------------------------------------

/** Holt den kompletten, normalisierten Spielplan inkl. aktueller Ergebnisse. */
export async function fetchSchedule(log: Logger = consoleLogger): Promise<NormalizedMatch[]> {
  log.info(`Lade Spielplan über Provider "${PROVIDER}"...`);
  const matches =
    PROVIDER === 'api-football' ? await fetchApiFootball(log) : await fetchFootballData(log);
  log.info(`${matches.length} Partien von der API erhalten.`);
  return matches;
}
