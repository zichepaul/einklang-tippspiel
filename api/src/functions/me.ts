// GET  /api/me        – eigenes Profil (legt es beim ersten Login an)
// PUT  /api/me         – Spitzname setzen/ändern

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAuth, isErrorResponse, ok, badRequest } from '../shared/http';
import { getOrCreateUser } from '../shared/userService';
import { getContainer, CONTAINERS } from '../shared/cosmos';
import type { User } from '../shared/types';

export async function meHandler(
  req: HttpRequest,
  _ctx: InvocationContext,
): Promise<HttpResponseInit> {
  const auth = requireAuth(req);
  if (isErrorResponse(auth)) return auth;

  const user = await getOrCreateUser(auth.principal, auth.email);

  if (req.method === 'GET') {
    return ok(toDto(user));
  }

  // PUT – Spitzname aktualisieren
  const body = (await req.json().catch(() => ({}))) as { nickname?: string };
  const nickname = (body.nickname ?? '').trim();
  if (nickname.length > 40) {
    return badRequest('Der Spitzname darf höchstens 40 Zeichen lang sein.');
  }
  const container = await getContainer(CONTAINERS.users);
  user.nickname = nickname || undefined;
  await container.items.upsert(user);
  return ok(toDto(user));
}

function toDto(user: User) {
  return {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    nickname: user.nickname ?? null,
    isAdmin: user.isAdmin,
    rosterName: user.nickname?.trim() || user.displayName,
  };
}

app.http('me', {
  methods: ['GET', 'PUT'],
  authLevel: 'anonymous', // Auth erfolgt über SWA + requireAuth (Domain-Check)
  route: 'me',
  handler: meHandler,
});
