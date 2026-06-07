// DTO-Typen, wie sie vom /api-Backend geliefert werden.

export type Stage =
  | 'group'
  | 'round32'
  | 'round16'
  | 'quarter'
  | 'semi'
  | 'third_place'
  | 'final';

export type MatchStatus = 'scheduled' | 'live' | 'finished';

export interface MeDto {
  id: string;
  displayName: string;
  email: string;
  nickname: string | null;
  isAdmin: boolean;
  rosterName: string;
}

export interface OtherPrediction {
  name: string;
  predHome: number;
  predAway: number;
  points: number | null;
}

export interface MatchDto {
  id: string;
  externalId: string;
  stage: Stage;
  group: string | null;
  matchday: number | null;
  kickoffUtc: string;
  homeTeam: string;
  awayTeam: string;
  status: MatchStatus;
  resultHome: number | null;
  resultAway: number | null;
  locked: boolean;
  myPrediction: { predHome: number; predAway: number; points: number | null } | null;
  otherPredictions: OtherPrediction[] | null;
}

export interface PointRules {
  exact: number;
  goalDiff: number;
  tendency: number;
}

export interface ConfigDto {
  tournamentStartUtc: string;
  pointRules: PointRules;
  championBetPoints: number;
  championBetLocked: boolean;
}

export interface ChampionDto {
  championTeam: string | null;
  points: number | null;
  locked: boolean;
  tournamentStartUtc: string;
  championBetPoints: number;
  teams: string[];
}

export interface LeaderboardRow {
  rank: number;
  name: string;
  totalPoints: number;
  exactHits: number;
  isMe: boolean;
}

export interface AdminUserRow {
  id: string;
  displayName: string;
  email: string;
  nickname: string | null;
  isAdmin: boolean;
  createdAt: string;
}
