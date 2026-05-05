import { Library, Search, Key, ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { useUIStore } from '../../store/ui';
import { useAuthStore } from '../../store/auth';

interface SidebarProps {
  onSearchToggle: () => void;
  onKeyOpen: () => void;
}

export function Sidebar({ onSearchToggle, onKeyOpen }: SidebarProps) {
  const { sidebarOpen, setSidebarOpen, activeTab, setActiveTab } = useUIStore();
  const { logout, user } = useAuthStore();

  const navItems = [
    { id: 'library', icon: Library, label: 'Bibliothèque', action: () => setActiveTab('library') },
    { id: 'search', icon: Search, label: 'Rechercher', action: () => { setActiveTab('search'); onSearchToggle(); } },
    { id: 'key', icon: Key, label: 'Rejoindre (Clé)', action: () => { setActiveTab('key'); onKeyOpen(); } },
  ] as const;

  return (
    <div 
      className={`h-full bg-surface-sidebar border-r border-gold-DEFAULT/10 flex flex-col transition-all duration-300 z-10 relative overflow-hidden ${
        sidebarOpen ? 'w-[220px]' : 'w-[64px]'
      }`}
    >
      {/* Texture Grimoire */}
      <div className="absolute inset-0 bg-grimoire-texture opacity-[0.03] pointer-events-none" />

      <div className="flex-1 py-8 px-2 space-y-4 relative z-10">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={item.action}
              className={`w-full flex items-center gap-4 px-3 py-2.5 rounded-xl transition-all group overflow-hidden border ${
                isActive 
                  ? 'bg-gold-DEFAULT/10 border-gold-DEFAULT/30 text-gold-bright shadow-rune-gold' 
                  : 'border-transparent hover:bg-gold-DEFAULT/5 text-gold-dim hover:text-gold-bright hover:border-gold-DEFAULT/10'
              }`}
              title={!sidebarOpen ? item.label : undefined}
            >
              <div className="relative">
                <Icon className={`flex-shrink-0 w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? 'text-gold-bright animate-rune-pulse' : ''}`} />
                {isActive && (
                  <div className="absolute inset-0 bg-gold-DEFAULT/20 blur-md rounded-full" />
                )}
              </div>
              <span 
                className={`text-[10px] font-cinzel font-black tracking-[0.2em] uppercase whitespace-nowrap transition-all duration-300 ${
                  sidebarOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 w-0'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
      
      <div className="p-3 border-t border-gold-DEFAULT/10 space-y-3 relative z-10 bg-black/20">
        {sidebarOpen && user && (
          <div className="px-3 py-2 mb-2 rounded-lg bg-gold-DEFAULT/5 border border-gold-DEFAULT/10">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-gold-bright animate-pulse shadow-[0_0_8px_rgba(212,160,23,0.6)]"></div>
              <span className="text-[10px] font-cinzel font-black text-gold-bright tracking-widest truncate">
                {user.pseudo}
              </span>
            </div>
            <div className="mt-1 text-[8px] font-mono text-gold-dim/60 uppercase tracking-tighter ml-5">
              Grade: {user.role}
            </div>
          </div>
        )}
        
        <div className="flex flex-col gap-1">
          <button
            onClick={logout}
            className={`w-full flex items-center ${sidebarOpen ? 'justify-start px-3 gap-4' : 'justify-center'} py-2.5 rounded-xl hover:bg-red-500/10 text-gold-dim/60 hover:text-red-400 transition-all group`}
            title={!sidebarOpen ? "Se déconnecter" : undefined}
          >
            <LogOut className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            <span className={`text-[10px] font-cinzel font-black tracking-[0.1em] uppercase whitespace-nowrap transition-all duration-300 ${
              sidebarOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 w-0'
            }`}>
              Bannir la Session
            </span>
          </button>
          
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center py-2.5 rounded-xl hover:bg-gold-DEFAULT/5 text-gold-dim/40 hover:text-gold-bright transition-all"
          >
            {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}