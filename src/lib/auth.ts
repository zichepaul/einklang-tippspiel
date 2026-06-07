// Auth-Hook auf Basis des SWA-Endpunkts /.auth/me sowie des eigenen /api/me.
// Liefert Login-Status, Profil und Domain-Berechtigung.

import { useEffect, useState } from 'react';
import { api, ApiError } from './api';
import type { MeDto } from './types';

const ALLOWED_DOMAIN = 'einklang-energy.de';

interface ClientPrincipal {
  userId: string;
  userDetails: string;
  identityProvider: string;
  userRoles: string[];
  claims?: { typ: string; val: string }[];
}

export type AuthState =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'forbidden'; email: string } // angemeldet, aber falsche Domain
  | { status: 'authenticated'; me: MeDto };

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/.auth/me');
        const data = (await res.json()) as { clientPrincipal: ClientPrincipal | null };
        const principal = data.clientPrincipal;
        if (!principal) {
          if (active) setState({ status: 'anonymous' });
          return;
        }
        const email = extractEmail(principal);
        if (!email || !email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`)) {
          if (active) setState({ status: 'forbidden', email: email ?? principal.userDetails });
          return;
        }
        // Profil laden/anlegen.
        const me = await api.getMe();
        if (active) setState({ status: 'authenticated', me });
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) {
          if (active) setState({ status: 'forbidden', email: '' });
          return;
        }
        if (active) setState({ status: 'anonymous' });
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return state;
}

function extractEmail(p: ClientPrincipal): string | null {
  const claim = p.claims?.find((c) =>
    ['emails', 'email', 'preferred_username', 'upn'].includes(c.typ),
  )?.val;
  return claim ?? p.userDetails ?? null;
}

export const loginUrl = `/.auth/login/aad?post_login_redirect_uri=/tippen`;
export const logoutUrl = `/.auth/logout?post_logout_redirect_uri=/login`;
