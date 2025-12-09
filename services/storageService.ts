import { User, Match, DisciplineType, Team } from '../types';
import { DISCIPLINES, INITIAL_PLAYERS } from '../constants';
import { db } from './firebase';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, onSnapshot, writeBatch, query, where } from "firebase/firestore";

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

// Internal Helper for balancing teams (Logic kept from previous version)
const createBalancedTeams = (players: User[]): Team[] => {
    const adulti = players.filter(p => p.weight === 6);
    const giovani = players.filter(p => p.weight === 4);
    const ragazzi = players.filter(p => p.weight === 2);

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

export const StorageService = {
  // --- Initialization ---
  init: async () => {
    try {
        const usersRef = collection(db, COLLECTIONS.USERS);
        const snapshot = await getDocs(usersRef);

        if (snapshot.empty) {
            console.log("Database empty. Seeding initial data...");
            const batch = writeBatch(db);

            // 1. Prepare Users
            const allUsers = [MASTER_USER, ...INITIAL_PLAYERS];
            // Note: createBalancedTeams modifies user objects (adds teamId), so we do that first
            
            // 2. Create Teams
            const teams = createBalancedTeams(INITIAL_PLAYERS); // This modifies INITIAL_PLAYERS objects in memory
            
            // 3. Generate Matches
            const initialMatches = generateMatches(teams, INITIAL_PLAYERS);

            // 4. Batch Write Users
            // We need to write the updated INITIAL_PLAYERS (with teamIds) and Master
            [MASTER_USER, ...INITIAL_PLAYERS].forEach(u => {
                const ref = doc(db, COLLECTIONS.USERS, u.id);
                batch.set(ref, u);
            });

            // 5. Batch Write Teams
            teams.forEach(t => {
                const ref = doc(db, COLLECTIONS.TEAMS, t.id);
                batch.set(ref, t);
            });

            // 6. Batch Write Matches
            initialMatches.forEach(m => {
                const ref = doc(db, COLLECTIONS.MATCHES, m.id);
                batch.set(ref, m);
            });

            await batch.commit();
            console.log("Seeding complete!");
        } else {
            console.log("Database already initialized.");
        }
    } catch (e) {
        console.error("Error initializing DB:", e);
        throw e; // Propagate error to UI
    }
  },

  // --- Subscriptions (Real-time) ---
  subscribeToUsers: (callback: (users: User[]) => void, onError?: (error: any) => void) => {
      return onSnapshot(collection(db, COLLECTIONS.USERS), 
        (snapshot) => {
            const users = snapshot.docs.map(d => d.data() as User);
            callback(users);
        }, 
        (error) => {
            console.error("Snapshot Listener Error (Users):", error);
            if (onError) onError(error);
        }
      );
  },

  subscribeToTeams: (callback: (teams: Team[]) => void, onError?: (error: any) => void) => {
      return onSnapshot(collection(db, COLLECTIONS.TEAMS), 
        (snapshot) => {
            const teams = snapshot.docs.map(d => d.data() as Team);
            callback(teams);
        },
        (error) => {
            console.error("Snapshot Listener Error (Teams):", error);
            if (onError) onError(error);
        }
      );
  },

  subscribeToMatches: (callback: (matches: Match[]) => void, onError?: (error: any) => void) => {
      return onSnapshot(collection(db, COLLECTIONS.MATCHES), 
        (snapshot) => {
            const matches = snapshot.docs.map(d => d.data() as Match);
            callback(matches);
        },
        (error) => {
            console.error("Snapshot Listener Error (Matches):", error);
            if (onError) onError(error);
        }
      );
  },

  // --- Actions ---
  login: async (username: string, pass: string): Promise<User | null> => {
    try {
        const q = query(collection(db, COLLECTIONS.USERS), where("username", "==", username), where("password", "==", pass));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            return snapshot.docs[0].data() as User;
        }
        return null;
    } catch (error) {
        console.error("Login Error:", error);
        throw error;
    }
  },

  addUser: async (user: Omit<User, 'id'>) => {
    const newId = generateId();
    const newUser = { ...user, id: newId };
    await setDoc(doc(db, COLLECTIONS.USERS, newId), newUser);
    return newUser;
  },

  updateUser: async (updatedUser: User) => {
    await setDoc(doc(db, COLLECTIONS.USERS, updatedUser.id), updatedUser, { merge: true });
  },

  deleteUser: async (userId: string) => {
    await deleteDoc(doc(db, COLLECTIONS.USERS, userId));
    // Ideally, we should also cleanup matches/teams, but keeping it simple for now
  },

  updateMatch: async (match: Match) => {
      await setDoc(doc(db, COLLECTIONS.MATCHES, match.id), match, { merge: true });
  },
  
  // Used for bulk updates (e.g. generating brackets)
  saveMatchesBatch: async (matches: Match[]) => {
      const batch = writeBatch(db);
      matches.forEach(m => {
          const ref = doc(db, COLLECTIONS.MATCHES, m.id);
          batch.set(ref, m);
      });
      await batch.commit();
  },

  getTeamsOnce: async (): Promise<Team[]> => {
      const s = await getDocs(collection(db, COLLECTIONS.TEAMS));
      return s.docs.map(d => d.data() as Team);
  }
};
