import { useState } from 'react';
import { HubPage } from './pages/HubPage';
import { LobbyPage } from './pages/LobbyPage';
import { AuthPage } from './pages/AuthPage';
import { useAuthStore } from './store/auth';
import { Shield } from 'lucide-react';

export function App() {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showRune, setShowRune] = useState(false);
  const { user } = useAuthStore();

  // Gérer la transition fluide entre Hub et Lobby
  const handleEnterSession = (id: string) => {
    setIsTransitioning(true);
    // Afficher la rune au milieu de la transition
    setTimeout(() => setShowRune(true), 100);
    
    setTimeout(() => {
      setActiveSessionId(id);
      setIsTransitioning(false);
      // Cacher la rune après l'apparition de la nouvelle page
      setTimeout(() => setShowRune(false), 800);
    }, 600);
  };

  const handleLeaveSession = () => {
    setIsTransitioning(true);
    setTimeout(() => setShowRune(true), 100);

    setTimeout(() => {
      setActiveSessionId(null);
      setIsTransitioning(false);
      setTimeout(() => setShowRune(false), 800);
    }, 600);
  };

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="relative w-full h-screen bg-[#050507] overflow-hidden">
      {/* HUB PAGE */}
      {!activeSessionId && (
        <div className={`absolute inset-0 ${isTransitioning ? 'animate-page-exit' : 'animate-page-enter'}`}>
          <HubPage onEnterSession={handleEnterSession} />
        </div>
      )}

      {/* LOBBY PAGE */}
      {activeSessionId && (
        <div className={`absolute inset-0 ${isTransitioning ? 'animate-page-exit' : 'animate-page-enter'}`}>
          <LobbyPage 
            sessionId={activeSessionId} 
            onLeave={handleLeaveSession} 
          />
        </div>
      )}

      {/* TRANSITION OVERLAY (SIGIL) */}
      {showRune && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center pointer-events-none">
          <div className="relative">
            <div className="absolute inset-0 bg-gold-DEFAULT/40 blur-[60px] animate-pulse rounded-full" />
            <Shield className="w-24 h-24 text-gold-bright animate-rune-invocation relative z-10" />
          </div>
        </div>
      )}
    </div>
  );
}