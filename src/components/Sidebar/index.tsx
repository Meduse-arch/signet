import { Library, Search, Key, ChevronLeft, ChevronRight, LogOut, Plus } from 'lucide-react';
import { useUIStore } from '../../store/ui';
import { SecurityLevel, useAuthStore } from '../../store/auth';
import logo from '../../assets/logo.png';

interface SidebarProps {
  onSearchToggle: () => void;
  onKeyOpen: () => void;
}

export function Sidebar({ onSearchToggle, onKeyOpen }: SidebarProps) {
  const { sidebarOpen, setSidebarOpen, activeTab, setActiveTab, setShowCreateModal } = useUIStore();
  const { logout, user } = useAuthStore();
  const isMJ = user && user.role >= SecurityLevel.MJ;

  const navItems = [
    { id: 'library', icon: Library, label: 'Bibliothèque', action: () => setActiveTab('library') },
    { id: 'search', icon: Search, label: 'Rechercher', action: () => { setActiveTab('search'); onSearchToggle(); } },
  ] as const;

  return (
    <div 
      className={`h-full bg-surface-sidebar border-r border-gold-DEFAULT/30 flex flex-col transition-all duration-300 z-10 relative overflow-hidden ${
        sidebarOpen ? 'w-[220px]' : 'w-[64px]'
      }`}
    >
      {/* Texture Grimoire */}
      <div className="absolute inset-0 bg-grimoire-texture opacity-[0.03] pointer-events-none" />

      {/* Logo Section */}
      <div className="pt-8 pb-4 flex justify-center relative z-10">
        <div className={`transition-all duration-300 ${sidebarOpen ? 'w-24 h-24' : 'w-10 h-10'}`}>
          <img 
            src={logo} 
            alt="Signet" 
            className="w-full h-full object-contain filter drop-shadow-[0_0_10px_rgba(212,175,55,0.2)]" 
          />
        </div>
      </div>

      <div className="flex-1 py-4 px-2 space-y-4 relative z-10">
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
                  : 'border-transparent hover:bg-gold-DEFAULT/5 text-gold-DEFAULT drop-shadow-md hover:text-gold-bright hover:border-gold-DEFAULT/30'
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

        {/* BOUTON ACTION CLÉ */}
        <button
          onClick={onKeyOpen}
          className="w-full flex items-center gap-4 px-3 py-2.5 rounded-xl transition-all group overflow-hidden border border-transparent hover:bg-gold-DEFAULT/5 text-gold-DEFAULT drop-shadow-md hover:text-gold-bright hover:border-gold-DEFAULT/30"
          title={!sidebarOpen ? "Rejoindre (Clé)" : undefined}
        >
          <div className="relative">
            <Key className="flex-shrink-0 w-5 h-5 transition-transform group-hover:scale-110" />
          </div>
          <span 
            className={`text-[10px] font-cinzel font-black tracking-[0.2em] uppercase whitespace-nowrap transition-all duration-300 ${
              sidebarOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 w-0'
            }`}
          >
            Rejoindre (Clé)
          </span>
        </button>

        {/* BOUTON CRÉER SESSION */}
        {isMJ && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full flex items-center gap-4 px-3 py-2.5 rounded-xl transition-all group overflow-hidden border border-transparent hover:bg-gold-DEFAULT/5 text-gold-DEFAULT hover:text-gold-bright hover:border-gold-DEFAULT/30"
            title={!sidebarOpen ? "Créer Session" : undefined}
          >
            <div className="relative">
              <Plus className="flex-shrink-0 w-5 h-5 transition-transform group-hover:scale-110" />
            </div>
            <span 
              className={`text-[10px] font-cinzel font-black tracking-[0.2em] uppercase whitespace-nowrap transition-all duration-300 ${
                sidebarOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 w-0'
              }`}
            >
              Créer Session
            </span>
          </button>
        )}
      </div>
      
      <div className="p-3 border-t border-gold-DEFAULT/30 space-y-3 relative z-10 bg-black/20">
        {sidebarOpen && user && (
          <div className="px-3 py-2 mb-2 rounded-lg bg-gold-DEFAULT/5 border border-gold-DEFAULT/30">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-gold-bright animate-pulse shadow-[0_0_8px_rgba(212,160,23,0.6)]"></div>
              <span className="text-[10px] font-cinzel font-black text-gold-bright tracking-widest truncate">
                {user.pseudo}
              </span>
            </div>
            <div className="mt-1 text-[8px] font-mono text-gold-DEFAULT drop-shadow-md/60 uppercase tracking-tighter ml-5">
              Grade: {user.role}
            </div>
          </div>
        )}
        
        <div className="flex flex-col gap-1">
          <button
            onClick={logout}
            className={`w-full flex items-center ${sidebarOpen ? 'justify-start px-3 gap-4' : 'justify-center'} py-2.5 rounded-xl hover:bg-red-500/10 text-gold-DEFAULT drop-shadow-md/60 hover:text-red-400 transition-all group`}
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
            className="w-full flex items-center justify-center py-2.5 rounded-xl hover:bg-gold-DEFAULT/5 text-gold-DEFAULT drop-shadow-md/40 hover:text-gold-bright transition-all"
          >
            {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
