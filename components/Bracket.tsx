import React, { useState } from 'react';
import { Match, Player, Discipline } from '../types';
import { DISCIPLINES } from '../constants';

interface BracketProps {
  disciplineId: string;
  matches: Match[];
  players: Player[];
  onGenerateBracket: (disciplineId: string) => void;
  isAdmin: boolean;
}

const BracketNode: React.FC<{ match?: Match, players: Player[], label: string }> = ({ match, players, label }) => {
  const p1 = players.find(p => p.id === match?.player1Id);
  const p2 = players.find(p => p.id === match?.player2Id);
  
  // Fake empty nodes if match doesn't exist yet
  const showP1 = p1 ? p1.name : (match ? 'TBD' : '-');
  const showP2 = p2 ? p2.name : (match ? 'TBD' : '-');
  const s1 = match?.score1 ?? '';
  const s2 = match?.score2 ?? '';

  const winnerId = match?.winnerId;

  return (
    <div className="flex flex-col bg-white/90 backdrop-blur-sm border border-white/50 rounded-lg shadow-md w-48 overflow-hidden my-2">
      <div className="bg-gray-100 px-2 py-1 text-[10px] uppercase text-gray-600 font-bold border-b border-gray-200">
        {match?.roundLabel || label}
      </div>
      <div className={`flex justify-between items-center px-3 py-2 border-b border-gray-100 ${winnerId === p1?.id ? 'bg-green-100/50' : ''}`}>
        <span className={`text-sm truncate ${winnerId === p1?.id ? 'font-bold text-black' : 'text-gray-800'}`}>{showP1}</span>
        <span className="font-mono font-bold text-gray-900 text-sm">{s1}</span>
      </div>
      <div className={`flex justify-between items-center px-3 py-2 ${winnerId === p2?.id ? 'bg-green-100/50' : ''}`}>
        <span className={`text-sm truncate ${winnerId === p2?.id ? 'font-bold text-black' : 'text-gray-800'}`}>{showP2}</span>
        <span className="font-mono font-bold text-gray-900 text-sm">{s2}</span>
      </div>
    </div>
  );
};

export const Bracket: React.FC<BracketProps> = ({ disciplineId, matches, players, onGenerateBracket, isAdmin }) => {
    
    // Filter matches for this discipline's bracket
    const bracketMatches = matches.filter(m => m.disciplineId === disciplineId && m.phase !== 'ROUND_ROBIN');
    
    // Structure:
    // QF1: 4th vs 5th
    // QF2: 3rd vs 6th
    // SF1: 1st vs Winner QF1
    // SF2: 2nd vs Winner QF2
    // FINAL: Winner SF1 vs Winner SF2

    const qf1 = bracketMatches.find(m => m.roundLabel === 'Quarti A');
    const qf2 = bracketMatches.find(m => m.roundLabel === 'Quarti B');
    const sf1 = bracketMatches.find(m => m.roundLabel === 'Semi A');
    const sf2 = bracketMatches.find(m => m.roundLabel === 'Semi B');
    const final = bracketMatches.find(m => m.phase === 'FINAL');

    return (
        <div className="flex flex-col h-full overflow-x-auto">
            {bracketMatches.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-800 bg-white/40 rounded-xl p-6">
                    <p className="mb-4 font-medium">Il tabellone finale non è ancora stato generato.</p>
                    {isAdmin && (
                        <button 
                            onClick={() => onGenerateBracket(disciplineId)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full shadow-lg transition-transform hover:scale-105"
                        >
                            Genera Tabellone (Top 6)
                        </button>
                    )}
                </div>
            ) : (
                <div className="flex items-center justify-start min-w-[600px] h-full p-8 gap-8">
                     {/* Round 1: Quarter Finals */}
                     <div className="flex flex-col justify-center gap-16">
                        <div className="relative">
                             <BracketNode match={qf1} players={players} label="Quarti A (4° vs 5°)" />
                             <div className="absolute top-1/2 -right-8 w-8 h-px bg-gray-500"></div>
                        </div>
                        <div className="relative">
                            <BracketNode match={qf2} players={players} label="Quarti B (3° vs 6°)" />
                            <div className="absolute top-1/2 -right-8 w-8 h-px bg-gray-500"></div>
                        </div>
                     </div>

                     {/* Round 2: Semi Finals (Seeds 1 and 2 wait here) */}
                     <div className="flex flex-col justify-around h-full py-10">
                        <div className="relative">
                             <BracketNode match={sf1} players={players} label="Semi A (1° vs QA)" />
                             <div className="absolute top-1/2 -right-8 w-8 h-px bg-gray-500"></div>
                             {/* Connector lines logic omitted for brevity, keeping simple horizontal lines */}
                        </div>
                        <div className="relative">
                             <BracketNode match={sf2} players={players} label="Semi B (2° vs QB)" />
                             <div className="absolute top-1/2 -right-8 w-8 h-px bg-gray-500"></div>
                        </div>
                     </div>

                     {/* Round 3: Finals */}
                     <div className="flex flex-col justify-center">
                        <BracketNode match={final} players={players} label="FINALE" />
                     </div>
                </div>
            )}
        </div>
    );
}

export const FinalsView: React.FC<BracketProps> = (props) => {
    const [selectedDisc, setSelectedDisc] = useState(DISCIPLINES[0].id);

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-center space-x-4 mb-4">
                {DISCIPLINES.map(d => (
                    <button
                        key={d.id}
                        onClick={() => setSelectedDisc(d.id)}
                        className={`p-2 rounded-full transition-all ${selectedDisc === d.id ? d.color + ' text-white scale-110 shadow-md' : 'bg-white/60 text-gray-500 hover:bg-white/90 hover:text-gray-800'}`}
                    >
                        {d.icon}
                    </button>
                ))}
            </div>
            <div className="flex-1 bg-white/40 rounded-xl border border-white/20 backdrop-blur-sm overflow-hidden">
                <Bracket {...props} disciplineId={selectedDisc} />
            </div>
        </div>
    )
}