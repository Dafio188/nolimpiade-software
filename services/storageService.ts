import { User, Match, DisciplineType, Team } from '../types';
import { DISCIPLINES, INITIAL_PLAYERS } from '../constants';
import { db } from './firebase';

const COLLECTIONS = {
  USERS: 'users',
  TEAMS: 'teams',
  MATCHES: 'matches'
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

// Internal Helper for balancing teams
const createBalancedTeams = (players: User[]): Team[] => {
    // Clone players to avoid mutation issues during retries
    const pList = JSON.parse(JSON.stringify(players));
    const adulti = pList.filter((p: User) => p.weight === 6);
    const giovani = pList.filter((p: User) => p.weight === 4);
    const ragazzi = pList.filter((p: User) => p.weight === 2);

    const teams: Team[] = [];

    // Strategy: Pair 1 Adult (6) with 1 Ragazzo (2) = 8
    for (let i = 0; i < 4; i++) {
        const p1 = adulti[i];
        const p2 = ragazzi[i];
        if (p1 && p2) {
            const teamId = generateId();
            teams.push({
                id: teamId,
                name: `${p1.name.split(' ')[0]} & ${p2.name.split(' ')[0]}`,
                playerIds: [p1.id, p2.id],
                totalWeight: p1.weight + p2.weight,
                avatar: `https://ui-avatars.com/api/?name=${p1.name}+${p2.name}&background=random&font-size=0.33`
            });
            // Update the player objects in our local list to have the teamId
            p1.teamId = teamId;
            p2.teamId = teamId;
        }
    }

    // Strategy: Pair 2 Giovani (4+4) = 8
    for (let i = 0; i < 4; i += 2) {
        const p1 = giovani[i];
        const p2 = giovani[i+1];
        if (p1 && p2) {
             const teamId = generateId();
             teams.push({
                id: teamId,
                name: `${p1.name.split(' ')[0]} & ${p2.name.split(' ')[0]}`,
                playerIds: [p1.id, p2.id],
                totalWeight: p1.weight + p2.weight,
                avatar: `https://ui-avatars.com/api/?name=${p1.name}+${p2.name}&background=random&font-size=0.33`
            });
            p1.teamId = teamId;
            p2.teamId = teamId;
        }
    }
    return teams;
};

const generateMatches = (teams: Team[], players: User[]): Match[] => {
  const newMatches: Match[] = [];
  
  DISCIPLINES.forEach(disc => {
    if (disc.isTeam) {
        // Team Round Robin
        for (let i = 0; i < teams.length; i++) {
          for (let j = i + 1; j < teams.length; j++) {
            newMatches.push({
              id: generateId(),
              disciplineId: disc.id,
              player1Id: teams[i].id,
              player2Id: teams[j].id,
              score1: null,
              score2: null,
              isCompleted: false,
              phase: 'ROUND_ROBIN'
            });
          }
        }
    } else {
        // Individual Round Robin
        for (let i = 0; i < players.length; i++) {
          for (let j = i + 1; j < players.length; j++) {
             newMatches.push({
              id: generateId(),
              disciplineId: disc.id,
              player1Id: players[i].id,
              player2Id: players[j].id,
              score1: null,
              score2: null,
              isCompleted: false,
              phase: 'ROUND_ROBIN'
            });
          }
        }
    }
  });
  return newMatches;
};

// --- OFFLINE MODE UTILS ---
let isOfflineMode = false;
const offlineSubscribers = {
    users: [] as ((data: User[]) => void)[],
    teams: [] as ((data: Team[]) => void)[],
    matches: [] as ((data: Match[]) => void)[]
};

const getLocal = (key: string) => JSON.parse(localStorage.getItem(`nolimpiadi_${key}`) || '[]');
const setLocal = (key: string, data: any) => localStorage.setItem(`nolimpiadi_${key}`, JSON.stringify(data));

const notifyOffline = (key: 'users' | 'teams' | 'matches') => {
    const data = getLocal(key);
    offlineSubscribers[key].forEach(cb => cb(data));
};

export const StorageService = {
  // Enables offline mode and seeds data if empty
  enableOfflineMode: async () => {
      isOfflineMode = true;
      console.log("OFFLINE MODE ENABLED");
      
      if (getLocal(COLLECTIONS.USERS).length === 0) {
          console.log("Seeding Local Offline Data...");
          
          // Use copies to generate
          const teams = createBalancedTeams([...INITIAL_PLAYERS]); 
          
          // Re-map players because createBalancedTeams might have updated teamIds on the objects it created
          // In a real DB we update docs. Here we need to reconstruct the player list with team IDs.
          // Simplification: We take ALL users (Master + Players) and update their teamId if found in teams
          const allUsers = [MASTER_USER, ...INITIAL_PLAYERS].map(u => {
             const foundTeam = teams.find(t => t.playerIds.includes(u.id));
             return foundTeam ? { ...u, teamId: foundTeam.id } : u;
          });

          const matches = generateMatches(teams, allUsers);
          
          setLocal(COLLECTIONS.USERS, allUsers);
          setLocal(COLLECTIONS.TEAMS, teams);
          setLocal(COLLECTIONS.MATCHES, matches);
      }
      
      // Notify immediately
      notifyOffline('users');
      notifyOffline('teams');
      notifyOffline('matches');
  },

  init: async () => {
    if (isOfflineMode) return;
    try {
        const usersSnapshot = await db.collection(COLLECTIONS.USERS).get();

        if (usersSnapshot.empty) {
            console.log("Database empty. Seeding initial data...");
            const batch = db.batch();

            // 1. Create Teams (this logic is shared but we need to capture the objects)
            // We clone to avoid side effects on constants
            const playerClones = JSON.parse(JSON.stringify(INITIAL_PLAYERS));
            const teams = createBalancedTeams(playerClones);
            
            // 2. Prepare Users List (Master + Players with updated TeamIDs)
            // Note: createBalancedTeams updated 'playerClones' with teamIds
            const allUsers = [MASTER_USER, ...playerClones];

            // 3. Generate Matches
            const initialMatches = generateMatches(teams, allUsers);

            allUsers.forEach(u => batch.set(db.collection(COLLECTIONS.USERS).doc(u.id), u));
            teams.forEach(t => batch.set(db.collection(COLLECTIONS.TEAMS).doc(t.id), t));
            initialMatches.forEach(m => batch.set(db.collection(COLLECTIONS.MATCHES).doc(m.id), m));

            await batch.commit();
            console.log("Seeding complete!");
        }
    } catch (e) {
        throw e;
    }
  },

  subscribeToUsers: (callback: (users: User[]) => void, onError?: (error: any) => void) => {
      if (isOfflineMode) {
          offlineSubscribers.users.push(callback);
          callback(getLocal(COLLECTIONS.USERS));
          return () => {};
      }
      return db.collection(COLLECTIONS.USERS).onSnapshot(
        (s) => callback(s.docs.map(d => d.data() as User)), 
        (e) => onError && onError(e)
      );
  },

  subscribeToTeams: (callback: (teams: Team[]) => void, onError?: (error: any) => void) => {
      if (isOfflineMode) {
           offlineSubscribers.teams.push(callback);
           callback(getLocal(COLLECTIONS.TEAMS));
           return () => {};
      }
      return db.collection(COLLECTIONS.TEAMS).onSnapshot(
        (s) => callback(s.docs.map(d => d.data() as Team)),
        (e) => onError && onError(e)
      );
  },

  subscribeToMatches: (callback: (matches: Match[]) => void, onError?: (error: any) => void) => {
      if (isOfflineMode) {
           offlineSubscribers.matches.push(callback);
           callback(getLocal(COLLECTIONS.MATCHES));
           return () => {};
      }
      return db.collection(COLLECTIONS.MATCHES).onSnapshot(
        (s) => callback(s.docs.map(d => d.data() as Match)),
        (e) => onError && onError(e)
      );
  },

  login: async (username: string, pass: string): Promise<User | null> => {
    if (isOfflineMode) {
        const users = getLocal(COLLECTIONS.USERS) as User[];
        return users.find(u => u.username === username && u.password === pass) || null;
    }
    const snapshot = await db.collection(COLLECTIONS.USERS)
      .where("username", "==", username)
      .where("password", "==", pass)
      .get();
    return !snapshot.empty ? snapshot.docs[0].data() as User : null;
  },

  addUser: async (user: Omit<User, 'id'>) => {
    const newId = generateId();
    const newUser = { ...user, id: newId };
    
    if (isOfflineMode) {
        const users = getLocal(COLLECTIONS.USERS);
        users.push(newUser);
        setLocal(COLLECTIONS.USERS, users);
        notifyOffline('users');
    } else {
        await db.collection(COLLECTIONS.USERS).doc(newId).set(newUser);
    }
    return newUser;
  },

  updateUser: async (updatedUser: User) => {
    if (isOfflineMode) {
        const users = getLocal(COLLECTIONS.USERS) as User[];
        const idx = users.findIndex(u => u.id === updatedUser.id);
        if (idx !== -1) {
            users[idx] = updatedUser;
            setLocal(COLLECTIONS.USERS, users);
            notifyOffline('users');
        }
    } else {
        // Use merge: true to avoid overwriting missing fields if any
        await db.collection(COLLECTIONS.USERS).doc(updatedUser.id).set(updatedUser, { merge: true });
    }
  },

  deleteUser: async (userId: string) => {
    if (isOfflineMode) {
        const users = getLocal(COLLECTIONS.USERS) as User[];
        const newUsers = users.filter(u => u.id !== userId);
        setLocal(COLLECTIONS.USERS, newUsers);
        notifyOffline('users');
    } else {
        await db.collection(COLLECTIONS.USERS).doc(userId).delete();
    }
  },

  updateMatch: async (match: Match) => {
    if (isOfflineMode) {
        const matches = getLocal(COLLECTIONS.MATCHES) as Match[];
        const idx = matches.findIndex(m => m.id === match.id);
        if (idx !== -1) {
            matches[idx] = match;
            setLocal(COLLECTIONS.MATCHES, matches);
            notifyOffline('matches');
        }
    } else {
        await db.collection(COLLECTIONS.MATCHES).doc(match.id).set(match, { merge: true });
    }
  },
  
  saveMatchesBatch: async (matches: Match[]) => {
      if (isOfflineMode) {
          const current = getLocal(COLLECTIONS.MATCHES) as Match[];
          // Upsert logic
          matches.forEach(m => {
              const idx = current.findIndex(cm => cm.id === m.id);
              if (idx !== -1) current[idx] = m;
              else current.push(m);
          });
          setLocal(COLLECTIONS.MATCHES, current);
          notifyOffline('matches');
      } else {
        const batch = db.batch();
        matches.forEach(m => {
            const ref = db.collection(COLLECTIONS.MATCHES).doc(m.id);
            batch.set(ref, m);
        });
        await batch.commit();
      }
  },

  getTeamsOnce: async (): Promise<Team[]> => {
      if (isOfflineMode) return getLocal(COLLECTIONS.TEAMS);
      const s = await db.collection(COLLECTIONS.TEAMS).get();
      return s.docs.map(d => d.data() as Team);
  }
};