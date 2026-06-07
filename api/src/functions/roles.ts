// SWA `rolesSource`-Endpunkt: weist beim Login dynamisch die Rolle "admin" zu.
// Wird von Static Web Apps serverseitig aufgerufen (nicht vom Browser) und ist
// daher bewusst anonym. Admin-Status basiert auf der konfigurierten ADMIN_EMAILS-Liste.

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { resolveAdminEmails } from '../shared/config';

interface RolesRequest {
  identityProvider: string;
  userId: string;
  userDetails: string;
  claims?: { typ: string; val: string }[];
}

export async function rolesHandler(
  req: HttpRequest,
  _ctx: InvocationContext,
): Promise<HttpResponseInit> {
  let body: RolesRequest;
  try {
    body = (await req.json()) as RolesRequest;
  } catch {
    return { status: 200, jsonBody: { roles: [] } };
  }

  const emailClaim =
    body.claims?.find((c) =>
      ['emails', 'email', 'preferred_username', 'upn'].includes(c.typ),
    )?.val ?? body.userDetails;
  const email = (emailClaim ?? '').toLowerCase();

  const roles: string[] = [];
  if ((await resolveAdminEmails()).includes(email)) {
    roles.push('admin');
  }
  return { status: 200, jsonBody: { roles } };
}

app.http('roles', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'roles',
  handler: rolesHandler,
});
