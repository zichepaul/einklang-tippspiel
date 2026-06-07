// Formatierungs-Helfer. Zeiten werden in Europe/Berlin angezeigt
// (intern überall UTC gespeichert).

import type { Stage } from './types';

const TZ = 'Europe/Berlin';

const dateTimeFmt = new Intl.DateTimeFormat('de-DE', {
  timeZone: TZ,
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

const dayFmt = new Intl.DateTimeFormat('de-DE', {
  timeZone: TZ,
  weekday: 'long',
  day: '2-digit',
  month: 'long',
});

const timeFmt = new Intl.DateTimeFormat('de-DE', {
  timeZone: TZ,
  hour: '2-digit',
  minute: '2-digit',
});

export function formatKickoff(utc: string): string {
  return `${dateTimeFmt.format(new Date(utc))} Uhr`;
}

export function formatTime(utc: string): string {
  return `${timeFmt.format(new Date(utc))} Uhr`;
}

/** Tagesschlüssel für die Gruppierung im Spielplan (lokales Datum). */
export function dayKey(utc: string): string {
  return dayFmt.format(new Date(utc));
}

export const STAGE_LABELS: Record<Stage, string> = {
  group: 'Gruppenphase',
  round32: 'Sechzehntelfinale',
  round16: 'Achtelfinale',
  quarter: 'Viertelfinale',
  semi: 'Halbfinale',
  third_place: 'Spiel um Platz 3',
  final: 'Finale',
};

export function stageLabel(stage: Stage, group?: string | null): string {
  if (stage === 'group' && group) return `Gruppe ${group}`;
  return STAGE_LABELS[stage];
}

export function statusLabel(status: 'scheduled' | 'live' | 'finished'): string {
  switch (status) {
    case 'live':
      return 'Läuft';
    case 'finished':
      return 'Beendet';
    default:
      return 'Geplant';
  }
}

/** Verbleibende Zeit bis zu einer Deadline, grob menschenlesbar. */
export function countdown(utc: string, now = new Date()): string {
  const ms = new Date(utc).getTime() - now.getTime();
  if (ms <= 0) return 'gesperrt';
  const mins = Math.floor(ms / 60000);
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  if (days > 0) return `noch ${days} Tag${days === 1 ? '' : 'e'}`;
  if (hours > 0) return `noch ${hours} Std`;
  return `noch ${mins} Min`;
}
