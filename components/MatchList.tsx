import React, { useState, useMemo } from 'react';
import { Match, Player, Discipline, MatchPhase, User, Team } from '../types';
import { DISCIPLINES } from '../constants';
import { Save, Users as UsersIcon, Info, User as UserIcon } from 'lucide-react';

interface MatchListProps {
  matches: Match[];
  players: Player[];
  teams: Team[];
  currentUser: User | null;
  isAdmin: boolean;
  onUpdateScore: (matchId: string, s1: number, s2: number) => void;
}

export const MatchList: React.FC<MatchListProps> = ({ matches, players, teams, currentUser, isAdmin, onUpdateScore }) => {
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('ALL');
  const [selectedPhase, setSelectedPhase] = useState<MatchPhase | 'ALL'>('ALL');
  const [onlyMyMatches, setOnlyMyMatches] = useState(false);
  
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [tempScore1, setTempScore1] = useState<string>('');
  const [tempScore2, setTempScore2] = useState<string>('');

  const getTeam = (id: string) => teams.find(t => t.id === id);
  const getDiscipline = (id: string) => DISCIPLINES.find(d => d.id === id);
  
  // Helper to check if current user is involved (either as Individual or in a Team)
  const isUserInvolved = (participantId: string, userId: string) => {
      if (participantId === userId) return true; // Individual match
      const team = getTeam(participantId);
      return team?.playerIds.includes(userId); // Team match
  }

  const filteredMatches = useMemo(() => {
    return matches.filter(m => {
      const discMatch = selectedDiscipline === 'ALL' || m.disciplineId === selectedDiscipline;
      const phaseMatch = selectedPhase === 'ALL' || m.phase === selectedPhase;
      
      const userMatch = !onlyMyMatches || (currentUser && (isUserInvolved(m.player1Id, currentUser.id) || isUserInvolved(m.player2Id, currentUser.id)));
      
      return discMatch && phaseMatch && userMatch;
    });
  }, [matches, selectedDiscipline, selectedPhase, onlyMyMatches, currentUser, teams]);

  const startEditing = (match: Match) => {
    if (!isAdmin || match.isCompleted) return;
    setEditingMatchId(match.id);
    setTempScore1(match.score1?.toString() || '');
    setTempScore2(match.score2?.toString() || '');
  };

  const saveScore = (matchId: string) => {
    const s1 = parseInt(tempScore1);
    const s2 = parseInt(tempScore2);
    if (!isNaN(s1) && !isNaN(s2)) {
      onUpdateScore(matchId, s1, s2);
      setEditingMatchId(null);
    }
  };

  const renderParticipant = (id: string, align: 'left' | 'right') => {
      // 1. Try finding a Team (For Ping Pong / Calciobalilla Round Robin)
      const t = getTeam(id);
      if (t) {
        const p1 = players.find(p => p.id === t.playerIds[0]);
        const p2 = players.find(p => p.id === t.playerIds[1]);
        return (
            <div className={`flex flex-col ${align === 'right' ? 'items-end' : 'items-start'}`}>
                <span className={`font-bold text-xs md:text-base flex items-center gap-1 leading-tight ${align === 'right' ? 'flex-row-reverse md:flex-row' : ''}`}>
                    <span className="truncate max-w-[80px] md:max-w-full">{t.name}</span>
                    <UsersIcon size={12} className="text-gray-400 flex-shrink-0"/>
                </span>
                <span className="text-[10px] md:text-xs text-gray-500">
                    {p1?.name.split(' ')[0]} & {p2?.name.split(' ')[0]}
                </span>
            </div>
        );
      }

      // 2. Try finding a Player (Individual Sports or Finals)
      const p = players.find(x => x.id === id);
      if (p) {
          return (
            <div className={`flex items-center gap-1 md:gap-2 ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
                 <span className={`font-bold text-xs md:text-base truncate max-w-[100px] md:max-w-full`}>{p.name.split(' ')[0]} {p.name.split(' ')[1]?.charAt(0)}.</span>
                <UserIcon size={12} className="text-blue-500 flex-shrink-0"/>
            </div>
          );
      }

      return "TBD";
  };

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 md:gap-4 mb-4 md:mb-6 p-2 md:p-4 bg-white/60 rounded-xl border border-white/30 backdrop-blur-sm shadow-sm">
        <select
          value={selectedDiscipline}
          onChange={(e) => setSelectedDiscipline(e.target.value)}
          className="flex-1 min-w-[140px] bg-white/70 border border-gray-300 rounded-lg px-2 py-2 text-xs md:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">Tutte le Discipline</option>
          {DISCIPLINES.map(d => (
            <option key={d.id} value={d.id}>{d.icon} {d.name}</option>
          ))}
        </select>
        <select
          value={selectedPhase}
          onChange={(e) => setSelectedPhase(e.target.value as MatchPhase | 'ALL')}
          className="flex-1 min-w-[120px] bg-white/70 border border-gray-300 rounded-lg px-2 py-2 text-xs md:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">Tutte le Fasi</option>
          <option value="ROUND_ROBIN">Gironi</option>
          <option value="QUARTER_FINAL">Quarti</option>
          <option value="SEMI_FINAL">Semi</option>
          <option value="FINAL">Finali</option>
        </select>

        {currentUser && (
            <button
                onClick={() => setOnlyMyMatches(!onlyMyMatches)}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors border w-full md:w-auto ${
                    onlyMyMatches 
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                    : 'bg-white/70 text-gray-700 border-gray-300 hover:bg-white'
                }`}
            >
                <UsersIcon size={14} />
                Le Mie Partite
            </button>
        )}
      </div>

      {/* Match List */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-2 md:space-y-3 custom-scrollbar">
        {filteredMatches.length === 0 ? (
           <div className="text-center py-10 text-gray-700 bg-white/50 rounded-xl">Nessun incontro trovato con questi filtri.</div>
        ) : (
            filteredMatches.map(match => {
            const disc = getDiscipline(match.disciplineId);
            const isEditing = editingMatchId === match.id;
            
            // Highlight if current user belongs to one of the teams OR is the player
            const isMyMatch = currentUser && (isUserInvolved(match.player1Id, currentUser.id) || isUserInvolved(match.player2Id, currentUser.id));

            return (
                <div key={match.id} className={`relative flex flex-col p-3 md:p-4 rounded-xl border transition-all ${match.isCompleted ? 'bg-white/70 border-green-200' : 'bg-white/90 border-white/50 shadow-sm'} ${isMyMatch ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-white/0' : ''}`}>
                    
                    {/* Header: Discipline & Rules */}
                    <div className="flex justify-between items-center mb-2 border-b border-gray-100 pb-1">
                         <div className="flex items-center gap-2">
                             <span className={`${disc?.color} w-5 h-5 md:w-6 md:h-6 rounded flex items-center justify-center text-white text-[10px] md:text-xs`}>{disc?.icon}</span>
                             <span className="text-[10px] md:text-xs font-bold uppercase text-gray-500">{disc?.name}</span>
                         </div>
                         <div className="flex items-center gap-1 text-[10px] text-gray-400 bg-gray-100 px-2 py-1 rounded-full truncate max-w-[120px]">
                             <Info size={10} />
                             <span className="truncate">{disc?.rules}</span>
                         </div>
                    </div>

                    <div className="flex items-center justify-between gap-1 md:gap-4">
                        {/* Participant 1 */}
                        <div className="flex-1 text-right flex justify-end">
                            <span className={`block ${match.isCompleted && match.score1! > match.score2! ? 'text-black font-bold' : 'text-gray-800'} ${isUserInvolved(match.player1Id, currentUser?.id || '') ? 'text-blue-700' : ''}`}>
                                {renderParticipant(match.player1Id, 'right')}
                            </span>
                        </div>

                        {/* Score Board */}
                        <div className="flex items-center justify-center space-x-1 md:space-x-3 bg-gray-100/80 px-2 md:px-4 py-1 md:py-2 rounded-lg border border-gray-300 min-w-[80px] md:min-w-[120px]">
                        {isEditing ? (
                            <>
                            <input
                                type="number"
                                value={tempScore1}
                                onChange={(e) => setTempScore1(e.target.value)}
                                className="w-8 md:w-12 text-center bg-white border border-blue-400 rounded p-1 focus:ring-2 focus:ring-blue-500 outline-none text-black font-bold text-sm"
                                placeholder="0"
                            />
                            <span className="text-gray-500">-</span>
                            <input
                                type="number"
                                value={tempScore2}
                                onChange={(e) => setTempScore2(e.target.value)}
                                className="w-8 md:w-12 text-center bg-white border border-blue-400 rounded p-1 focus:ring-2 focus:ring-blue-500 outline-none text-black font-bold text-sm"
                                placeholder="0"
                            />
                            </>
                        ) : (
                            <>
                            <span className="text-lg md:text-xl font-bold w-6 md:w-8 text-center text-gray-900">{match.score1 ?? '-'}</span>
                            <span className="text-gray-500 text-[10px] md:text-sm flex flex-col items-center leading-none">
                                <span>{match.phase === 'ROUND_ROBIN' ? 'VS' : match.roundLabel?.substring(0,2)}</span>
                            </span>
                            <span className="text-lg md:text-xl font-bold w-6 md:w-8 text-center text-gray-900">{match.score2 ?? '-'}</span>
                            </>
                        )}
                        </div>

                        {/* Participant 2 */}
                        <div className="flex-1 text-left">
                            <span className={`block ${match.isCompleted && match.score2! > match.score1! ? 'text-black font-bold' : 'text-gray-800'} ${isUserInvolved(match.player2Id, currentUser?.id || '') ? 'text-blue-700' : ''}`}>
                                {renderParticipant(match.player2Id, 'left')}
                            </span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="absolute bottom-2 right-2 flex justify-end space-x-2">
                        {isAdmin && !match.isCompleted && !isEditing && (
                        <button
                            onClick={() => startEditing(match)}
                            className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-full transition-colors bg-white/80 shadow-sm"
                            title="Inserisci Risultato"
                        >
                            <div className="text-[10px] font-bold uppercase tracking-wider px-1">Edit</div>
                        </button>
                        )}
                        
                        {isAdmin && isEditing && (
                        <button
                            onClick={() => saveScore(match.id)}
                            className="p-1.5 text-green-600 hover:bg-green-100 rounded-full transition-colors bg-white shadow-sm"
                            title="Salva"
                        >
                            <Save size={16} />
                        </button>
                        )}
                    </div>
                </div>
            );
            })
        )}
      </div>
    </div>
  );
};
