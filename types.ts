export type DisciplineType = 'PING_PONG' | 'CALCIOBALILLA' | 'FRECCETTE' | 'BASKET';

export type UserRole = 'MASTER' | 'PLAYER';

export type PlayerCategory = 'RAGAZZO' | 'GIOVANE' | 'ADULTO';

export interface User {
  id: string;
  name: string;
  username: string;
  password?: string;
  email: string;
  role: UserRole;
  avatar: string;
  category: PlayerCategory;
  weight: number; // 2, 4, 6
  teamId?: string;
}

// Player is essentially a User
export interface Player extends User {} 

export interface Team {
  id: string;
  name: string;
  playerIds: string[];
  totalWeight: number;
  avatar: string; // Composition of player avatars or generated
}

export interface Discipline {
  id: DisciplineType;
  name: string;
  icon: string;
  color: string;
  rules: string; // e.g., "Vince chi arriva a 11"
  isTeam: boolean; // TRUE = 2vs2 (uses Teams), FALSE = 1vs1 (uses Players directly)
}

export type MatchPhase = 'ROUND_ROBIN' | 'QUARTER_FINAL' | 'SEMI_FINAL' | 'FINAL';

export interface Match {
  id: string;
  disciplineId: DisciplineType;
  // Previously playerIds, now these refer to Team IDs
  player1Id: string; // Represents Team 1 ID OR Player 1 ID (depending on discipline)
  player2Id: string; // Represents Team 2 ID OR Player 2 ID
  score1: number | null;
  score2: number | null;
  isCompleted: boolean;
  phase: MatchPhase;
  roundLabel?: string;
  winnerId?: string;
}

export interface StandingRow {
  playerId: string; // Here it refers to Team ID
  playerName: string; // Team Name
  points: number;
  played: number;
  won: number;
  wins: number;
  lost: number;
  diff: number;
  isCurrentUser?: boolean; // Belongs to current user's team
}

export interface AppState {
  view: 'LOGIN' | 'DASHBOARD' | 'MATCHES' | 'STANDINGS' | 'FINALS' | 'GEMINI' | 'ADMIN_USERS' | 'LIVE_BOARD';
  currentUser: User | null;
}
