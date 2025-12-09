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
}> = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`group relative flex flex-col items-center justify-center p-3 transition-all duration-300 ease-out hover:-translate-y-2 ${
      isActive ? '-translate-y-2' : ''
    }`}
  >
    <div
      className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg transition-all duration-300 ${
        isActive
          ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white scale-110'
          : 'bg-white/90 text-gray-600 hover:bg-white hover:scale-110'
      }`}
    >
      {icon}
    </div>
    <span className="absolute -top-10 opacity-0 transition-opacity group-hover:opacity-100 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-md pointer-events-none whitespace-nowrap">
      {label}
    </span>
    {isActive && <div className="absolute -bottom-1 h-1 w-1 rounded-full bg-gray-500" />}
  </button>
);

export const Dock: React.FC<DockProps> = ({ currentView, onChangeView, onLogout, isAdmin }) => {
  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-3xl border border-white/40 bg-white/60 p-2 shadow-2xl backdrop-blur-xl">
      <div className="flex items-end space-x-2">
        <DockItem
          icon={<LayoutDashboard size={24} />}
          label="Dashboard"
          isActive={currentView === 'DASHBOARD'}
          onClick={() => onChangeView('DASHBOARD')}
        />
        {isAdmin && (
            <DockItem 
                icon={<Users size={24} />}
                label="Gestione Utenti"
                isActive={currentView === 'ADMIN_USERS'}
                onClick={() => onChangeView('ADMIN_USERS')}
            />
        )}
        <DockItem
          icon={<MonitorPlay size={24} />}
          label="Tabellone Live"
          isActive={currentView === 'LIVE_BOARD'}
          onClick={() => onChangeView('LIVE_BOARD')}
        />
        <DockItem
          icon={<Calendar size={24} />}
          label="Incontri"
          isActive={currentView === 'MATCHES'}
          onClick={() => onChangeView('MATCHES')}
        />
        <DockItem
          icon={<Trophy size={24} />}
          label="Classifiche"
          isActive={currentView === 'STANDINGS'}
          onClick={() => onChangeView('STANDINGS')}
        />
         <DockItem
          icon={<div className="font-bold text-lg">6</div>}
          label="Finali"
          isActive={currentView === 'FINALS'}
          onClick={() => onChangeView('FINALS')}
        />
        <div className="mx-2 h-10 w-px bg-white/40" />
        <DockItem
          icon={<LogOut size={24} />}
          label="Esci"
          isActive={false}
          onClick={onLogout}
        />
      </div>
    </div>
  );
};
