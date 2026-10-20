import React, { useState } from 'react';
import {
  Search,
  Plus,
  Bell,
  ChevronDown,
  LogOut,
  Settings as SettingsIcon,
  ShieldCheck,
  Menu,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  onOpenNewProject: () => void;
  onOpenMobileSidebar?: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenNewProject,
  onOpenMobileSidebar,
  searchQuery,
  onSearchChange,
}) => {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#090909]/90 backdrop-blur-md border-b border-[#1A1A1A] px-4 md:px-8 flex items-center justify-between gap-4">
      {/* Left zone: Mobile toggle + Global Search bar */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-[#141414]"
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar projetos, personagens, cenas ou prompts..."
            className="w-full pl-10 pr-4 py-2 bg-[#141414] hover:bg-[#181818] focus:bg-[#161616] border border-[#242424] focus:border-[#DFFF00]/50 rounded-xl text-xs md:text-sm text-white placeholder-zinc-500 focus:outline-none transition-all duration-150"
          />
        </div>
      </div>

      {/* Right zone: New Project CTA + Notification Bell + User Profile */}
      <div className="flex items-center gap-3 shrink-0">
        {/* + Novo Projeto CTA */}
        <button
          onClick={onOpenNewProject}
          className="flex items-center gap-2 px-3.5 md:px-4 py-2 bg-[#DFFF00] hover:bg-[#c8e600] active:scale-95 text-black text-xs md:text-sm font-semibold rounded-lg shadow-[0_0_20px_rgba(223,255,0,0.18)] transition-all duration-150 whitespace-nowrap cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Novo Projeto</span>
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative p-2.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#141414] transition-colors"
            aria-label="Notificações"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 ring-2 ring-[#090909]" />
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-[#141414] border border-[#262626] rounded-xl shadow-2xl p-4 z-50 text-xs">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#222]">
                <span className="font-semibold text-white">Notificações do Estúdio</span>
                <span className="text-[10px] text-zinc-500">Recentes</span>
              </div>
              <div className="space-y-2">
                <div className="p-2 rounded-lg bg-[#1C1C1C] border border-[#282828]">
                  <p className="text-zinc-200 font-medium">HYPE Studio 2.0 Ativado</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Banco de dados Firestore conectado e sincronizado para o proprietário.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User profile button & dropdown */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-3 p-1.5 md:pl-2 md:pr-3 rounded-xl hover:bg-[#141414] border border-transparent hover:border-[#242424] transition-all cursor-pointer"
          >
            <img
              src={user?.photoURL || profile?.photoURL || '/src/assets/images/avatar_lara_model_1792450194066.jpg'}
              alt={profile?.displayName || 'Usuário'}
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-lg object-cover ring-1 ring-[#DFFF00]/30"
            />
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-semibold text-white tracking-tight leading-none">
                {profile?.displayName || 'Meu Estúdio'}
              </span>
              <span className="text-[10px] text-zinc-400 leading-none mt-1">
                Usuário Pessoal
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
          </button>

          {/* Profile Dropdown Menu */}
          {userMenuOpen && (
            <div
              className="absolute right-0 mt-2 w-56 bg-[#141414] border border-[#262626] rounded-xl shadow-2xl py-2 z-50 text-xs"
              onClick={() => setUserMenuOpen(false)}
            >
              <div className="px-4 py-2 border-b border-[#222]">
                <p className="font-medium text-white truncate">{profile?.displayName || 'Proprietário'}</p>
                <p className="text-[11px] text-zinc-500 truncate">{user?.email || profile?.email}</p>
                <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#DFFF00]/10 text-[#DFFF00] text-[10px] font-medium">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Proprietário Autorizado</span>
                </div>
              </div>

              <div className="py-1">
                <button
                  onClick={() => navigate('/settings')}
                  className="w-full flex items-center gap-2 px-4 py-2 text-zinc-300 hover:text-white hover:bg-[#1A1A1A] transition-colors text-left"
                >
                  <SettingsIcon className="w-4 h-4 text-zinc-400" />
                  <span>Configurações do Estúdio</span>
                </button>
              </div>

              <div className="pt-1 border-t border-[#222]">
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-left"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Encerrar Sessão</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
