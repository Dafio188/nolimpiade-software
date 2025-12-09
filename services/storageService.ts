import { User, Match, DisciplineType, Team } from '../types';
import { DISCIPLINES, INITIAL_PLAYERS } from '../constants';

const STORAGE_KEYS = {
  USERS: 'nolimpiadi_users',
  TEAMS: 'nolimpiadi_teams',
  MATCHES: 'nolimpiadi_matches',
  INIT: 'nolimpiadi_initialized_v2' // Changed key to force re-init for new logic
};

const generateId = () => Math.random().toString(36).substr(2, 9);

const MASTER_USER: User = {
  id: 'master-01',
  name: 'Davide Fiore',
  username: 'Fioda',
  password: 'admin123',
  email: 'fio.davide@gmail.com',
  role: 'MASTER',
  avatar: 'https://ui-avatars.com/api/?name=Davide+Fiore&background=0D8ABC&color=fff',
  category: 'ADULTO',
  weight: 6
};

// Merge Master into seed but ensure we respect the 12 player limit if needed. 
// For this logic, we use INITIAL_PLAYERS + Master separately for Auth, 
// but for Tournament we strictly use the balanced INITIAL_PLAYERS list (or modify it).
// Let's assume Master is an admin mainly, but if he plays he needs to be in the 12.
// To keep the math of 12 players (4/4/4) perfect, we use INITIAL_PLAYERS as the roster.

export const StorageService = {
  init: () => {
    if (!localStorage.getItem(STORAGE_KEYS.INIT)) {
      // 1. Save Users (Master + Players)
      const allUsers = [MASTER_USER, ...INITIAL_PLAYERS];
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(allUsers));
      
      // 2. Create Balanced Teams from INITIAL_PLAYERS
      const teams = StorageService.createBalancedTeams(INITIAL_PLAYERS);
      localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(teams));

      // 3. Generate Matches (Team vs Team)
      const initialMatches = StorageService.generateTeamMatches(teams);
      localStorage.setItem(STORAGE_KEYS.MATCHES, JSON.stringify(initialMatches));
      
      localStorage.setItem(STORAGE_KEYS.INIT, 'true');
    }
  },

  // --- Logic for Teams ---
  createBalancedTeams: (players: User[]): Team[] => {
      // We need 6 teams. Target weight ~8.
      // Pool A: Adulti (6) - 4 players
      // Pool B: Giovani (4) - 4 players
      // Pool C: Ragazzi (2) - 4 players
      
      const adulti = players.filter(p => p.weight === 6);
      const giovani = players.filter(p => p.weight === 4);
      const ragazzi = players.filter(p => p.weight === 2);

      const teams: Team[] = [];

      // Strategy: Pair 1 Adult (6) with 1 Ragazzo (2) = 8
      for (let i = 0; i < 4; i++) {
          const p1 = adulti[i];
          const p2 = ragazzi[i];
          if (p1 && p2) {
              teams.push({
                  id: generateId(),
                  name: `${p1.name.split(' ')[0]} & ${p2.name.split(' ')[0]}`,
                  playerIds: [p1.id, p2.id],
                  totalWeight: p1.weight + p2.weight,
                  avatar: `https://ui-avatars.com/api/?name=${p1.name}+${p2.name}&background=random&font-size=0.33`
              });
              // Update users with teamId
              p1.teamId = teams[teams.length-1].id;
              p2.teamId = teams[teams.length-1].id;
          }
      }

      // Strategy: Pair 2 Giovani (4+4) = 8
      for (let i = 0; i < 4; i += 2) {
          const p1 = giovani[i];
          const p2 = giovani[i+1];
          if (p1 && p2) {
               teams.push({
                  id: generateId(),
                  name: `${p1.name.split(' ')[0]} & ${p2.name.split(' ')[0]}`,
                  playerIds: [p1.id, p2.id],
                  totalWeight: p1.weight + p2.weight,
                  avatar: `https://ui-avatars.com/api/?name=${p1.name}+${p2.name}&background=random&font-size=0.33`
              });
              p1.teamId = teams[teams.length-1].id;
              p2.teamId = teams[teams.length-1].id;
          }
      }

      return teams;
  },

  getTeams: (): Team[] => {
      const data = localStorage.getItem(STORAGE_KEYS.TEAMS);
      return data ? JSON.parse(data) : [];
  },

  // --- Matches ---
  generateTeamMatches: (teams: Team[]): Match[] => {
    const newMatches: Match[] = [];
    DISCIPLINES.forEach(disc => {
      for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
          newMatches.push({
            id: generateId(),
            disciplineId: disc.id,
            player1Id: teams[i].id, // Storing Team ID here
            player2Id: teams[j].id, // Storing Team ID here
            score1: null,
            score2: null,
            isCompleted: false,
            phase: 'ROUND_ROBIN'
          });
        }
      }
    });
    return newMatches;
  },

  // --- Standard CRUD ---
  login: (username: string, pass: string): User | null => {
    const users = StorageService.getUsers();
    return users.find(u => u.username === username && u.password === pass) || null;
  },

  getUsers: (): User[] => {
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    return data ? JSON.parse(data) : [];
  },

  getMatches: (): Match[] => {
    const data = localStorage.getItem(STORAGE_KEYS.MATCHES);
    return data ? JSON.parse(data) : [];
  },

  saveMatches: (matches: Match[]) => {
    localStorage.setItem(STORAGE_KEYS.MATCHES, JSON.stringify(matches));
  },

  addUser: (user: Omit<User, 'id'>) => {
    const users = StorageService.getUsers();
    const newUser = { ...user, id: generateId() };
    users.push(newUser);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    // Note: Adding a user mid-tournament doesn't automatically put them in a balanced team in this version
    return newUser;
  },

  updateUser: (updatedUser: User) => {
    const users = StorageService.getUsers();
    const index = users.findIndex(u => u.id === updatedUser.id);
    if (index !== -1) {
        users[index] = updatedUser;
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    }
  },

  deleteUser: (userId: string) => {
    let users = StorageService.getUsers();
    users = users.filter(u => u.id !== userId);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    // Deleting a user destroys the team balance, realistically implies tournament reset
  }
};
