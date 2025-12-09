import React, { useMemo, useState, useEffect } from 'react';
import { Player, StandingRow, Discipline, Match, User, Team } from '../types';
import { DISCIPLINES, WIN_POINTS, DRAW_POINTS, LOSS_POINTS } from '../constants';
import { Trophy, Wand2, User as UserIcon } from 'lucide-react';
import { analyzeStandings } from '../services/geminiService';
import { StorageService } from '../services/storageService';

interface StandingsProps {
  players: Player[];
  matches: Match[];
  currentUser: User | null;
}

export const Standings: React.FC<StandingsProps> = ({ players, matches, currentUser }) => {
  const [activeTab, setActiveTab] = useState<string>(DISCIPLINES[0].id);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);

  useEffect(() => {
      setTeams(StorageService.getTeams());
  }, []);

  // Calculate INDIVIDUAL standings
  const calculateStandings = (disciplineId: string): StandingRow[] => {
    // Initialize stats for PLAYERS (Individual Ranking)
    const stats: Record<string, StandingRow> = {};
    players.forEach(p => {
      stats[p.id] = {
        playerId: p.id,
        playerName: p.name,
        points: 0,
        played: 0,
        won: 0,
        wins: 0,
        lost: 0,
        diff: 0,
        isCurrentUser: currentUser ? p.id === currentUser.id : false
      };
    });

    const relevantMatches = matches.filter(
      m => m.disciplineId === disciplineId && m.isCompleted && m.phase === 'ROUND_ROBIN'
    );

    relevantMatches.forEach(m => {
      // Resolve Teams
      const team1 = teams.find(t => t.id === m.player1Id);
      const team2 = teams.find(t => t.id === m.player2Id);
      
      if (!team1 || !team2 || m.score1 === null || m.score2 === null) return;

      const score1 = m.score1;
      const score2 = m.score2;
      const diff1 = score1 - score2;
      const diff2 = score2 - score1;

      // Determine Points for this match
      let pts1 = 0;
      let pts2 = 0;
      let w1 = 0, l1 = 0, w2 = 0, l2 = 0;

      if (score1 > score2) { pts1 = WIN_POINTS; pts2 = LOSS_POINTS; w1 = 1; l2 = 1; }
      else if (score2 > score1) { pts2 = WIN_POINTS; pts1 = LOSS_POINTS; w2 = 1; l1 = 1; }
      else { pts1 = DRAW_POINTS; pts2 = DRAW_POINTS; }

      // Distribute stats to INDIVIDUAL players of Team 1
      team1.playerIds.forEach(pid => {
          if (stats[pid]) {
              stats[pid].played += 1;
              stats[pid].points += pts1;
              stats[pid].diff += diff1;
              stats[pid].won += w1;
              stats[pid].wins += w1;
              stats[pid].lost += l1;
          }
      });

      // Distribute stats to INDIVIDUAL players of Team 2
      team2.playerIds.forEach(pid => {
          if (stats[pid]) {
              stats[pid].played += 1;
              stats[pid].points += pts2;
              stats[pid].diff += diff2;
              stats[pid].won += w2;
              stats[pid].wins += w2;
              stats[pid].lost += l2;
          }
      });
    });

    return Object.values(stats).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return b.diff - a.diff; // Tie breaker: Goal/Point difference
    });
  };

  const currentStandings = useMemo(() => calculateStandings(activeTab), [activeTab, matches, currentUser, teams, players]);

  // Overall Standings
  const overallStandings = useMemo(() => {
    const overall: Record<string, StandingRow> = {};
    players.forEach(p => {
      overall[p.id] = {
        playerId: p.id,
        playerName: p.name,
        points: 0,
        played: 0,
        won: 0,
        wins: 0,
        lost: 0,
        diff: 0,
        isCurrentUser: currentUser ? p.id === currentUser.id : false
      };
    });

    DISCIPLINES.forEach(d => {
        const dStandings = calculateStandings(d.id);
        dStandings.forEach(row => {
            const total = overall[row.playerId];
            if(total) {
                total.points += row.points;
                total.played += row.played;
                total.won += row.won;
                total.lost += row.lost;
                total.diff += row.diff;
            }
        })
    });

     return Object.values(overall).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return b.diff - a.diff;
    });

  }, [matches, currentUser, teams, players]);


  const displayedStandings = activeTab === 'OVERALL' ? overallStandings : currentStandings;
  const activeDiscipline = DISCIPLINES.find(d => d.id === activeTab);

  const handleAIAnalysis = async () => {
    setLoadingAI(true);
    const textData = displayedStandings.slice(0, 12).map((r, i) => `${i+1}. ${r.playerName}: ${r.points}pt`).join('\n');
    const disciplineName = activeTab === 'OVERALL' ? "Classifica Generale Individuale" : activeDiscipline?.name || "";
    
    const analysis = await analyzeStandings(textData, disciplineName);
    setAiAnalysis(analysis);
    setLoadingAI(false);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex space-x-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        <button
            onClick={() => { setActiveTab('OVERALL'); setAiAnalysis(null); }}
            className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all whitespace-nowrap ${
                activeTab === 'OVERALL'
                ? 'bg-gray-800 text-white shadow-lg'
                : 'bg-white/80 hover:bg-white text-gray-800'
            }`}
        >
            <Trophy size={18} className="text-yellow-400" />
            <span>Generale</span>
        </button>
        {DISCIPLINES.map(d => (
          <button
            key={d.id}
            onClick={() => { setActiveTab(d.id); setAiAnalysis(null); }}
            className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all whitespace-nowrap ${
              activeTab === d.id
                ? `${d.color} text-white shadow-lg`
                : 'bg-white/80 hover:bg-white text-gray-800'
            }`}
          >
            <span>{d.icon}</span>
            <span>{d.name}</span>
          </button>
        ))}
      </div>

       {/* AI Analysis Box */}
       {aiAnalysis && (
        <div className="mb-4 p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-900 flex justify-between items-start animate-fade-in text-sm shadow-md">
             <div className="flex gap-2">
                <Wand2 className="w-5 h-5 mt-1 flex-shrink-0" />
                <p>{aiAnalysis}</p>
            </div>
            <button onClick={() => setAiAnalysis(null)} className="text-xs hover:underline ml-2">X</button>
        </div>
      )}

      {/* Table Window */}
      <div className="flex-1 overflow-hidden bg-white/80 backdrop-blur-md rounded-xl shadow-inner border border-white/50 flex flex-col">
        <div className="overflow-y-auto flex-1">
            <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-gray-50/90 backdrop-blur-sm z-10 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <tr>
                <th className="px-6 py-4 border-b border-gray-300">Pos</th>
                <th className="px-6 py-4 border-b border-gray-300">Atleta</th>
                <th className="px-6 py-4 border-b border-gray-300 text-center">PT</th>
                <th className="px-6 py-4 border-b border-gray-300 text-center hidden sm:table-cell">G</th>
                <th className="px-6 py-4 border-b border-gray-300 text-center hidden sm:table-cell">V</th>
                <th className="px-6 py-4 border-b border-gray-300 text-center hidden sm:table-cell">P</th>
                <th className="px-6 py-4 border-b border-gray-300 text-center hidden sm:table-cell">Diff</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
                {displayedStandings.map((row, index) => {
                const isQualifying = activeTab !== 'OVERALL' && index < 6; // Top 6 Individual qualify
                
                const player = players.find(p => p.id === row.playerId);
                
                return (
                    <tr key={row.playerId} className={`hover:bg-blue-50/50 transition-colors ${isQualifying ? 'bg-green-50/50' : ''} ${row.isCurrentUser ? 'bg-yellow-100/80 border-l-4 border-yellow-400' : ''}`}>
                    <td className="px-6 py-3 whitespace-nowrap">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                        index === 0 ? 'bg-yellow-100 text-yellow-700' :
                        index === 1 ? 'bg-gray-100 text-gray-700' :
                        index === 2 ? 'bg-orange-100 text-orange-700' : 'text-gray-500'
                        }`}>
                        {index + 1}
                        </div>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                         <div className="flex items-center gap-3">
                             <img src={player?.avatar} alt="" className="w-8 h-8 rounded-full border border-gray-200" />
                             <div className={`font-medium ${row.isCurrentUser ? 'text-black font-bold' : 'text-gray-900'}`}>{row.playerName} {row.isCurrentUser && '(Tu)'}</div>
                         </div>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-center font-bold text-lg text-blue-700">
                        {row.points}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-center text-gray-600 hidden sm:table-cell">{row.played}</td>
                    <td className="px-6 py-3 whitespace-nowrap text-center text-gray-600 hidden sm:table-cell">{row.won}</td>
                    <td className="px-6 py-3 whitespace-nowrap text-center text-gray-600 hidden sm:table-cell">{row.lost}</td>
                    <td className="px-6 py-3 whitespace-nowrap text-center text-gray-500 text-sm hidden sm:table-cell">
                        {row.diff > 0 ? `+${row.diff}` : row.diff}
                    </td>
                    </tr>
                );
                })}
            </tbody>
            </table>
        </div>
      </div>
       <div className="mt-2 flex justify-between items-center text-xs text-gray-500 px-2">
            <span>*Si qualificano i primi 6 atleti per le finali 1vs1.</span>
           <button 
                onClick={handleAIAnalysis} 
                disabled={loadingAI}
                className="flex items-center gap-2 font-medium text-indigo-700 hover:bg-indigo-100 px-3 py-2 rounded-lg transition-colors bg-white/50"
           >
                <Wand2 size={14} />
                {loadingAI ? 'Sto analizzando...' : 'Analisi AI'}
           </button>
       </div>
    </div>
  );
};
