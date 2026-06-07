// Typisierter Fetch-Client gegen das /api-Backend.

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    // Session abgelaufen -> zurück zum Login.
    window.location.href = '/login';
    throw new ApiError(401, 'Nicht angemeldet.');
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new ApiError(res.status, data?.error ?? `Fehler ${res.status}`);
  }
  return data as T;
}

import type {
  MeDto,
  MatchDto,
  ConfigDto,
  ChampionDto,
  LeaderboardRow,
  AdminUserRow,
} from './types';

export const api = {
  getMe: () => request<MeDto>('GET', '/me'),
  updateNickname: (nickname: string) => request<MeDto>('PUT', '/me', { nickname }),

  getConfig: () => request<ConfigDto>('GET', '/config'),

  getMatches: () => request<{ matches: MatchDto[] }>('GET', '/matches'),
  savePrediction: (matchId: string, predHome: number, predAway: number) =>
    request<{ matchId: string; predHome: number; predAway: number; points: number | null }>(
      'PUT',
      '/predictions',
      { matchId, predHome, predAway },
    ),

  getChampion: () => request<ChampionDto>('GET', '/champion'),
  saveChampion: (championTeam: string) =>
    request<{ championTeam: string }>('PUT', '/champion', { championTeam }),

  getLeaderboard: () => request<{ leaderboard: LeaderboardRow[] }>('GET', '/leaderboard'),

  // Admin (einsegmentige Routen – SWA Managed Functions routen nach Funktionsnamen)
  adminGetUsers: () =>
    request<{ users: AdminUserRow[]; adminEmails: string[]; protectedAdmins: string[] }>(
      'GET',
      '/adminUsers',
    ),
  adminSetAdmin: (email: string, isAdmin: boolean) =>
    request<{ email: string; isAdmin: boolean; adminEmails: string[] }>('PUT', '/adminUsers', {
      email,
      isAdmin,
    }),
  adminGetConfig: () =>
    request<ConfigDto & { adminEmails: string[] }>('GET', '/adminConfig'),
  adminSetResult: (
    matchId: string,
    resultHome: number,
    resultAway: number,
    champion?: string,
  ) =>
    request<{ predictionsScored: number; championScored: number }>('PUT', '/adminResult', {
      matchId,
      resultHome,
      resultAway,
      champion,
    }),
  adminSync: () =>
    request<{
      fetched: number;
      upserted: number;
      newlyFinished: number;
      predictionsScored: number;
      championScored: number;
    }>('POST', '/adminSync'),
};
