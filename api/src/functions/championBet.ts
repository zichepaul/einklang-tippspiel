// GET /api/champion – eigene Weltmeister-Wette + verfügbare Teams
// PUT /api/champion – Weltmeister setzen/ändern (nur bis Anpfiff Eröffnungsspiel)

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import {
  requireAuth,
  isErrorResponse,
  ok,
  badRequest,
  locked,
} from '../shared/http';
import { getOrCreateUser } from '../shared/userService';
import { getContainer, CONTAINERS } from '../shared/cosmos';
import { getConfig } from '../shared/config';
import { isChampionBetLocked } from '../shared/deadlines';
import type { Match, TournamentBet } from '../shared/types';

/** Alle in der Gruppenphase angesetzten Teams – die Auswahlmenge für den WM-Tipp. */
async function getTeams(): Promise<string[]> {
  const matchesC = await getContainer(CONTAINERS.matches);
  const { resources } = await matchesC.items
    .query<Match>({ query: "SELECT c.homeTeam, c.awayTeam FROM c WHERE c.stage = 'group'" })
    .fetchAll();
  const set = new Set<string>();
  for (const m of resources) {
    if (m.homeTeam && m.homeTeam !== 'TBD') set.add(m.homeTeam);
    if (m.awayTeam && m.awayTeam !== 'TBD') set.add(m.awayTeam);
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'de'));
}

export async function championHandler(
  req: HttpRequest,
  _ctx: InvocationContext,
): Promise<HttpResponseInit> {
  const auth = requireAuth(req);
  if (isErrorResponse(auth)) return auth;
  const me = await getOrCreateUser(auth.principal, auth.email);

  const config = await getConfig();
  const betsC = await getContainer(CONTAINERS.tournamentBets);
  const lockedNow = isChampionBetLocked(config.tournamentStartUtc);

  if (req.method === 'GET') {
    const { resource } = await betsC.item(me.id, me.id).read<TournamentBet>();
    const teams = await getTeams();
    return ok({
      championTeam: resource?.championTeam ?? null,
      points: resource?.points ?? null,
      locked: lockedNow,
      tournamentStartUtc: config.tournamentStartUtc,
      championBetPoints: config.championBetPoints,
      teams,
    });
  }

  // PUT
  if (lockedNow) {
    return locked('Die Weltmeister-Wette ist seit dem Anpfiff des Eröffnungsspiels gesperrt.');
  }
  const body = (await req.json().catch(() => null)) as { championTeam?: string } | null;
  const championTeam = (body?.championTeam ?? '').trim();
  if (!championTeam) return badRequest('Bitte ein Team auswählen.');

  const teams = await getTeams();
  if (teams.length > 0 && !teams.includes(championTeam)) {
    return badRequest('Unbekanntes Team.');
  }

  const bet: TournamentBet = {
    id: me.id,
    userId: me.id,
    championTeam,
    points: null,
    submittedAt: new Date().toISOString(),
  };
  await betsC.items.upsert(bet);
  return ok({ championTeam, points: null, locked: false });
}

app.http('champion', {
  methods: ['GET', 'PUT'],
  authLevel: 'anonymous',
  route: 'champion',
  handler: championHandler,
});
