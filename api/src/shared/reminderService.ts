// Baut und versendet die Teams-Erinnerung: heutige Spiele (mit Anpfiffzeiten in
// Europe/Berlin) und – falls noch offen – der Stichtag für den Weltmeister-Tipp.

import { getContainer, CONTAINERS } from './cosmos';
import { getConfig } from './config';
import { teamsConfigured, postTeamsCard } from './teams';
import { isChampionBetLocked } from './deadlines';
import type { Match } from './types';

interface Logger {
  info: (msg: string, ...args: unknown[]) => void;
  error: (msg: string, ...args: unknown[]) => void;
}

const berlinDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Berlin',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const berlinTime = new Intl.DateTimeFormat('de-DE', {
  timeZone: 'Europe/Berlin',
  hour: '2-digit',
  minute: '2-digit',
});

export interface ReminderResult {
  sent: boolean;
  matchesToday: number;
  championReminder: boolean;
  reason?: string;
}

export async function runReminder(log: Logger, now: Date = new Date()): Promise<ReminderResult> {
  if (!teamsConfigured()) {
    return { sent: false, matchesToday: 0, championReminder: false, reason: 'TEAMS_WEBHOOK_URL nicht gesetzt' };
  }

  const todayKey = berlinDay.format(now);
  const matchesC = await getContainer(CONTAINERS.matches);
  const { resources: matches } = await matchesC.items
    .query<Match>({ query: 'SELECT * FROM c' })
    .fetchAll();

  const todays = matches
    .filter((m) => berlinDay.format(new Date(m.kickoffUtc)) === todayKey && m.status === 'scheduled')
    .sort((a, b) => a.kickoffUtc.localeCompare(b.kickoffUtc));

  const config = await getConfig();
  const championOpen = !isChampionBetLocked(config.tournamentStartUtc, now);
  const championToday = berlinDay.format(new Date(config.tournamentStartUtc)) === todayKey;
  const championReminder = championOpen && championToday;

  if (todays.length === 0 && !championReminder) {
    log.info('Reminder: heute keine Spiele/Deadlines – nichts gesendet.');
    return { sent: false, matchesToday: 0, championReminder: false, reason: 'keine Spiele/Deadlines heute' };
  }

  const lines: string[] = [];
  if (todays.length > 0) {
    lines.push(
      `**Heute ${todays.length} Spiel${todays.length === 1 ? '' : 'e'}** – Tipps sind jeweils bis zum Anpfiff möglich:`,
    );
    for (const m of todays) {
      lines.push(`- ${berlinTime.format(new Date(m.kickoffUtc))} Uhr — ${m.homeTeam} : ${m.awayTeam}`);
    }
  }
  if (championReminder) {
    lines.push(
      `**Letzte Chance:** Der Weltmeister-Tipp ist nur noch bis ${berlinTime.format(new Date(config.tournamentStartUtc))} Uhr möglich.`,
    );
  }
  lines.push('Viel Erfolg und faire Tipps!');

  const appUrl = process.env.APP_URL || undefined;
  await postTeamsCard({ title: 'Tippspiel-Erinnerung', lines, appUrl });
  log.info(`Reminder gesendet: ${todays.length} Spiele, championReminder=${championReminder}.`);
  return { sent: true, matchesToday: todays.length, championReminder };
}
