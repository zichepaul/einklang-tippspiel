// Nutzerprofile: automatisches Anlegen beim ersten Login, Admin-Erkennung.

import { getContainer, CONTAINERS } from './cosmos';
import { getDisplayName } from './auth';
import { resolveAdminEmails } from './config';
import type { ClientPrincipal, User } from './types';

/** Liefert das Nutzerprofil; legt es beim ersten Login automatisch an. */
export async function getOrCreateUser(
  principal: ClientPrincipal,
  email: string,
): Promise<User> {
  const container = await getContainer(CONTAINERS.users);
  const id = principal.userId;
  const admins = await resolveAdminEmails();
  const isAdmin = admins.includes(email.toLowerCase());

  const { resource } = await container.item(id, id).read<User>();
  if (resource) {
    // Admin-Status & Stammdaten bei jedem Login mit dem Token abgleichen.
    const displayName = getDisplayName(principal);
    if (resource.isAdmin !== isAdmin || resource.displayName !== displayName || resource.email !== email) {
      resource.isAdmin = isAdmin;
      resource.displayName = displayName;
      resource.email = email;
      await container.items.upsert(resource);
    }
    return resource;
  }

  const user: User = {
    id,
    displayName: getDisplayName(principal),
    email,
    isAdmin,
    createdAt: new Date().toISOString(),
  };
  await container.items.create(user);
  return user;
}

/** Anzeigename für die Rangliste: Spitzname, sonst echter Name. */
export function rosterName(user: Pick<User, 'displayName' | 'nickname'>): string {
  return user.nickname?.trim() || user.displayName;
}
