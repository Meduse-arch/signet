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
import { SettingsView } from '../../components/SettingsView';
import { useConfirmStore } from '../../store/confirm';
import { useTranslation } from 'react-i18next';
import { Icons } from '../../components/ui/Icons';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import logo from '../../assets/logo.svg';

interface HubPageProps {
 onEnterSession: (sessionId: string) => void;
}

type FilterCategory = 'all' | 'public' | 'mine';
type SortOption = 'name' | 'date';

export function HubPage({ onEnterSession }: HubPageProps) {
 const { searchQuery, setSearchQuery, showModal, setShowModal, showCreateModal, setShowCreateModal, activeTab } = useUIStore();
 const { sessions = [], addSession, removeSession, isLoading } = useSession();
 const { user } = useAuthStore();
 const { t, i18n } = useTranslation();

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

 // Les fermetures de clics hors zone sont gérées par les composants Select
 useEffect(() => {}, []);

 const filteredSessions = useMemo(() => {
 if (!Array.isArray(sessions)) return [];

 const result = sessions.filter(s => {
 if (!s) return false;
 const sName = s.name || t('common.noName');
 const matchesSearch = sName.toLowerCase().includes((searchQuery || '').toLowerCase());
 const matchesSystem = !activeSystem || s.system === activeSystem;
 const matchesCategory =
 activeCategory === 'all' ? true :
 activeCategory === 'mine' ? !s.isSummoned :
 activeCategory === 'public' ? !!s.isSummoned : true;

 return matchesSearch && matchesSystem && matchesCategory;
 });

 return result.sort((a, b) => {
 if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
 return (b.lastPlayed || 0) - (a.lastPlayed || 0);
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
 el.classList.add('ring-2', 'ring-glacier-bright', 'ring-offset-4', 'ring-offset-black');
 setTimeout(() => el.classList.remove('ring-2', 'ring-glacier-bright', 'ring-offset-4', 'ring-offset-black'), 2000);
 }
 };

 const handleCreateSession = (name: string, system: string, imageUrl?: string, settings?: Record<string, any>) => {
 try {
 const id = crypto.randomUUID();
 const key = generateSessionKey();
 addSession({ id, name, lastPlayed: Date.now(), hostPeerId: key, system, imageUrl, settings });
 setShowCreateModal(false);
 onEnterSession(id);
 } catch (e) {
 console.error('Create session error', e);
 }
 };

 const handleUpdateSession = (name: string, system: string, imageUrl?: string, settings?: Record<string, any>) => {
 if (!editingSession) return;
 addSession({ ...editingSession, name, system, imageUrl, settings, lastPlayed: Date.now() });
 setEditingSession(null);
 };

 const handleDeleteSession = async (session: Session) => {
 if (await useConfirmStore.getState().ask(t('hub.confirmDelete'))) {
 removeSession(session.id);
 }
 };

 return (
 <div className="flex h-screen bg-[#050507] w-full overflow-hidden text-white font-sans selection:bg-glacier-DEFAULT/30 relative">
 <Sidebar onSearchToggle={() => {}} onKeyOpen={() => setShowModal(true)} />

 <div className="flex flex-1 overflow-hidden relative">
 <div className="absolute inset-0 bg-grimoire-texture opacity-[0.03] pointer-events-none z-0" />
 <div className="absolute inset-0 bg-vignette pointer-events-none z-0" />

 {/* EXPLORATION PANEL */}
 <aside className={`border-r border-silver-DEFAULT/30 bg-[#0D0D0F]/80 backdrop-blur-xl flex flex-col z-10 relative overflow-hidden transition-all duration-500 ease-in-out ${
 isSearchOpen ? 'w-full sm:w-[350px] opacity-100' : 'w-0 opacity-0 pointer-events-none border-none'
 }`}>
 <div className="w-full sm:min-w-[350px] flex-1 flex flex-col h-full">
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
 <div className="p-6 rounded-[1.5rem] bg-white/[0.03] border border-silver-DEFAULT/40 animate-in zoom-in-95 duration-200 space-y-6">
 
 <Select
 label={t('filters.system')}
 value={activeSystem || ''}
 onChange={(val) => setActiveSystem(val === '' ? null : val)}
 options={[
 { value: '', label: t('filters.all') },
 { value: 'Seal', label: 'Seal' }
 ]}
 />

 {isMJ && (
 <Select
 label={t('filters.roles')}
 value={activeCategory}
 onChange={(val) => setActiveCategory(val as FilterCategory)}
 options={[
 { value: 'all', label: t('filters.all', 'Toutes') },
 { value: 'mine', label: t('filters.myCampaigns') },
 { value: 'public', label: t('filters.iParticipate') }
 ]}
 />
 )}

 <Select
 label={t('filters.sortBy')}
 value={sortBy}
 onChange={(val) => setSortBy(val as SortOption)}
 options={[
 { value: 'date', label: t('filters.recent') },
 { value: 'name', label: t('filters.az') }
 ]}
 />

 <Button
 variant="ghost"
 size="sm"
 fullWidth
 onClick={() => {setActiveSystem(null); setSortBy('date'); setActiveCategory('all'); setSearchQuery('');}}
 className="border-t border-white/5 pt-4 mt-2 rounded-none"
 >
 {t('filters.reset')}
 </Button>
 </div>
 )}
 </div>
 </div>
 </aside>

 <main className="flex-1 flex flex-col relative z-[5] overflow-hidden">
 <RuneCanvas />

 {activeTab === 'forge' && isMJ ? (
 <AdminItemsView sessionId="global" />
 ) : activeTab === 'settings' ? (
 <SettingsView />
 ) : (
 <>
 <header className="flex flex-col items-center justify-center px-8 py-12 relative z-10 shrink-0">
 <div className="text-center space-y-2">
 <h1 className="text-4xl font-black text-glacier-bright tracking-[0.3em] mb-2 uppercase">
 Signet
 </h1>
 <div className="flex items-center justify-center gap-4">
 <div className="h-px w-12 bg-gradient-to-r from-transparent via-glacier-muted to-transparent" />
 <span className="text-xs font-quantico text-silver-bright drop-shadow-md tracking-[0.2em] uppercase italic">
 {t('hub.archivesRevealed', { count: filteredSessions.length })}
 </span>
 <div className="h-px w-12 bg-gradient-to-r from-transparent via-glacier-muted to-transparent" />
 </div>
 </div>
 </header>

 <div className="flex-1 overflow-y-auto px-12 pb-12 relative z-10 custom-scrollbar">
 {isLoading ? (
 <div className="flex items-center justify-center h-full font-quantico text-silver-bright drop-shadow-md animate-pulse tracking-widest text-[10px]">{t('hub.awakening')}</div>
 ) : filteredSessions.length === 0 ? (
 <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-40">
 <Icons.Search className="w-16 h-16 text-silver-bright drop-shadow-md mb-4" />
 <p className="font-inter italic text-xl text-silver-bright drop-shadow-md">{t('hub.noResults')}</p>
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
 title={editingSession ? t('hub.editSessionTitle') : t('hub.newSessionTitle')}
 submitLabel={editingSession ? t('hub.editSubmitLabel') : t('hub.createSubmitLabel')}
 />
 <KeyModal isOpen={showModal} onClose={() => setShowModal(false)} onJoin={(key) => { onEnterSession(key); setShowModal(false); }} />
 </div>
 );
}
