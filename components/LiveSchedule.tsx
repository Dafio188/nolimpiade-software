import React, { useMemo, useEffect, useState } from 'react';
import { Match, Player, Team } from '../types';
import { DISCIPLINES } from '../constants';
import { StorageService } from '../services/storageService';
import { Clock, MapPin, AlertCircle } from 'lucide-react';

interface LiveScheduleProps {
  matches: Match[];
  players: Player[];
}

interface ScheduledMatch extends Match {
  startTime: string;
  startDate: Date; // Keep the full date object for comparison
  status: 'PLAYING' | 'UP_NEXT' | 'LATER';
}

export const LiveSchedule: React.FC<LiveScheduleProps> = ({ matches }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    setTeams(StorageService.getTeams());
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const getTeam = (id: string) => teams.find(t => t.id === id);

  // Advanced Algorithm: Time-Slot Simulation with Conflict Resolution
  const scheduleData = useMemo(() => {
    if (teams.length === 0) return [];

    const incompleteMatches = matches.filter(m => !m.isCompleted);
    const scheduled: ScheduledMatch[] = [];
    const MATCH_DURATION = 10; // minutes
    
    // Start simulation at 09:00 AM today
    let simTime = new Date();
    simTime.setHours(9, 0, 0, 0);

    // Track when each Field (Discipline) becomes free
    const fieldFreeUntil: Record<string, number> = {};
    DISCIPLINES.forEach(d => fieldFreeUntil[d.id] = simTime.getTime());

    // Track when each Team becomes free
    const teamFreeUntil: Record<string, number> = {};
    teams.forEach(t => teamFreeUntil[t.id] = simTime.getTime());

    // Working copy of matches to schedule
    let pendingMatches = [...incompleteMatches];
    
    // Safety break to prevent infinite loops (e.g. max 100 slots -> 16 hours)
    let safetyCounter = 0;
    
    // While there are matches to schedule
    while (pendingMatches.length > 0 && safetyCounter < 100) {
        
        // We try to fill the current time slot for ALL disciplines
        // Sort disciplines to ensure fair rotation or just fixed order
        DISCIPLINES.forEach(discipline => {
            const fieldReadyTime = fieldFreeUntil[discipline.id];
            
            // If this field is free at (or before) the current simulation time
            if (fieldReadyTime <= simTime.getTime()) {
                
                // Find the first match for this discipline where BOTH teams are available
                const matchIndex = pendingMatches.findIndex(m => {
                    if (m.disciplineId !== discipline.id) return false;
                    
                    const t1Ready = teamFreeUntil[m.player1Id] || 0;
                    const t2Ready = teamFreeUntil[m.player2Id] || 0;
                    
                    // Teams must be ready at or before current sim time
                    return t1Ready <= simTime.getTime() && t2Ready <= simTime.getTime();
                });

                if (matchIndex !== -1) {
                    // Match found! Schedule it.
                    const match = pendingMatches[matchIndex];
                    
                    // Calculate End Time
                    const endTime = simTime.getTime() + (MATCH_DURATION * 60000);
                    
                    // Update Availabilities
                    fieldFreeUntil[discipline.id] = endTime;
                    teamFreeUntil[match.player1Id] = endTime;
                    teamFreeUntil[match.player2Id] = endTime;

                    // Add to schedule
                    scheduled.push({
                        ...match,
                        startDate: new Date(simTime),
                        startTime: simTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        status: 'LATER' // Will update logic later based on real time
                    });

                    // Remove from pending
                    pendingMatches.splice(matchIndex, 1);
                }
            }
        });

        // Advance simulation clock by 10 minutes
        simTime = new Date(simTime.getTime() + (MATCH_DURATION * 60000));
        safetyCounter++;
    }

    // Post-process statuses based on real world time or simply by order
    // Since this is a "Projection", let's define status based on order in the list per discipline
    const finalSchedule = scheduled.map(m => {
        // Find how many matches of this discipline are before this one in the scheduled list
        const prevMatchesInDisc = scheduled.filter(s => s.disciplineId === m.disciplineId && s.startDate < m.startDate);
        
        let status: 'PLAYING' | 'UP_NEXT' | 'LATER' = 'LATER';
        if (prevMatchesInDisc.length === 0) status = 'PLAYING';
        else if (prevMatchesInDisc.length === 1) status = 'UP_NEXT';
        
        return { ...m, status };
    });

    return finalSchedule;
  }, [matches, teams]);

  const renderMatchCard = (match: ScheduledMatch) => {
    const t1 = getTeam(match.player1Id);
    const t2 = getTeam(match.player2Id);

    if (!t1 || !t2) return null;

    const isPlaying = match.status === 'PLAYING';

    return (
        <div key={match.id} className={`mb-3 rounded-xl border overflow-hidden shadow-sm transition-all ${isPlaying ? 'bg-white border-blue-500 shadow-md transform scale-105 ring-2 ring-blue-100 z-10' : 'bg-white/60 border-white/40'}`}>
            {isPlaying && (
                <div className="bg-blue-600 text-white text-[10px] font-bold uppercase py-1 px-2 text-center animate-pulse tracking-widest">
                    In Corso
                </div>
            )}
            <div className="p-2">
                <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-1 text-xs font-mono font-bold text-gray-500">
                        <Clock size={12} />
                        {match.startTime}
                    </div>
                </div>
                
                <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                        <span className={`font-bold truncate max-w-[120px] ${isPlaying ? 'text-sm text-gray-900' : 'text-xs text-gray-700'}`}>{t1.name}</span>
                        {isPlaying && <span className="text-[10px] text-gray-400">vs</span>}
                    </div>
                    {!isPlaying && <div className="text-[10px] text-gray-400 text-center">- vs -</div>}
                    <div className="flex justify-between items-center">
                        <span className={`font-bold truncate max-w-[120px] ${isPlaying ? 'text-sm text-gray-900' : 'text-xs text-gray-700'}`}>{t2.name}</span>
                    </div>
                </div>
            </div>
        </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-slate-100/50 rounded-xl overflow-hidden backdrop-blur-sm border border-white/40">
        {/* Header */}
        <div className="bg-gray-900 text-white p-4 flex justify-between items-center shadow-lg z-20">
            <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                    TABELLONE LIVE
                </h2>
                <div className="text-[10px] text-gray-400 flex items-center gap-1 mt-1">
                    <AlertCircle size={10} />
                    Algoritmo Anti-Conflitto Attivo (Un atleta non gioca mai su 2 campi)
                </div>
            </div>
            <div className="font-mono text-xl text-blue-300">
                {currentTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </div>
        </div>

        {/* Board Grid: 4 Columns for 4 Disciplines */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 h-full">
                {DISCIPLINES.map(discipline => {
                    // Filter matches specifically for this discipline/column
                    const fieldMatches = scheduleData.filter(m => m.disciplineId === discipline.id);
                    
                    return (
                        <div key={discipline.id} className="flex flex-col bg-gray-200/50 rounded-xl p-2 border border-gray-300/50 min-h-[300px]">
                            {/* Column Header */}
                            <div className={`text-center mb-3 ${discipline.color} text-white rounded-lg py-3 shadow-md border border-white/20`}>
                                <div className="flex flex-col items-center justify-center gap-1">
                                    <span className="text-2xl">{discipline.icon}</span>
                                    <span className="text-xs font-bold uppercase tracking-wider">{discipline.name}</span>
                                </div>
                            </div>

                            {/* Match List for this Field */}
                            <div className="flex-1 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
                                {fieldMatches.length > 0 ? (
                                    fieldMatches.map(renderMatchCard)
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
                                        <MapPin size={24} className="opacity-20" />
                                        <span className="text-xs">Campo Libero</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    </div>
  );
};
