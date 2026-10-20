import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  User,
  Image as ImageIcon,
  Film,
  Wand2,
  Sparkles,
  FolderArchive,
  Settings,
  Cloud,
  HelpCircle,
  Menu,
  X,
} from 'lucide-react';

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onCloseMobile }) => {
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: Home },
    { name: 'Character Studio', path: '/character-studio', icon: User },
    { name: 'Prompt Lab', path: '/prompt-lab', icon: Wand2 },
    { name: 'Story Studio', path: '/story-studio', icon: Film },
    { name: 'Prompt Director', path: '/prompt-director', icon: Sparkles },
    { name: 'Biblioteca', path: '/library', icon: FolderArchive },
    { name: 'Configurações', path: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#0D0D0D] border-r border-[#1F1F1F] flex flex-col justify-between transition-transform duration-300 lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Logo Zone */}
        <div>
          <div className="p-6 pb-8 border-b border-[#1A1A1A] flex items-center justify-between">
            <NavLink to="/dashboard" onClick={onCloseMobile} className="group block">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black italic tracking-tighter text-[#DFFF00]">
                  HYPE
                </span>
              </div>
              <div className="text-[11px] font-bold tracking-widest text-white/90 uppercase -mt-1 group-hover:text-white transition-colors">
                CREATOR STUDIO <span className="text-[#DFFF00]">2.0</span>
              </div>
            </NavLink>

            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="lg:hidden text-zinc-400 hover:text-white p-1 rounded-md"
                aria-label="Fechar menu"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Navigation Items */}
          <nav className="p-4 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/dashboard'}
                  onClick={onCloseMobile}
                  className={({ isActive }) =>
                    `flex items-center gap-3.5 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-[#1C1C14] text-[#DFFF00] shadow-[0_0_15px_rgba(223,255,0,0.06)] border border-[#DFFF00]/20'
                        : 'text-zinc-400 hover:text-white hover:bg-[#151515]'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={`w-4 h-4 transition-transform duration-150 ${
                          isActive ? 'text-[#DFFF00] scale-110' : 'text-zinc-400'
                        }`}
                      />
                      <span className="truncate">{item.name}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Quota & Help Widgets */}
        <div className="p-4 border-t border-[#1A1A1A] space-y-4">
          {/* Storage quota widget matching mockup */}
          <div className="bg-[#141414] border border-[#222222] rounded-xl p-3.5">
            <div className="flex items-center justify-between text-xs mb-2">
              <div className="flex items-center gap-2 text-zinc-300 font-medium">
                <Cloud className="w-4 h-4 text-zinc-400" />
                <span>Armazenamento</span>
              </div>
            </div>
            <div className="text-[11px] text-zinc-400 mb-2 flex justify-between tabular-nums">
              <span>12.4 GB de 50 GB</span>
              <span className="text-[#DFFF00]">25%</span>
            </div>
            <div className="w-full bg-[#242424] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#DFFF00] h-full rounded-full transition-all duration-500"
                style={{ width: '25%' }}
              />
            </div>
          </div>

          {/* Help Center link */}
          <a
            href="#ajuda"
            onClick={(e) => {
              e.preventDefault();
              alert('Central de Ajuda: Documentação e guias de fluxo do HYPE CREATOR STUDIO 2.0.');
            }}
            className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-zinc-400 hover:text-white hover:bg-[#141414] rounded-lg transition-colors"
          >
            <HelpCircle className="w-4 h-4 text-zinc-400" />
            <span>Central de Ajuda</span>
          </a>
        </div>
      </aside>
    </>
  );
};
