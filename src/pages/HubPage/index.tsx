import { useState } from 'react';
import { Sidebar } from '../../components/Sidebar';
import { RuneCanvas } from '../../components/RuneCanvas';
import { SearchBar } from '../../components/SearchBar';
import { SessionCard } from '../../components/SessionCard';
import { KeyModal } from '../../components/KeyModal';
import { CreateSessionModal } from '../../components/CreateSessionModal';
import { useUIStore } from '../../store/ui';
import { useSession } from '../../hooks/useSession';
import { useAuthStore } from '../../store/auth';
import { generateSessionKey } from '../../services/peer.service';
import { Session } from '../../services/session.service';
import { Plus } from 'lucide-react';

interface HubPageProps {
  onEnterSession: (sessionId: string) => void;
}

export function HubPage({ onEnterSession }: HubPageProps) {
  const { searchQuery, setSearchQuery, showModal, setShowModal, showCreateModal, setShowCreateModal } = useUIStore();
  const { sessions, addSession, removeSession, isLoading } = useSession();
  const { user } = useAuthStore();
  const [showSearch, setShowSearch] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);

  const filteredSessions = sessions.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.system && s.system.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const canEdit = user?.role === 'mj' || user?.role === 'admin';

  const handleCreateSession = (name: string, system: string, imageUrl?: string) => {
    const id = crypto.randomUUID();
    const key = generateSessionKey();
    addSession({
      id,
      name,
      lastPlayed: Date.now(),
      hostPeerId: key,
      system,
      imageUrl
    });
    setShowCreateModal(false);
    onEnterSession(id);
  };

  const handleUpdateSession = (name: string, system: string, imageUrl?: string) => {
    if (!editingSession) return;
    addSession({
      ...editingSession,
      name,
      system,
      imageUrl,
      lastPlayed: Date.now()
    });
    setEditingSession(null);
  };

  const handleDeleteSession = (session: Session) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer la session "${session.name}" ? Cette action est irréversible.`)) {
      removeSession(session.id);
    }
  };

  return (
    <div className="flex h-screen bg-surface w-full overflow-hidden text-white font-sans selection:bg-gold-DEFAULT/30 relative">
      {/* Texture de fond Grimoire */}
      <div className="absolute inset-0 bg-grimoire-texture opacity-[0.03] pointer-events-none z-[1]" />
      <div className="absolute inset-0 bg-vignette pointer-events-none z-[2]" />
      
      <Sidebar
        onSearchToggle={() => setShowSearch(!showSearch)}
        onKeyOpen={() => setShowModal(true)}
      />

      <main className="flex-1 relative flex flex-col overflow-hidden z-[3]">
        <RuneCanvas />

        <div className="relative z-10 flex flex-col h-full pointer-events-none">
          <header className="flex flex-col items-center justify-center px-8 py-12 pointer-events-auto">
            <div className="text-center space-y-2">
              <h1 className="text-4xl font-black text-glow-gold text-gold-bright tracking-[0.3em] mb-2">
                Signet
              </h1>
              <div className="flex items-center justify-center gap-4">
                <div className="h-px w-12 bg-gradient-to-r from-transparent via-gold-muted to-transparent" />
                <span className="text-xs font-cinzel text-gold-dim tracking-[0.2em] uppercase italic">
                  {sessions.length} Archive{sessions.length > 1 ? 's' : ''} Découverte{sessions.length > 1 ? 's' : ''}
                </span>
                <div className="h-px w-12 bg-gradient-to-r from-transparent via-gold-muted to-transparent" />
              </div>
            </div>

            {showSearch && (
              <div className="mt-8 w-full max-w-md">
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  onClear={() => {
                    setSearchQuery('');
                    setShowSearch(false);
                  }}
                />
              </div>
            )}
          </header>

          <div className="flex-1 overflow-y-auto px-12 pb-12 pointer-events-auto custom-scrollbar">
            {isLoading ? (
              <div className="flex items-center justify-center h-full font-cinzel text-gold-dim animate-pulse tracking-widest">
                Invocation des Archives...
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-8 content-start max-w-7xl mx-auto w-full">

                {canEdit && (
                  <div
                    onClick={() => setShowCreateModal(true)}
                    className="h-[180px] rounded-2xl border border-dashed border-gold-muted/30 flex flex-col items-center justify-center text-gold-dim hover:text-gold-bright hover:border-gold-DEFAULT hover:bg-gold-DEFAULT/5 cursor-pointer transition-all hover:scale-[1.02] group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-rune-glow opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Plus className="w-10 h-10 mb-3 relative z-10" />
                    <span className="text-xs font-cinzel tracking-widest relative z-10">Invoquer une Session</span>
                  </div>
                )}

                {filteredSessions.map(session => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    isActive={false}
                    canEdit={canEdit && !session.isSummoned}
                    onEdit={canEdit && !session.isSummoned ? () => setEditingSession(session) : undefined}
                    onDelete={(canEdit && !session.isSummoned) || session.isSummoned ? () => handleDeleteSession(session) : undefined}
                    onClick={() => onEnterSession(session.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="pointer-events-auto">
          <CreateSessionModal
            isOpen={showCreateModal || !!editingSession}
            onClose={() => {
              setShowCreateModal(false);
              setEditingSession(null);
            }}
            onSubmit={editingSession ? handleUpdateSession : handleCreateSession}
            initialData={editingSession || undefined}
            title={editingSession ? "Modifier la Session" : "Nouvelle Session"}
            submitLabel={editingSession ? "Enregistrer" : "Créer"}
          />
          <KeyModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            onJoin={(key) => {
              onEnterSession(key);
              setShowModal(false);
            }}
          />
        </div>
      </main>
    </div>
  );
}