// Kleine HTTP-Helfer für konsistente JSON-Antworten und Auth-Gating.

import type { HttpRequest, HttpResponseInit } from '@azure/functions';
import { getClientPrincipal, getEmail, isAllowedDomain } from './auth';
import { resolveAdminEmails } from './config';
import type { ClientPrincipal } from './types';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export function json(status: number, body: unknown): HttpResponseInit {
  return { status, headers: JSON_HEADERS, jsonBody: body };
}

export function ok(body: unknown): HttpResponseInit {
  return json(200, body);
}

export function badRequest(message: string): HttpResponseInit {
  return json(400, { error: message });
}

export function forbidden(message = 'Kein Zugriff.'): HttpResponseInit {
  return json(403, { error: message });
}

export function unauthorized(message = 'Nicht angemeldet.'): HttpResponseInit {
  return json(401, { error: message });
}

export function locked(message = 'Tipp ist gesperrt.'): HttpResponseInit {
  return json(423, { error: message });
}

export interface AuthContext {
  principal: ClientPrincipal;
  email: string;
}

/**
 * Stellt sicher, dass eine gültige Session mit erlaubter Domain vorliegt.
 * @returns AuthContext oder eine fertige Fehlerantwort.
 */
export function requireAuth(req: HttpRequest): AuthContext | HttpResponseInit {
  const principal = getClientPrincipal(req);
  if (!principal) return unauthorized();
  const email = getEmail(principal);
  if (!isAllowedDomain(email)) {
    return forbidden(
      'Zugriff nur für Konten der Domain einklang-energy.de. Bitte mit dem Firmenkonto anmelden.',
    );
  }
  return { principal, email: email! };
}

export function isErrorResponse(x: AuthContext | HttpResponseInit): x is HttpResponseInit {
  return 'status' in x && typeof (x as HttpResponseInit).status === 'number';
}

/**
 * Wie requireAuth, prüft zusätzlich den Admin-Status (E-Mail in ADMIN_EMAILS).
 * Zweite Verteidigungslinie zusätzlich zur SWA-Rollenbeschränkung auf /api/admin/*.
 */
/**
 * Schützt von externen Schedulern (GitHub Actions) aufgerufene HTTP-Endpunkte
 * über ein geteiltes Geheimnis im Header `x-cron-key` (App-Setting CRON_SECRET).
 * @returns null wenn ok, sonst eine Fehlerantwort.
 */
export function requireCronKey(req: HttpRequest): HttpResponseInit | null {
  const expected = process.env.CRON_SECRET;
  const got = req.headers.get('x-cron-key');
  if (!expected || !got || got !== expected) {
    return unauthorized('Ungültiger oder fehlender Cron-Schlüssel.');
  }
  return null;
}

export async function requireAdmin(req: HttpRequest): Promise<AuthContext | HttpResponseInit> {
  const auth = requireAuth(req);
  if (isErrorResponse(auth)) return auth;
  const admins = await resolveAdminEmails();
  if (!admins.includes(auth.email.toLowerCase())) {
    return forbidden('Diese Funktion ist Administratoren vorbehalten.');
  }
  return auth;
}
