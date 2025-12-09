import { Discipline, Player } from './types';

export const DISCIPLINES: Discipline[] = [
  { id: 'PING_PONG', name: 'Ping Pong', icon: '🏓', color: 'bg-orange-500', rules: '2vs2 - Vince chi arriva prima a 11 punti', isTeam: true },
  { id: 'CALCIOBALILLA', name: 'Calciobalilla', icon: '⚽', color: 'bg-green-600', rules: '2vs2 - Vince chi segna 5 goal', isTeam: true },
  { id: 'FRECCETTE', name: 'Freccette', icon: '🎯', color: 'bg-red-600', rules: '1vs1 - 301 Chiude con doppia', isTeam: false },
  { id: 'BASKET', name: 'Basket Tiri', icon: '🏀', color: 'bg-amber-600', rules: '1vs1 - Gara a 10 tiri liberi', isTeam: false },
];

// 12 Players balanced: 4 Ragazzi (2), 4 Giovani (4), 4 Adulti (6)
export const INITIAL_PLAYERS: Player[] = [
  // Ragazzi (Weight 2)
  { id: 'p1', name: 'Pietro Noli', username: 'pietro', email: 'pietro@nolimpiadi.it', role: 'PLAYER', avatar: 'https://picsum.photos/seed/p1/200', category: 'RAGAZZO', weight: 2 },
  { id: 'p2', name: 'Mario Rossi', username: 'mario', email: 'mario@nolimpiadi.it', role: 'PLAYER', avatar: 'https://picsum.photos/seed/p2/200', category: 'RAGAZZO', weight: 2 },
  { id: 'p3', name: 'Luigi Verdi', username: 'luigi', email: 'luigi@nolimpiadi.it', role: 'PLAYER', avatar: 'https://picsum.photos/seed/p3/200', category: 'RAGAZZO', weight: 2 },
  { id: 'p4', name: 'Anna Bianchi', username: 'anna', email: 'anna@nolimpiadi.it', role: 'PLAYER', avatar: 'https://picsum.photos/seed/p4/200', category: 'RAGAZZO', weight: 2 },
  
  // Giovani (Weight 4)
  { id: 'p5', name: 'Giulia Neri', username: 'giulia', email: 'giulia@nolimpiadi.it', role: 'PLAYER', avatar: 'https://picsum.photos/seed/p5/200', category: 'GIOVANE', weight: 4 },
  { id: 'p6', name: 'Francesco Totti', username: 'francesco', email: 'francesco@nolimpiadi.it', role: 'PLAYER', avatar: 'https://picsum.photos/seed/p6/200', category: 'GIOVANE', weight: 4 },
  { id: 'p7', name: 'Alex Del Piero', username: 'alex', email: 'alex@nolimpiadi.it', role: 'PLAYER', avatar: 'https://picsum.photos/seed/p7/200', category: 'GIOVANE', weight: 4 },
  { id: 'p8', name: 'Roby Baggio', username: 'roby', email: 'roby@nolimpiadi.it', role: 'PLAYER', avatar: 'https://picsum.photos/seed/p8/200', category: 'GIOVANE', weight: 4 },

  // Adulti (Weight 6)
  { id: 'p9', name: 'Paolo Maldini', username: 'paolo', email: 'paolo@nolimpiadi.it', role: 'PLAYER', avatar: 'https://picsum.photos/seed/p9/200', category: 'ADULTO', weight: 6 },
  { id: 'p10', name: 'Andrea Pirlo', username: 'andrea', email: 'andrea@nolimpiadi.it', role: 'PLAYER', avatar: 'https://picsum.photos/seed/p10/200', category: 'ADULTO', weight: 6 },
  { id: 'p11', name: 'Gigi Buffon', username: 'gigi', email: 'gigi@nolimpiadi.it', role: 'PLAYER', avatar: 'https://picsum.photos/seed/p11/200', category: 'ADULTO', weight: 6 },
  { id: 'p12', name: 'Fabio Cannavaro', username: 'fabio', email: 'fabio@nolimpiadi.it', role: 'PLAYER', avatar: 'https://picsum.photos/seed/p12/200', category: 'ADULTO', weight: 6 },
];

export const WIN_POINTS = 3;
export const DRAW_POINTS = 1; 
export const LOSS_POINTS = 0;
