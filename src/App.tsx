import { useState } from 'react';
import { HubPage } from './pages/HubPage';
import { LobbyPage } from './pages/LobbyPage';
import { AuthPage } from './pages/AuthPage';
import { useAuthStore } from './store/auth';

export function App() {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [displaySessionId, setDisplaySessionId] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { user } = useAuthStore();

  // Gérer la transition fluide entre Hub et Lobby
  const handleEnterSession = (id: string) => {
    setIsTransitioning(true);
    // On laisse le temps à l'animation de sortie du Hub
    setTimeout(() => {
      setActiveSessionId(id);
      setDisplaySessionId(id);
      setIsTransitioning(false);
    }, 600);
  };

  const handleLeaveSession = () => {
    setIsTransitioning(true);
    // On laisse le temps à l'animation de sortie du Lobby
    setTimeout(() => {
      setActiveSessionId(null);
      setDisplaySessionId(null);
      setIsTransitioning(false);
    }, 600);
  };

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
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
    </div>
  );
}