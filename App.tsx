import React, { useState, useEffect, useCallback } from 'react';
import { Player, Match, AppState, DisciplineType, StandingRow, User } from './types';
import { DISCIPLINES } from './constants';
import { Dock } from './components/Dock';
import { MatchList } from './components/MatchList';
import { Standings } from './components/Standings';
import { FinalsView } from './components/Bracket';
import { UserManager } from './components/UserManager';
import { LiveSchedule } from './components/LiveSchedule'; // New import
import { User as UserIcon, ShieldCheck, PlayCircle, Trophy, Sparkles } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { StorageService } from './services/storageService';

const generateId = () => Math.random().toString(36).substr(2, 9);

const App: React.FC = () => {
  // Initialize Storage
  useEffect(() => {
    StorageService.init();
    // Load initial data
    setPlayers(StorageService.getUsers());
    setMatches(StorageService.getMatches());
  }, []);

  const [players, setPlayers] = useState<User[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [appState, setAppState] = useState<AppState>({ view: 'LOGIN', currentUser: null });
  
  // Login State
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = StorageService.login(loginUser, loginPass);
    if (user) {
        setAppState({ view: 'DASHBOARD', currentUser: user });
        setLoginError('');
        // Refresh data on login to ensure consistency
        setPlayers(StorageService.getUsers());
        setMatches(StorageService.getMatches());
    } else {
        setLoginError('Credenziali non valide');
    }
  };

  const handleAddUser = (newUser: Omit<User, 'id'>) => {
      StorageService.addUser(newUser);
      setPlayers(StorageService.getUsers());
      setMatches(StorageService.getMatches()); // New user generates new matches
  };

  const handleUpdateUser = (updatedUser: User) => {
      StorageService.updateUser(updatedUser);
      setPlayers(StorageService.getUsers());
      // Matches don't change structure, just user details, which are looked up by ID
  };

  const handleDeleteUser = (userId: string) => {
      StorageService.deleteUser(userId);
      setPlayers(StorageService.getUsers());
      setMatches(StorageService.getMatches()); // Matches involving user are removed
  };

  const handleUpdateScore = useCallback((matchId: string, s1: number, s2: number) => {
    const updatedMatches = matches.map(m => {
      if (m.id === matchId) {
        const winnerId = s1 > s2 ? m.player1Id : (s2 > s1 ? m.player2Id : undefined);
        return { ...m, score1: s1, score2: s2, isCompleted: true, winnerId };
      }
      return m;
    });
    setMatches(updatedMatches);
    StorageService.saveMatches(updatedMatches);
  }, [matches]);

  // Effect to propagate bracket winners
  useEffect(() => {
    let changed = false;
    const nextMatches = [...matches];

    const updateBracketFlow = (discId: string) => {
        const qfA = nextMatches.find(m => m.disciplineId === discId && m.roundLabel === 'Quarti A');
        const qfB = nextMatches.find(m => m.disciplineId === discId && m.roundLabel === 'Quarti B');
        const semiA = nextMatches.find(m => m.disciplineId === discId && m.roundLabel === 'Semi A');
        const semiB = nextMatches.find(m => m.disciplineId === discId && m.roundLabel === 'Semi B');
        const final = nextMatches.find(m => m.disciplineId === discId && m.phase === 'FINAL');

        if (qfA?.isCompleted && qfA.winnerId && semiA && semiA.player2Id !== qfA.winnerId) {
            semiA.player2Id = qfA.winnerId;
            changed = true;
        }
        if (qfB?.isCompleted && qfB.winnerId && semiB && semiB.player2Id !== qfB.winnerId) {
            semiB.player2Id = qfB.winnerId;
            changed = true;
        }
        if (semiA?.isCompleted && semiA.winnerId && final && final.player1Id !== semiA.winnerId) {
            final.player1Id = semiA.winnerId;
            changed = true;
        }
        if (semiB?.isCompleted && semiB.winnerId && final && final.player2Id !== semiB.winnerId) {
            final.player2Id = semiB.winnerId;
            changed = true;
        }
    }

    DISCIPLINES.forEach(d => updateBracketFlow(d.id));

    if (changed) {
        setMatches(nextMatches);
        StorageService.saveMatches(nextMatches);
    }

  }, [matches]);


  const generateBracket = (disciplineId: string) => {
    // Logic duplicated, ideally refactor
    const stats: Record<string, StandingRow> = {};
    players.forEach(p => {
        stats[p.id] = { playerId: p.id, playerName: p.name, points: 0, played: 0, won: 0, wins: 0, lost: 0, diff: 0 };
    });
    const relevantMatches = matches.filter(m => m.disciplineId === disciplineId && m.isCompleted && m.phase === 'ROUND_ROBIN');
    
    relevantMatches.forEach(m => {
        if(m.score1 === null || m.score2 === null) return;
        const p1 = stats[m.player1Id]; const p2 = stats[m.player2Id];
        // Safety check if user deleted
        if (!p1 || !p2) return;

        p1.diff += (m.score1 - m.score2); p2.diff += (m.score2 - m.score1);
        if (m.score1 > m.score2) { p1.points += 3; } 
        else if (m.score2 > m.score1) { p2.points += 3; } 
        else { p1.points += 1; p2.points += 1; }
    });

    const sorted = Object.values(stats).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return b.diff - a.diff;
    });

    const top6 = sorted.slice(0, 6);
    if (top6.length < 6) {
        alert("Non ci sono abbastanza giocatori o partite per generare le finali.");
        return;
    }

    const newMatches: Match[] = [];
    
    // QF A: 4th vs 5th
    newMatches.push({
        id: generateId(), disciplineId: disciplineId as DisciplineType,
        player1Id: top6[3].playerId, player2Id: top6[4].playerId,
        score1: null, score2: null, isCompleted: false, phase: 'QUARTER_FINAL', roundLabel: 'Quarti A'
    });
    // QF B: 3rd vs 6th
    newMatches.push({
        id: generateId(), disciplineId: disciplineId as DisciplineType,
        player1Id: top6[2].playerId, player2Id: top6[5].playerId,
        score1: null, score2: null, isCompleted: false, phase: 'QUARTER_FINAL', roundLabel: 'Quarti B'
    });
    // Semi A: 1st vs Winner QFA
    newMatches.push({
        id: generateId(), disciplineId: disciplineId as DisciplineType,
        player1Id: top6[0].playerId, player2Id: '',
        score1: null, score2: null, isCompleted: false, phase: 'SEMI_FINAL', roundLabel: 'Semi A'
    });
     // Semi B: 2nd vs Winner QFB
     newMatches.push({
        id: generateId(), disciplineId: disciplineId as DisciplineType,
        player1Id: top6[1].playerId, player2Id: '',
        score1: null, score2: null, isCompleted: false, phase: 'SEMI_FINAL', roundLabel: 'Semi B'
    });
    // Final
    newMatches.push({
        id: generateId(), disciplineId: disciplineId as DisciplineType,
        player1Id: '', player2Id: '',
        score1: null, score2: null, isCompleted: false, phase: 'FINAL', roundLabel: 'Finalissima'
    });

    const finalMatches = [...matches, ...newMatches];
    setMatches(finalMatches);
    StorageService.saveMatches(finalMatches);
  };


  // Views
  if (appState.view === 'LOGIN') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black/40 backdrop-blur-sm">
        <div className="w-full max-w-md bg-white/90 p-8 rounded-3xl shadow-2xl backdrop-blur-md border border-white/50 text-center animate-fade-in">
          <div className="mb-6 flex justify-center">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-4 rounded-2xl shadow-lg">
                <Trophy size={48} className="text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Nolimpiadi OS</h1>
          <p className="text-gray-500 mb-6">Accesso Atleti & Master</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="text"
              placeholder="Username"
              value={loginUser}
              onChange={(e) => setLoginUser(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-center text-lg text-gray-900 placeholder-gray-500"
            />
            <input
              type="password"
              placeholder="Password"
              value={loginPass}
              onChange={(e) => setLoginPass(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-center text-lg text-gray-900 placeholder-gray-500"
            />
            {loginError && <div className="text-red-500 text-sm font-medium">{loginError}</div>}
            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg transition-transform active:scale-95"
            >
              Entra
            </button>
          </form>
          <div className="mt-6 text-xs text-gray-400">
             Sistema sicuro v2.0
          </div>
        </div>
      </div>
    );
  }

  // Determine current component to render
  let ContentComponent = null;
  switch (appState.view) {
    case 'ADMIN_USERS':
      ContentComponent = <UserManager 
                            users={players} 
                            onAddUser={handleAddUser} 
                            onUpdateUser={handleUpdateUser} 
                            onDeleteUser={handleDeleteUser} 
                         />;
      break;
    case 'LIVE_BOARD':
      ContentComponent = <LiveSchedule matches={matches} players={players} />;
      break;
    case 'MATCHES':
      ContentComponent = <MatchList matches={matches} players={players} currentUser={appState.currentUser} isAdmin={appState.currentUser?.role === 'MASTER'} onUpdateScore={handleUpdateScore} />;
      break;
    case 'STANDINGS':
      ContentComponent = <Standings players={players} matches={matches} currentUser={appState.currentUser} />;
      break;
    case 'FINALS':
      ContentComponent = <FinalsView matches={matches} players={players} isAdmin={appState.currentUser?.role === 'MASTER'} onGenerateBracket={generateBracket} disciplineId="PING_PONG" />;
      break;
    case 'GEMINI':
      ContentComponent = (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 text-gray-700">
              <Sparkles size={64} className="text-purple-500 mb-4 animate-pulse" />
              <h2 className="text-2xl font-bold mb-2">Nolimpiadi AI Assistant</h2>
              <p className="max-w-md mb-6">L'intelligenza artificiale è integrata nelle sezioni <strong>Incontri</strong> (per le telecronache) e <strong>Classifiche</strong> (per le previsioni). Clicca sulle icone bacchetta magica in quelle sezioni!</p>
              <div className="text-sm bg-white/80 p-4 rounded-lg border border-purple-100 shadow-sm">
                  Powered by Google Gemini 2.5 Flash
              </div>
          </div>
      );
      break;
    case 'DASHBOARD':
    default:
      // Simple Dashboard
      const completedCount = matches.filter(m => m.isCompleted).length;
      const totalMatches = matches.length;
      const progress = Math.round((completedCount / totalMatches) * 100) || 0;
      
      const myMatches = appState.currentUser ? matches.filter(m => !m.isCompleted && (m.player1Id === appState.currentUser!.id || m.player2Id === appState.currentUser!.id)) : [];

      ContentComponent = (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full overflow-y-auto">
           {/* Welcome Widget */}
           <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-white/50">
              <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-1">Ciao, {appState.currentUser?.name}</h2>
                    <p className="text-gray-600 text-sm">
                        {appState.currentUser?.role === 'MASTER' ? 'Modalità Master Admin' : 'Pronto a vincere?'}
                    </p>
                  </div>
                  <img src={appState.currentUser?.avatar} className="w-12 h-12 rounded-full border-2 border-white shadow-md" alt="Avatar"/>
              </div>
              <div className="mt-6">
                <div className="flex justify-between text-sm mb-1 font-medium text-gray-500">
                    <span>Progresso Torneo</span>
                    <span>{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                </div>
                <div className="mt-2 text-xs text-right text-gray-400">{completedCount} / {totalMatches} match completati</div>
              </div>
           </div>

           {/* Quick Stats Widget */}
           <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-white/50 grid grid-cols-2 gap-4">
              <div className="bg-orange-100 p-4 rounded-xl flex flex-col items-center justify-center text-orange-800">
                  <span className="text-3xl font-bold">{players.length}</span>
                  <span className="text-xs uppercase font-bold mt-1">Atleti</span>
              </div>
              <div className="bg-blue-100 p-4 rounded-xl flex flex-col items-center justify-center text-blue-800">
                  <span className="text-3xl font-bold">{DISCIPLINES.length}</span>
                  <span className="text-xs uppercase font-bold mt-1">Discipline</span>
              </div>
           </div>

           {/* Next Matches (Personalized) */}
           <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-white/50 md:col-span-2">
               <h3 className="font-bold text-gray-700 mb-4 flex items-center"><PlayCircle className="mr-2" size={20}/> 
                    {appState.currentUser?.role === 'PLAYER' ? 'I Tuoi Prossimi Incontri' : 'Prossimi Incontri Globali'}
               </h3>
               <div className="space-y-2">
                   {(appState.currentUser?.role === 'PLAYER' && myMatches.length > 0 ? myMatches : matches.filter(m => !m.isCompleted)).slice(0, 3).map(m => {
                       const d = DISCIPLINES.find(x => x.id === m.disciplineId);
                       const p1 = players.find(p => p.id === m.player1Id);
                       const p2 = players.find(p => p.id === m.player2Id);
                       return (
                           <div key={m.id} className="flex items-center justify-between bg-white/70 p-3 rounded-lg border border-white/60">
                               <div className="flex items-center space-x-2">
                                   <span className="text-xl">{d?.icon}</span>
                                   <span className="text-sm font-medium">{d?.name}</span>
                               </div>
                               <div className="text-sm text-gray-800">
                                   <span className="font-semibold">{p1?.name}</span> vs <span className="font-semibold">{p2?.name}</span>
                               </div>
                           </div>
                       )
                   })}
                   {matches.filter(m => !m.isCompleted).length === 0 && <p className="text-center text-green-600 font-bold">Tutti gli incontri sono terminati!</p>}
                   {appState.currentUser?.role === 'PLAYER' && myMatches.length === 0 && matches.some(m => !m.isCompleted) && <p className="text-center text-gray-500">Non hai incontri programmati al momento.</p>}
               </div>
           </div>
        </div>
      );
  }

  return (
    <div className="relative w-full h-screen flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="h-8 bg-gray-900/90 backdrop-blur-md text-white flex items-center justify-between px-4 text-xs font-medium z-50 shadow-md">
        <div className="flex items-center space-x-4">
            <span className="font-bold"> Nolimpiadi</span>
            <span>File</span>
            <span>Modifica</span>
            <span>Vista</span>
        </div>
        <div className="flex items-center space-x-4">
            {appState.currentUser?.role === 'MASTER' && (
                <span className="flex items-center text-yellow-300 gap-1"><ShieldCheck size={12}/> Admin Mode</span>
            )}
            <span className="flex items-center gap-1 text-gray-300"><UserIcon size={10} /> {appState.currentUser?.username}</span>
            <span>{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        </div>
      </div>

      {/* Main Window Container */}
      <div className="flex-1 p-4 md:p-8 pb-24 overflow-hidden relative">
        <div className="w-full h-full max-w-6xl mx-auto flex flex-col">
            {/* Window Header */}
            <div className="h-full bg-white/60 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/40 flex flex-col overflow-hidden animate-fade-in">
                <div className="bg-white/60 px-4 py-3 flex items-center border-b border-white/30">
                    <div className="flex space-x-2 mr-4">
                        <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-sm"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500 shadow-sm"></div>
                    </div>
                    <div className="flex-1 text-center font-medium text-gray-800 text-sm">
                        {appState.view === 'DASHBOARD' && 'Dashboard'}
                        {appState.view === 'ADMIN_USERS' && 'Amministrazione Utenti'}
                        {appState.view === 'LIVE_BOARD' && 'Tabellone Live'}
                        {appState.view === 'MATCHES' && 'Calendario Incontri'}
                        {appState.view === 'STANDINGS' && 'Classifiche Ufficiali'}
                        {appState.view === 'FINALS' && 'Tabellone Finali'}
                        {appState.view === 'GEMINI' && 'AI Assistant'}
                    </div>
                    <div className="w-16"></div> {/* Spacer for centering */}
                </div>
                
                {/* Window Content */}
                <div className="flex-1 overflow-hidden p-4 md:p-6 bg-white/30">
                    {ContentComponent}
                </div>
            </div>
        </div>
      </div>

      {/* Dock */}
      <Dock 
        currentView={appState.view} 
        onChangeView={(v) => setAppState(prev => ({ ...prev, view: v }))}
        onLogout={() => setAppState({ view: 'LOGIN', currentUser: null })}
        isAdmin={appState.currentUser?.role === 'MASTER'}
      />
    </div>
  );
};

export default App;