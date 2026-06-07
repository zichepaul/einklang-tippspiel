// GET /api/admin/users        – alle Nutzer auflisten
// PUT /api/admin/users         – Admin-Liste verwalten (E-Mail als Admin setzen/entfernen)
//   Body: { email, isAdmin }   – schreibt in das Config-Dokument (adminEmails)

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAdmin, isErrorResponse, ok, badRequest } from '../shared/http';
import { getContainer, CONTAINERS } from '../shared/cosmos';
import { getConfig } from '../shared/config';
import { getAdminEmails } from '../shared/auth';
import type { AppConfig, User } from '../shared/types';

export async function adminUsersHandler(
  req: HttpRequest,
  ctx: InvocationContext,
): Promise<HttpResponseInit> {
  const auth = await requireAdmin(req);
  if (isErrorResponse(auth)) return auth;

  const usersC = await getContainer(CONTAINERS.users);
  const configC = await getContainer(CONTAINERS.config);

  if (req.method === 'GET') {
    const config = await getConfig();
    const { resources: users } = await usersC.items
      .query<User>({ query: 'SELECT * FROM c' })
      .fetchAll();
    return ok({
      users: users
        .map((u) => ({
          id: u.id,
          displayName: u.displayName,
          email: u.email,
          nickname: u.nickname ?? null,
          isAdmin: config.adminEmails.includes(u.email.toLowerCase()),
          createdAt: u.createdAt,
        }))
        .sort((a, b) => a.displayName.localeCompare(b.displayName, 'de')),
      adminEmails: config.adminEmails,
      // ENV-Admins sind fest und können nicht über die UI entfernt werden.
      protectedAdmins: getAdminEmails(),
    });
  }

  // PUT – Admin-Status per E-Mail setzen
  const body = (await req.json().catch(() => null)) as { email?: string; isAdmin?: boolean } | null;
  const email = (body?.email ?? '').trim().toLowerCase();
  if (!email || typeof body?.isAdmin !== 'boolean') {
    return badRequest('Bitte E-Mail und isAdmin (true/false) angeben.');
  }
  if (getAdminEmails().includes(email) && !body.isAdmin) {
    return badRequest('Stamm-Admins (über App-Settings) können hier nicht entfernt werden.');
  }

  const { resource } = await configC.item('config', 'config').read<AppConfig>();
  const base = resource ?? (await getConfig());
  const set = new Set((base.adminEmails ?? []).map((e) => e.toLowerCase()));
  // ENV-Admins nicht doppelt im Dokument speichern.
  for (const e of getAdminEmails()) set.delete(e);
  if (body.isAdmin) set.add(email);
  else set.delete(email);

  const updated: AppConfig = { ...base, id: 'config', adminEmails: [...set] };
  await configC.items.upsert(updated);

  // Den betroffenen Nutzer (falls bereits eingeloggt) direkt aktualisieren.
  // id ist die SWA-userId, nicht die E-Mail – daher Query statt Direktzugriff.
  const { resources: match } = await usersC.items
    .query<User>({ query: 'SELECT * FROM c WHERE LOWER(c.email) = @e', parameters: [{ name: '@e', value: email }] })
    .fetchAll();
  for (const u of match) {
    u.isAdmin = body.isAdmin || getAdminEmails().includes(email);
    await usersC.items.upsert(u);
  }

  ctx.log(`Admin ${auth.email} setzte isAdmin=${body.isAdmin} für ${email}`);
  return ok({ email, isAdmin: body.isAdmin, adminEmails: updated.adminEmails });
}

app.http('adminUsers', {
  methods: ['GET', 'PUT'],
  authLevel: 'anonymous',
  route: 'admin/users',
  handler: adminUsersHandler,
});
