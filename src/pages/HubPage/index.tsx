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
import { Plus } from 'lucide-react';

interface HubPageProps {
  onEnterSession: (sessionId: string) => void;
}

export function HubPage({ onEnterSession }: HubPageProps) {
  const { searchQuery, setSearchQuery, showModal, setShowModal, showCreateModal, setShowCreateModal } = useUIStore();
  const { sessions, addSession, isLoading } = useSession();
  const { user } = useAuthStore();
  const [showSearch, setShowSearch] = useState(false);

  const filteredSessions = sessions.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.system && s.system.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCreateSession = (name: string, system: string) => {
    const id = crypto.randomUUID();
    const key = generateSessionKey();
    addSession({
      id,
      name,
      lastPlayed: Date.now(),
      hostPeerId: key,
      system
    });
    setShowCreateModal(false);
    onEnterSession(id);
  };

  return (
    <div className="flex h-screen bg-surface w-full overflow-hidden text-white font-sans selection:bg-gold-DEFAULT/30">
      <Sidebar
        onSearchToggle={() => setShowSearch(!showSearch)}
        onKeyOpen={() => setShowModal(true)}
      />

      <main className="flex-1 relative flex flex-col overflow-hidden">
        <RuneCanvas />

        <div className="relative z-10 flex flex-col h-full pointer-events-none">
          <header className="flex items-center justify-between px-8 py-6 pointer-events-auto">
            <div className="flex items-baseline gap-4">
              <h1 className="text-2xl font-bold text-[#e8d5a0] tracking-wide">
                Sigil VTT
              </h1>
              <span className="text-sm font-medium text-gold-dim">
                {sessions.length} session{sessions.length > 1 ? 's' : ''}
              </span>
            </div>

            {showSearch && (
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                onClear={() => {
                  setSearchQuery('');
                  setShowSearch(false);
                }}
              />
            )}
          </header>

          <div className="flex-1 overflow-y-auto px-8 pb-8 pointer-events-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-gold-dim">
                Chargement des sessions...
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-6 content-start">

                {(user?.role === 'mj' || user?.role === 'admin') && (
                  <div
                    onClick={() => setShowCreateModal(true)}
                    className="h-[156px] rounded-2xl border-2 border-dashed border-border-dark flex flex-col items-center justify-center text-gold-dim hover:text-gold-DEFAULT hover:border-gold-border hover:bg-surface-glass cursor-pointer transition-all hover:scale-[1.02]"
                  >
                    <Plus className="w-8 h-8 mb-2" />
                    <span className="text-sm font-medium">Nouvelle Session</span>
                  </div>
                )}

                {filteredSessions.map(session => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    isActive={false}
                    onClick={() => onEnterSession(session.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="pointer-events-auto">
          <CreateSessionModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onCreate={handleCreateSession}
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