import React from 'react';
import { Trophy, Calendar, LayoutDashboard, LogOut, Users, MonitorPlay } from 'lucide-react';
import { AppState } from '../types';

interface DockProps {
  currentView: AppState['view'];
  onChangeView: (view: AppState['view']) => void;
  onLogout: () => void;
  isAdmin: boolean;
}

const DockItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
  color?: string;
}> = ({ icon, label, isActive, onClick, color = 'bg-gradient-to-br from-blue-500 to-blue-600' }) => (
  <button
    onClick={onClick}
    className={`group relative flex flex-col items-center justify-center p-1 md:p-2 transition-all duration-300 ease-out flex-shrink-0 ${
      isActive ? '-translate-y-2' : ''
    }`}
  >
    <div
      className={`flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-xl md:rounded-2xl shadow-lg transition-all duration-300 ${
        isActive
          ? `${color} text-white scale-110 ring-2 ring-white/50`
          : 'bg-white/90 text-gray-600 hover:bg-white md:hover:scale-110 active:scale-95'
      }`}
    >
      {React.cloneElement(icon as React.ReactElement<any>, { size: 20 })} 
    </div>
    {/* Label only visible on Desktop Hover */}
    <span className="hidden md:block absolute -top-10 opacity-0 transition-opacity group-hover:opacity-100 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-md pointer-events-none whitespace-nowrap z-50">
      {label}
    </span>
    {isActive && <div className="absolute -bottom-1 h-1 w-1 rounded-full bg-gray-500" />}
  </button>
);

export const Dock: React.FC<DockProps> = ({ currentView, onChangeView, onLogout, isAdmin }) => {
  return (
    <div className="fixed bottom-2 md:bottom-4 left-1/2 z-50 -translate-x-1/2 
                    w-[95%] md:w-auto max-w-full
                    rounded-2xl md:rounded-3xl 
                    border border-white/40 bg-white/70 
                    shadow-2xl backdrop-blur-xl
                    overflow-hidden">
      
      {/* Scrollable Container for Mobile */}
      <div className="overflow-x-auto scrollbar-hide w-full px-2 py-2">
        <div className="flex items-center justify-between md:justify-center min-w-max gap-1 md:gap-3 px-1">
          <DockItem
            icon={<LayoutDashboard />}
            label="Dashboard"
            isActive={currentView === 'DASHBOARD'}
            onClick={() => onChangeView('DASHBOARD')}
          />
          {isAdmin && (
              <DockItem 
                  icon={<Users />}
                  label="Gestione Utenti"
                  isActive={currentView === 'ADMIN_USERS'}
                  onClick={() => onChangeView('ADMIN_USERS')}
                  color="bg-gradient-to-br from-purple-500 to-purple-600"
              />
          )}
          <DockItem
            icon={<MonitorPlay />}
            label="Tabellone Live"
            isActive={currentView === 'LIVE_BOARD'}
            onClick={() => onChangeView('LIVE_BOARD')}
            color="bg-gradient-to-br from-red-500 to-pink-600"
          />
          <DockItem
            icon={<Calendar />}
            label="Incontri"
            isActive={currentView === 'MATCHES'}
            onClick={() => onChangeView('MATCHES')}
          />
          <DockItem
            icon={<Trophy />}
            label="Classifiche"
            isActive={currentView === 'STANDINGS'}
            onClick={() => onChangeView('STANDINGS')}
            color="bg-gradient-to-br from-yellow-400 to-orange-500"
          />
          <DockItem
            icon={<div className="font-bold text-lg leading-none">6</div>}
            label="Finali"
            isActive={currentView === 'FINALS'}
            onClick={() => onChangeView('FINALS')}
            color="bg-gray-800"
          />
          
          <div className="mx-1 h-8 w-px bg-gray-400/30" />
          
          <DockItem
            icon={<LogOut />}
            label="Esci"
            isActive={false}
            onClick={onLogout}
            color="bg-gray-500"
          />
        </div>
      </div>
    </div>
  );
};