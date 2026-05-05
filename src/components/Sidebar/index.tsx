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
      className={`h-full bg-surface-sidebar border-r border-border-subtle flex flex-col transition-all duration-250 z-10 ${
        sidebarOpen ? 'w-[220px]' : 'w-[56px]'
      }`}
    >
      <div className="flex-1 py-4 px-2 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={item.action}
              className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg transition-colors overflow-hidden ${
                isActive 
                  ? 'bg-[#1e1a0a] text-gold-DEFAULT' 
                  : 'hover:bg-[#1a1810] text-gold-dim hover:text-gold-bright'
              }`}
              title={!sidebarOpen ? item.label : undefined}
            >
              <Icon className={`flex-shrink-0 w-5 h-5 ${isActive ? 'stroke-gold-DEFAULT' : ''}`} />
              <span 
                className={`text-sm whitespace-nowrap transition-opacity duration-250 ${
                  sidebarOpen ? 'opacity-100' : 'opacity-0 w-0'
                } ${isActive ? 'text-gold-DEFAULT font-medium' : ''}`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
      
      <div className="p-2 border-t border-border-subtle space-y-2">
        {sidebarOpen && user && (
          <div className="px-2 py-1 mb-2 text-xs text-silver-dim flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gold-DEFAULT"></div>
            {user.pseudo} ({user.role})
          </div>
        )}
        <button
          onClick={logout}
          className={`w-full flex items-center ${sidebarOpen ? 'justify-start px-2 gap-2.5' : 'justify-center'} py-2 rounded-lg hover:bg-[#2a1a1a] text-silver-dim hover:text-silver-bright transition-colors`}
          title={!sidebarOpen ? "Se déconnecter" : undefined}
        >
          <LogOut className="w-5 h-5" />
          <span className={`text-sm whitespace-nowrap transition-opacity duration-250 ${sidebarOpen ? 'opacity-100' : 'opacity-0 w-0'}`}>
            Se déconnecter
          </span>
        </button>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="w-full flex items-center justify-center py-2 rounded-lg hover:bg-[#1a1810] text-gold-dim transition-colors"
        >
          {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}