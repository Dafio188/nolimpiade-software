import React, { useState, useEffect, useCallback } from 'react';
import { Match, AppState, DisciplineType, StandingRow, User, Team } from './types';
import { DISCIPLINES, WIN_POINTS, DRAW_POINTS, LOSS_POINTS } from './constants';
import { Dock } from './components/Dock';
import { MatchList } from './components/MatchList';
import { Standings } from './components/Standings';
import { FinalsView } from './components/Bracket';
import { UserManager } from './components/UserManager';
import { LiveSchedule } from './components/LiveSchedule'; 
import { AIAssistant } from './components/AIAssistant';
import { User as UserIcon, ShieldCheck, PlayCircle, Trophy, MessageSquareText, Loader2, AlertTriangle, ExternalLink, Copy, Check, KeyRound, WifiOff } from 'lucide-react';
import { StorageService } from './services/storageService';

const generateId = () => Math.random().toString(36).substr(2, 9);

const App: React.FC = () => {
  const [players, setPlayers] = useState<User[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [copiedRules, setCopiedRules] = useState(false);
  
  // Flag to trigger re-subscription when switching modes
  const [dataSourceMode, setDataSourceMode] = useState<'FIREBASE' | 'OFFLINE'>('FIREBASE');
  
  const [appState, setAppState] = useState<AppState>({ view: 'LOGIN', currentUser: null });
  
  // Chatbot State
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // Login State
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Initialize Data Subscriptions
  useEffect(() => {
    const handleError = (error: any) => {
        console.error("Firebase Connection Error:", error);
        // Specifically look for permission-denied or not-found (404)
        if (error.code === 'permission-denied') {
            setDbError("ACCESSO NEGATO: Le 'Regole di Sicurezza' del Database bloccano l'app. Devi aggiornarle nella Console Firebase.");
        } else if (error.code === 'not-found' || error.message?.includes('not-found')) {
             setDbError("DATABASE MANCANTE: Vai sulla Console Firebase e crea un database 'Firestore' (in modalità Test).");
        } else if (error.code === 'unavailable') {
             setDbError("OFFLINE: Impossibile raggiungere il server Firebase. Controlla la tua connessione internet.");
        } else {
            setDbError(`ERRORE DI CONNESSIONE: ${error.message || 'Errore sconosciuto'}`);
        }
        setLoading(false);
    };

    const initData = async () => {
        setLoading(true);
        try {
            await StorageService.init();
            setLoading(false);
        } catch (e: any) {
            handleError(e);
        }
    };
    initData();

    // Pass handleError to subscriptions
    const unsubUsers = StorageService.subscribeToUsers(setPlayers, handleError);
    const unsubTeams = StorageService.subscribeToTeams(setTeams, handleError);
    const unsubMatches = StorageService.subscribeToMatches(setMatches, handleError);

    return () => {
        unsubUsers();
        unsubTeams();
        unsubMatches();
    };
  }, [dataSourceMode]); // Re-run if we switch mode

  const handleEnableOffline = async () => {
      await StorageService.enableOfflineMode();
      setDbError(null);
      setDataSourceMode('OFFLINE');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
        const user = await StorageService.login(loginUser, loginPass);
        if (user) {
            setAppState({ view: 'DASHBOARD', currentUser: user });
            setLoginError('');
        } else {
            setLoginError('Credenziali non valide');
        }
    } catch (error) {
        setLoginError('Errore durante il login (Verifica DB)');
    } finally {
        setIsLoggingIn(false);
    }
  };

  const handleAddUser = (newUser: Omit<User, 'id'>) => {
      StorageService.addUser(newUser);
  };

  const handleUpdateUser = (updatedUser: User) => {
      StorageService.updateUser(updatedUser);
  };

  const handleDeleteUser = (userId: string) => {
      StorageService.deleteUser(userId);
  };

  const handleUpdateScore = useCallback((matchId: string, s1: number, s2: number) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    const winnerId = s1 > s2 ? match.player1Id : (s2 > s1 ? match.player2Id : undefined);
    const updatedMatch = { ...match, score1: s1, score2: s2, isCompleted: true, winnerId };
    
    StorageService.updateMatch(updatedMatch);
  }, [matches]);

  // Effect to propagate bracket winners automatically
  useEffect(() => {
    if (matches.length === 0) return;

    const nextMatches = [...matches];

    const updateBracketFlow = (discId: string) => {
        const qfA = nextMatches.find(m => m.disciplineId === discId && m.roundLabel === 'Quarti A');
        const qfB = nextMatches.find(m => m.disciplineId === discId && m.roundLabel === 'Quarti B');
        const semiA = nextMatches.find(m => m.disciplineId === discId && m.roundLabel === 'Semi A');
        const semiB = nextMatches.find(m => m.disciplineId === discId && m.roundLabel === 'Semi B');
        const final = nextMatches.find(m => m.disciplineId === discId && m.phase === 'FINAL');

        if (qfA?.isCompleted && qfA.winnerId && semiA && semiA.player2Id !== qfA.winnerId) {
            semiA.player2Id = qfA.winnerId;
            StorageService.updateMatch(semiA);
        }
        if (qfB?.isCompleted && qfB.winnerId && semiB && semiB.player2Id !== qfB.winnerId) {
            semiB.player2Id = qfB.winnerId;
            StorageService.updateMatch(semiB);
        }
        if (semiA?.isCompleted && semiA.winnerId && final && final.player1Id !== semiA.winnerId) {
            final.player1Id = semiA.winnerId;
            StorageService.updateMatch(final);
        }
        if (semiB?.isCompleted && semiB.winnerId && final && final.player2Id !== semiB.winnerId) {
            final.player2Id = semiB.winnerId;
            StorageService.updateMatch(final);
        }
    }

    DISCIPLINES.forEach(d => updateBracketFlow(d.id));
  }, [matches]);


  const generateBracket = (disciplineId: string) => {
    // Calculate INDIVIDUAL Standings for this discipline to determine Top 6 Players
    const stats: Record<string, StandingRow> = {};
    players.forEach(p => {
        stats[p.id] = { playerId: p.id, playerName: p.name, points: 0, played: 0, won: 0, wins: 0, lost: 0, diff: 0 };
    });

    const relevantMatches = matches.filter(m => m.disciplineId === disciplineId && m.isCompleted && m.phase === 'ROUND_ROBIN');
    
    relevantMatches.forEach(m => {
        const team1 = teams.find(t => t.id === m.player1Id);
        const team2 = teams.find(t => t.id === m.player2Id);
        if (!team1 || !team2 || m.score1 === null || m.score2 === null) return;

        let pts1 = 0; let pts2 = 0;
        let w1 = 0; let w2 = 0;
        const diff1 = m.score1 - m.score2;

        if (m.score1 > m.score2) { pts1 = WIN_POINTS; pts2 = LOSS_POINTS; w1 = 1; }
        else if (m.score2 > m.score1) { pts2 = WIN_POINTS; pts1 = LOSS_POINTS; w2 = 1; }
        else { pts1 = DRAW_POINTS; pts2 = DRAW_POINTS; }

        // Distribute to individuals
        team1.playerIds.forEach(pid => {
            if(stats[pid]) { stats[pid].points += pts1; stats[pid].diff += diff1; stats[pid].wins += w1; }
        });
        team2.playerIds.forEach(pid => {
            if(stats[pid]) { stats[pid].points += pts2; stats[pid].diff -= diff1; stats[pid].wins += w2; }
        });
    });

    const sorted = Object.values(stats).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return b.diff - a.diff;
    });

    // Take top 6 INDIVIDUAL PLAYERS
    const top6 = sorted.slice(0, 6);
    if (top6.length < 6) {
        alert("Non ci sono abbastanza giocatori o partite per generare le finali.");
        return;
    }

    // Check if finals already exist
    if (matches.some(m => m.disciplineId === disciplineId && m.phase !== 'ROUND_ROBIN')) {
        alert("Tabellone finali già generato per questa disciplina.");
        return;
    }

    const newMatches: Match[] = [];
    
    // QF A: 4th vs 5th (Individual)
    newMatches.push({
        id: generateId(), disciplineId: disciplineId as DisciplineType,
        player1Id: top6[3].playerId, player2Id: top6[4].playerId,
        score1: null, score2: null, isCompleted: false, phase: 'QUARTER_FINAL', roundLabel: 'Quarti A'
    });
    // QF B: 3rd vs 6th (Individual)
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

    StorageService.saveMatchesBatch([...matches, ...newMatches]);
  };

  // Critical Error Screen (Missing DB/Permissions)
  if (dbError) {
      const rulesCode = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`;
      const copyRules = () => {
          navigator.clipboard.writeText(rulesCode);
          setCopiedRules(true);
          setTimeout(() => setCopiedRules(false), 2000);
      };

      return (
          <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-6 text-center">
              <div className="bg-red-500/20 p-4 rounded-full mb-6 ring-4 ring-red-500/30">
                <AlertTriangle size={64} className="text-red-500" />
              </div>
              <h1 className="text-2xl font-bold mb-4 text-red-100">Ops! Problemi con il Cloud</h1>
              <p className="text-gray-300 max-w-lg mb-8 leading-relaxed">
                  Sembra che la configurazione di Firebase abbia qualche problema o che tu non abbia ancora creato il database.
              </p>
              
              <div className="flex flex-col gap-4 w-full max-w-md">
                 <button 
                    onClick={handleEnableOffline} 
                    className="flex items-center justify-center gap-2 px-8 py-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold shadow-lg shadow-green-900/50 transition-transform active:scale-95 text-lg"
                 >
                    <WifiOff size={24} />
                    Usa Versione Offline
                    <span className="text-xs bg-green-800 px-2 py-0.5 rounded text-green-100 font-normal">Senza Cloud</span>
                </button>
                <p className="text-xs text-gray-500 mt-1">I dati verranno salvati solo su questo dispositivo.</p>

                <div className="my-4 border-t border-gray-700 relative">
                     <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-900 px-2 text-gray-500 text-xs">OPPURE RISOLVI IL PROBLEMA</span>
                </div>

                <div className="w-full text-left bg-black/50 rounded-xl p-6 border border-gray-700 shadow-2xl mb-2">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-700 pb-2">Admin: Aggiorna Regole DB</h3>
                  <div className="relative group">
                    <pre className="bg-gray-950 p-4 rounded-lg text-green-400 font-mono text-xs md:text-sm overflow-x-auto border border-gray-800">
                        {rulesCode}
                    </pre>
                    <button 
                        onClick={copyRules}
                        className="absolute top-2 right-2 p-2 bg-gray-800 hover:bg-gray-700 text-white rounded-md shadow-sm transition-colors flex items-center gap-2"
                        title="Copia codice"
                    >
                        {copiedRules ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                        <span className="text-xs font-bold">{copiedRules ? 'Copiato!' : 'Copia'}</span>
                    </button>
                  </div>
                   <div className="flex justify-center mt-4">
                        <button onClick={() => window.location.reload()} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-md text-sm">
                            Ho Aggiornato, Riprova
                        </button>
                    </div>
              </div>
              </div>
          </div>
      )
  }

  // Views
  if (appState.view === 'LOGIN') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black/40 backdrop-blur-sm p-4">
        <div className="w-full max-w-md bg-white/90 p-8 rounded-3xl shadow-2xl backdrop-blur-md border border-white/50 text-center animate-fade-in relative overflow-hidden">
          {/* Default Credentials Hint */}
          <div className="absolute top-0 left-0 w-full bg-yellow-100 text-yellow-800 text-[10px] py-1 font-bold tracking-wide border-b border-yellow-200 flex justify-between px-4">
              <span>MODALITÀ DEMO</span>
              {dataSourceMode === 'OFFLINE' && <span className="flex items-center gap-1"><WifiOff size={8} /> OFFLINE MODE</span>}
          </div>

          <div className="mb-6 flex justify-center mt-4">
            <div className={`bg-gradient-to-br p-4 rounded-2xl shadow-lg ${dataSourceMode === 'OFFLINE' ? 'from-green-500 to-teal-600' : 'from-blue-500 to-purple-600'}`}>
                {dataSourceMode === 'OFFLINE' ? <WifiOff size={48} className="text-white" /> : <Trophy size={48} className="text-white" />}
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Nolimpiadi OS</h1>
          <p className="text-gray-500 mb-6">
              {dataSourceMode === 'OFFLINE' ? 'Accesso Locale (Dati salvati sul device)' : 'Accesso Atleti & Master (Cloud)'}
          </p>
          
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
              disabled={isLoggingIn || loading}
              className={`w-full py-3 text-white rounded-xl font-semibold shadow-lg transition-transform active:scale-95 flex justify-center items-center gap-2 ${dataSourceMode === 'OFFLINE' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {isLoggingIn || loading ? <Loader2 className="animate-spin" size={20} /> : 'Entra'}
            </button>
          </form>

          {/* Credentials Helper */}
          <div className="mt-8 p-3 bg-gray-50 rounded-xl border border-gray-200 text-left">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase mb-2">
                  <KeyRound size={14} /> Credenziali di Default
              </div>
              <div className="flex justify-between items-center text-sm mb-1">
                  <span className="text-gray-600">Username:</span>
                  <span className="font-mono font-bold text-gray-900 bg-gray-200 px-2 py-0.5 rounded cursor-pointer hover:bg-blue-100 transition-colors" onClick={() => setLoginUser('Fioda')}>Fioda</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Password:</span>
                  <span className="font-mono font-bold text-gray-900 bg-gray-200 px-2 py-0.5 rounded cursor-pointer hover:bg-blue-100 transition-colors" onClick={() => setLoginPass('admin123')}>admin123</span>
              </div>
          </div>
          
          <div className="mt-6 text-xs text-gray-400">
             Cloud System Ready v3.0 {dataSourceMode === 'OFFLINE' && '(Offline)'}
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
      ContentComponent = <LiveSchedule matches={matches} players={players} teams={teams} />;
      break;
    case 'MATCHES':
      ContentComponent = <MatchList matches={matches} players={players} teams={teams} currentUser={appState.currentUser} isAdmin={appState.currentUser?.role === 'MASTER'} onUpdateScore={handleUpdateScore} />;
      break;
    case 'STANDINGS':
      ContentComponent = <Standings players={players} matches={matches} teams={teams} currentUser={appState.currentUser} />;
      break;
    case 'FINALS':
      ContentComponent = <FinalsView matches={matches} players={players} isAdmin={appState.currentUser?.role === 'MASTER'} onGenerateBracket={generateBracket} disciplineId="PING_PONG" />;
      break;
    case 'DASHBOARD':
    default:
      // Simple Dashboard
      const completedCount = matches.filter(m => m.isCompleted).length;
      const totalMatches = matches.length;
      const progress = totalMatches > 0 ? Math.round((completedCount / totalMatches) * 100) : 0;
      
      // Determine my matches (Individual or via Team)
      const myMatches = appState.currentUser ? matches.filter(m => {
          if (m.isCompleted) return false;
          // Check if I am Player1 or Player2 (Individual match)
          if (m.player1Id === appState.currentUser!.id || m.player2Id === appState.currentUser!.id) return true;
          // Check if I am in Team1 or Team2
          const t1 = teams.find(t => t.id === m.player1Id);
          const t2 = teams.find(t => t.id === m.player2Id);
          return t1?.playerIds.includes(appState.currentUser!.id) || t2?.playerIds.includes(appState.currentUser!.id);
      }) : [];

      ContentComponent = (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 h-full overflow-y-auto pb-4 custom-scrollbar">
           {/* Welcome Widget */}
           <div className="bg-white/80 backdrop-blur-md p-4 md:p-6 rounded-2xl shadow-sm border border-white/50">
              <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-1">Ciao, {appState.currentUser?.name.split(' ')[0]}</h2>
                    <p className="text-gray-600 text-xs md:text-sm">
                        {appState.currentUser?.role === 'MASTER' ? 'Modalità Admin' : 'Pronto a vincere?'}
                    </p>
                  </div>
                  <img src={appState.currentUser?.avatar} className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-white shadow-md" alt="Avatar"/>
              </div>
              <div className="mt-4 md:mt-6">
                <div className="flex justify-between text-sm mb-1 font-medium text-gray-500">
                    <span>Progresso Torneo</span>
                    <span>{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className={`h-2.5 rounded-full ${dataSourceMode === 'OFFLINE' ? 'bg-green-600' : 'bg-blue-600'}`} style={{ width: `${progress}%` }}></div>
                </div>
                <div className="mt-2 text-xs text-right text-gray-400">{completedCount} / {totalMatches} completati</div>
              </div>
           </div>

           {/* Quick Stats Widget */}
           <div className="bg-white/80 backdrop-blur-md p-4 md:p-6 rounded-2xl shadow-sm border border-white/50 grid grid-cols-2 gap-3 md:gap-4">
              <div className="bg-orange-100 p-3 md:p-4 rounded-xl flex flex-col items-center justify-center text-orange-800">
                  <span className="text-2xl md:text-3xl font-bold">{players.length}</span>
                  <span className="text-[10px] md:text-xs uppercase font-bold mt-1">Atleti</span>
              </div>
              <div className="bg-blue-100 p-3 md:p-4 rounded-xl flex flex-col items-center justify-center text-blue-800">
                  <span className="text-2xl md:text-3xl font-bold">{DISCIPLINES.length}</span>
                  <span className="text-[10px] md:text-xs uppercase font-bold mt-1">Discipline</span>
              </div>
           </div>

           {/* Next Matches (Personalized) */}
           <div className="bg-white/80 backdrop-blur-md p-4 md:p-6 rounded-2xl shadow-sm border border-white/50 md:col-span-2">
               <h3 className="font-bold text-gray-700 mb-4 flex items-center text-sm md:text-base"><PlayCircle className="mr-2" size={18}/> 
                    {appState.currentUser?.role === 'PLAYER' ? 'I Tuoi Prossimi Incontri' : 'Prossimi Incontri Globali'}
               </h3>
               <div className="space-y-2">
                   {(appState.currentUser?.role === 'PLAYER' && myMatches.length > 0 ? myMatches : matches.filter(m => !m.isCompleted)).slice(0, 3).map(m => {
                       const d = DISCIPLINES.find(x => x.id === m.disciplineId);
                       
                       // Generic name resolver
                       const resolveName = (id: string) => {
                           const t = teams.find(x => x.id === id);
                           if(t) return t.name;
                           const p = players.find(x => x.id === id);
                           return p ? p.name : 'TBD';
                       }

                       const n1 = resolveName(m.player1Id);
                       const n2 = resolveName(m.player2Id);

                       return (
                           <div key={m.id} className="flex items-center justify-between bg-white/70 p-3 rounded-lg border border-white/60">
                               <div className="flex items-center space-x-2">
                                   <span className="text-lg md:text-xl">{d?.icon}</span>
                                   <span className="text-xs md:text-sm font-medium">{d?.name}</span>
                               </div>
                               <div className="text-xs md:text-sm text-gray-800 flex flex-col md:flex-row md:gap-1 text-right md:text-left">
                                   <span className="font-semibold">{n1}</span> 
                                   <span className="text-gray-400 hidden md:inline">vs</span>
                                   <span className="text-gray-400 md:hidden text-[10px] text-center">vs</span>
                                   <span className="font-semibold">{n2}</span>
                               </div>
                           </div>
                       )
                   })}
                   {matches.length > 0 && matches.filter(m => !m.isCompleted).length === 0 && <p className="text-center text-green-600 font-bold text-sm">Tutti gli incontri sono terminati!</p>}
                   {appState.currentUser?.role === 'PLAYER' && myMatches.length === 0 && matches.some(m => !m.isCompleted) && <p className="text-center text-gray-500 text-sm">Non hai incontri programmati al momento.</p>}
               </div>
           </div>
        </div>
      );
  }

  return (
    <div className="relative w-full h-screen flex flex-col overflow-hidden">
      {/* Top Bar - Simplified for Mobile */}
      <div className="h-8 bg-gray-900/90 backdrop-blur-md text-white flex items-center justify-between px-4 text-xs font-medium z-50 shadow-md flex-shrink-0">
        <div className="flex items-center space-x-4">
            <span className="font-bold"> Nolimpiadi Cloud {dataSourceMode === 'OFFLINE' ? '(Local)' : ''}</span>
            <span className="hidden md:inline">File</span>
            <span className="hidden md:inline">Modifica</span>
            <span className="hidden md:inline">Vista</span>
        </div>
        <div className="flex items-center space-x-4">
            {appState.currentUser?.role === 'MASTER' && (
                <span className="flex items-center text-yellow-300 gap-1"><ShieldCheck size={12}/> <span className="hidden md:inline">Admin</span></span>
            )}
            <span className="flex items-center gap-1 text-gray-300"><UserIcon size={10} /> {appState.currentUser?.username}</span>
            <span className="hidden md:inline">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        </div>
      </div>

      {/* Main Window Container */}
      <div className="flex-1 p-2 md:p-8 pb-20 md:pb-24 overflow-hidden relative">
        <div className="w-full h-full max-w-6xl mx-auto flex flex-col">
            {/* Window Header */}
            <div className="h-full bg-white/60 backdrop-blur-xl rounded-xl md:rounded-2xl shadow-2xl border border-white/40 flex flex-col overflow-hidden animate-fade-in">
                <div className="bg-white/60 px-3 py-2 md:px-4 md:py-3 flex items-center border-b border-white/30 flex-shrink-0">
                    <div className="flex space-x-1.5 md:space-x-2 mr-4">
                        <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-red-500 shadow-sm"></div>
                        <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-yellow-500 shadow-sm"></div>
                        <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-green-500 shadow-sm"></div>
                    </div>
                    <div className="flex-1 text-center font-medium text-gray-800 text-xs md:text-sm truncate px-2">
                        {appState.view === 'DASHBOARD' && 'Dashboard'}
                        {appState.view === 'ADMIN_USERS' && 'Amministrazione Utenti'}
                        {appState.view === 'LIVE_BOARD' && 'Tabellone Live'}
                        {appState.view === 'MATCHES' && 'Calendario Incontri'}
                        {appState.view === 'STANDINGS' && 'Classifiche Ufficiali'}
                        {appState.view === 'FINALS' && 'Tabellone Finali'}
                    </div>
                    <div className="w-10 md:w-16"></div> {/* Spacer for centering */}
                </div>
                
                {/* Window Content */}
                <div className="flex-1 overflow-hidden p-2 md:p-6 bg-white/30">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-3">
                            <Loader2 size={40} className="animate-spin text-blue-600" />
                            <p>Sincronizzazione dati...</p>
                        </div>
                    ) : (
                        ContentComponent
                    )}
                </div>
            </div>
        </div>
      </div>

      {/* Global AI Chatbot Widget */}
      {isChatOpen && (
          <div className="fixed bottom-20 right-2 left-2 md:left-auto md:right-8 md:bottom-24 md:w-80 h-[50vh] md:h-96 rounded-2xl shadow-2xl z-[60] overflow-hidden animate-fade-in ring-2 ring-white/50">
              <AIAssistant players={players} matches={matches} teams={teams} onClose={() => setIsChatOpen(false)} />
          </div>
      )}

      {/* Floating Chat Button (FAB) */}
      <button 
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="fixed bottom-20 right-4 md:bottom-24 md:right-8 z-50 p-3 md:p-4 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg transition-transform hover:scale-110 active:scale-95 flex items-center justify-center border-2 border-white/20"
      >
        <MessageSquareText size={20} className="md:w-6 md:h-6" />
      </button>

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