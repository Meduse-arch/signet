import { useState, useMemo, useRef, useEffect } from 'react';
import { Sidebar } from '../../components/Sidebar';
import { RuneCanvas } from '../../components/RuneCanvas';
import { SessionCard } from '../../components/SessionCard';
import { KeyModal } from '../../components/KeyModal';
import { CreateSessionModal } from '../../components/CreateSessionModal';
import { SearchBar } from '../../components/SearchBar';
import { useUIStore } from '../../store/ui';
import { useSession } from '../../hooks/useSession';
import { SecurityLevel, useAuthStore } from '../../store/auth';
import { generateSessionKey } from '../../services/peer.service';
import { Session } from '../../services/session.service';
import { AdminItemsView } from '../../components/Admin/AdminItemsView';
import { Search, ChevronDown, Check, Hammer } from 'lucide-react';

interface HubPageProps {
  onEnterSession: (sessionId: string) => void;
}

type FilterCategory = 'all' | 'public' | 'mine';
type SortOption = 'name' | 'date';

export function HubPage({ onEnterSession }: HubPageProps) {
  const { searchQuery, setSearchQuery, showModal, setShowModal, showCreateModal, setShowCreateModal, activeTab } = useUIStore();
  const { sessions, addSession, removeSession, isLoading } = useSession();
  const { user } = useAuthStore();
  
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('all');
  const [activeSystem, setActiveSystem] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [isSysDropdownOpen, setIsSysDropdownOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  
  const sysDropdownRef = useRef<HTMLDivElement>(null);
  const sessionRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const isSearchOpen = activeTab === 'search';
  const isMJ = !!user && user.role >= SecurityLevel.MJ;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sysDropdownRef.current && !sysDropdownRef.current.contains(event.target as Node)) {
        setIsSysDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredSessions = useMemo(() => {
    const result = sessions.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSystem = !activeSystem || s.system === activeSystem;
      const matchesCategory = 
        activeCategory === 'all' ? true :
        activeCategory === 'mine' ? !s.isSummoned :
        activeCategory === 'public' ? s.isSummoned : true;

      return matchesSearch && matchesSystem && matchesCategory;
    });

    return result.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return b.lastPlayed - a.lastPlayed;
    });
  }, [sessions, searchQuery, activeSystem, activeCategory, sortBy]);

  const quickResults = useMemo(() => {
    if (!searchQuery) return [];
    return filteredSessions.slice(0, 10).map(s => ({ id: s.id, name: s.name }));
  }, [filteredSessions, searchQuery]);

  const handleResultClick = (id: string) => {
    const el = sessionRefs.current.get(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-gold-bright', 'ring-offset-4', 'ring-offset-black');
      setTimeout(() => el.classList.remove('ring-2', 'ring-gold-bright', 'ring-offset-4', 'ring-offset-black'), 2000);
    }
  };

  const handleCreateSession = (name: string, system: string, imageUrl?: string, settings?: Record<string, any>) => {
    const id = crypto.randomUUID();
    const key = generateSessionKey();
    addSession({ id, name, lastPlayed: Date.now(), hostPeerId: key, system, imageUrl, settings });
    setShowCreateModal(false);
    onEnterSession(id);
  };

  const handleUpdateSession = (name: string, system: string, imageUrl?: string, settings?: Record<string, any>) => {
    if (!editingSession) return;
    addSession({ ...editingSession, name, system, imageUrl, settings, lastPlayed: Date.now() });
    setEditingSession(null);
  };

  const handleDeleteSession = (session: Session) => {
    if (window.confirm(`Voulez-vous vraiment bannir cette archive ?`)) {
      removeSession(session.id);
    }
  };

  return (
    <div className="flex h-screen bg-[#050507] w-full overflow-hidden text-white font-sans selection:bg-gold-DEFAULT/30 relative">
      <Sidebar onSearchToggle={() => {}} onKeyOpen={() => setShowModal(true)} />

      <div className="flex flex-1 overflow-hidden relative">
        <div className="absolute inset-0 bg-grimoire-texture opacity-[0.03] pointer-events-none z-0" />
        <div className="absolute inset-0 bg-vignette pointer-events-none z-0" />

        {/* PANNEAU D'EXPLORATION (GAUCHE) */}
        <aside className={`border-r border-gold-DEFAULT/30 bg-[#0D0D0F]/80 backdrop-blur-xl flex flex-col z-10 relative overflow-hidden transition-all duration-500 ease-in-out ${
          isSearchOpen ? 'w-[350px] opacity-100' : 'w-0 opacity-0 pointer-events-none border-none'
        }`}>
          <div className="min-w-[350px] flex-1 flex flex-col h-full">
            <div className="p-8 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
              <SearchBar 
                value={searchQuery}
                onChange={setSearchQuery}
                onClear={() => setSearchQuery('')}
                results={quickResults}
                onResultClick={handleResultClick}
                activeFiltersCount={(activeSystem ? 1 : 0) + (activeCategory !== 'all' ? 1 : 0)}
                onFilterClick={() => setShowFilterMenu(!showFilterMenu)}
              />

              {showFilterMenu && (
                <div className="p-6 rounded-[1.5rem] bg-white/[0.03] border border-gold-DEFAULT/40 animate-in zoom-in-95 duration-200 space-y-6">
                  <div className="relative" ref={sysDropdownRef}>
                    <h3 className="text-[9px] font-black text-gold-muted tracking-[0.2em] uppercase mb-3 px-1">Système</h3>
                    <button 
                      onClick={() => setIsSysDropdownOpen(!isSysDropdownOpen)}
                      className="w-full flex items-center justify-between bg-[#0D0D0F]/80 border border-white/10 rounded-xl py-3 px-4 text-[10px] font-cinzel text-gold-bright hover:border-gold-DEFAULT/40 transition-all"
                    >
                      <span className="tracking-widest uppercase">{activeSystem || 'Tous'}</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isSysDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isSysDropdownOpen && (
                      <div className="absolute top-full left-0 w-full mt-2 bg-[#121216] border border-gold-DEFAULT/40 rounded-xl shadow-2xl z-[60] overflow-hidden">
                        {['Seal'].map(sys => (
                          <div 
                            key={sys}
                            onClick={() => { setActiveSystem(activeSystem === sys ? null : sys); setIsSysDropdownOpen(false); }}
                            className="flex items-center justify-between px-4 py-3 text-[10px] font-cinzel text-gold-DEFAULT drop-shadow-md hover:text-gold-bright hover:bg-gold-DEFAULT/5 cursor-pointer border-b border-white/5 last:border-0"
                          >
                            <span className="tracking-widest uppercase">{sys}</span>
                            {activeSystem === sys && <Check className="w-3 h-3 text-gold-bright" />}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {isMJ && (
                    <div>
                      <h3 className="text-[9px] font-black text-gold-muted tracking-[0.2em] uppercase mb-3 px-1">Filtres de Rôle</h3>
                      <div className="flex bg-[#0D0D0F]/80 p-1 rounded-xl border border-white/5 gap-1">
                        <button
                          onClick={() => setActiveCategory(activeCategory === 'mine' ? 'all' : 'mine')}
                          className={`flex-1 py-2 text-[8px] font-cinzel font-bold rounded-lg transition-all border ${
                            activeCategory === 'mine' ? 'bg-gold-DEFAULT text-black border-gold-DEFAULT' : 'text-white/70 border-transparent hover:text-white'
                          }`}
                        >
                          MES CAMPAGNES
                        </button>
                        <button
                          onClick={() => setActiveCategory(activeCategory === 'public' ? 'all' : 'public')}
                          className={`flex-1 py-2 text-[8px] font-cinzel font-bold rounded-lg transition-all border ${
                            activeCategory === 'public' ? 'bg-gold-DEFAULT text-black border-gold-DEFAULT' : 'text-white/70 border-transparent hover:text-white'
                          }`}
                        >
                          JE PARTICIPE
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-[9px] font-black text-gold-muted tracking-[0.2em] uppercase mb-3 px-1">Trier par</h3>
                    <div className="flex bg-[#0D0D0F]/80 p-1 rounded-xl border border-white/5 gap-1">
                      {[
                        { id: 'date', label: 'Récents' },
                        { id: 'name', label: 'A-Z' },
                      ].map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => setSortBy(opt.id as SortOption)}
                          className={`flex-1 py-2 text-[9px] font-cinzel font-bold rounded-lg transition-all ${
                            sortBy === opt.id ? 'bg-white/10 text-white border border-white/10' : 'text-white/70 hover:text-white border border-transparent'
                          }`}
                        >
                          {opt.label.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => {setActiveSystem(null); setSortBy('date'); setActiveCategory('all'); setSearchQuery('');}}
                    className="w-full py-2 text-[8px] font-black text-gold-DEFAULT drop-shadow-md hover:text-gold-bright uppercase tracking-[0.2em] transition-colors border-t border-white/5 pt-4"
                  >
                    Retirez les filtres
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col relative z-[5] overflow-hidden">
          <RuneCanvas />

          {activeTab === 'forge' && isMJ ? (
            <AdminItemsView sessionId="global" />
          ) : (
            <>
              <header className="flex flex-col items-center justify-center px-8 py-12 relative z-10 shrink-0">
                <div className="text-center space-y-2">
                  <h1 className="text-4xl font-black text-glow-gold text-gold-bright tracking-[0.3em] mb-2 uppercase">
                    Signet
                  </h1>
                  <div className="flex items-center justify-center gap-4">
                    <div className="h-px w-12 bg-gradient-to-r from-transparent via-gold-muted to-transparent" />
                    <span className="text-xs font-cinzel text-gold-DEFAULT drop-shadow-md tracking-[0.2em] uppercase italic">
                      {filteredSessions.length} Archive{filteredSessions.length > 1 ? 's' : ''} Révélée{filteredSessions.length > 1 ? 's' : ''}
                    </span>
                    <div className="h-px w-12 bg-gradient-to-r from-transparent via-gold-muted to-transparent" />
                  </div>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto px-12 pb-12 relative z-10 custom-scrollbar">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full font-cinzel text-gold-DEFAULT drop-shadow-md animate-pulse tracking-widest text-[10px]">ÉVEIL DES ARCHIVES...</div>
                ) : filteredSessions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-40">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gold-DEFAULT/20 blur-3xl rounded-full" />
                      <Search className="w-16 h-16 text-gold-DEFAULT drop-shadow-md mb-4 relative z-10" />
                    </div>
                    <p className="font-serif italic text-xl text-gold-DEFAULT drop-shadow-md">Aucune rune ne correspond à votre recherche...</p>
                    <button onClick={() => {setSearchQuery(''); setActiveSystem(null); setActiveCategory('all');}} className="px-6 py-2 rounded-full border border-gold-DEFAULT/40 text-[9px] font-cinzel text-gold-bright hover:bg-gold-DEFAULT/5 tracking-[0.2em] uppercase transition-all">Retirez les filtres</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 content-start animate-page-enter">
                    {filteredSessions.map(session => (
                      <div key={session.id} ref={el => { if (el) sessionRefs.current.set(session.id, el); else sessionRefs.current.delete(session.id); }} className="transition-all duration-300">
                        <SessionCard
                          session={session}
                          isActive={false}
                          canEdit={isMJ && !session.isSummoned}
                          onEdit={isMJ && !session.isSummoned ? () => setEditingSession(session) : undefined}
                          onDelete={(isMJ && !session.isSummoned) || session.isSummoned ? () => handleDeleteSession(session) : undefined}
                          onClick={() => onEnterSession(session.id)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      <CreateSessionModal
        isOpen={showCreateModal || !!editingSession}
        onClose={() => { setShowCreateModal(false); setEditingSession(null); }}
        onSubmit={editingSession ? handleUpdateSession : handleCreateSession}
        initialData={editingSession || undefined}
        title={editingSession ? "Altérer Archive" : "Nouvelle Archive"}
        submitLabel={editingSession ? "Enregistrer" : "Invoquer"}
      />
      <KeyModal isOpen={showModal} onClose={() => setShowModal(false)} onJoin={(key) => { onEnterSession(key); setShowModal(false); }} />
    </div>
  );
}
