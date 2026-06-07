// Auth-Helfer: liest und validiert das von Azure Static Web Apps injizierte
// `x-ms-client-principal`-Header (Base64-kodiertes JSON) und stellt sicher,
// dass nur Konten der erlaubten Domain Zugriff erhalten.

import type { HttpRequest } from '@azure/functions';
import type { ClientPrincipal } from './types';

const ALLOWED_DOMAIN = (process.env.ALLOWED_EMAIL_DOMAIN ?? 'einklang-energy.de').toLowerCase();

export function getClientPrincipal(req: HttpRequest): ClientPrincipal | null {
  const header = req.headers.get('x-ms-client-principal');
  if (!header) return null;
  try {
    const decoded = Buffer.from(header, 'base64').toString('utf-8');
    const principal = JSON.parse(decoded) as ClientPrincipal;
    if (!principal?.userId) return null;
    return principal;
  } catch {
    return null;
  }
}

/** Extrahiert die E-Mail aus den Token-Claims, mit userDetails als Fallback. */
export function getEmail(principal: ClientPrincipal): string | null {
  const claimEmail = principal.claims?.find((c) =>
    ['emails', 'email', 'preferred_username', 'upn'].includes(c.typ),
  )?.val;
  const email = claimEmail ?? principal.userDetails;
  return email ? email.toLowerCase() : null;
}

/** Anzeigename aus den Claims (name), Fallback auf den lokalen Teil der E-Mail. */
export function getDisplayName(principal: ClientPrincipal): string {
  const nameClaim = principal.claims?.find((c) => c.typ === 'name')?.val;
  if (nameClaim) return nameClaim;
  const email = getEmail(principal);
  return email ? email.split('@')[0] : principal.userDetails;
}

export function isAllowedDomain(email: string | null): boolean {
  if (!email) return false;
  return email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`);
}

export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}
