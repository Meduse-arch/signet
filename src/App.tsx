import { useState } from 'react';
import { HashRouter, Routes, Route, useParams } from 'react-router-dom';
import { HubPage } from './pages/HubPage';
import { LobbyPage } from './pages/LobbyPage';
import { AuthPage } from './pages/AuthPage';
import { ExternalWindowPage } from './pages/ExternalWindowPage';
import { useAuthStore } from './store/auth';
import { TitleBar } from './components/TitleBar';
import logo from './assets/logo.png';

function MainApp() {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showRune, setShowRune] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
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

  // On affiche AuthPage tant qu'on n'a pas d'utilisateur OU que le "Start" n'est pas fait
  if (!user || !isAuthorized) {
    return <AuthPage onEnterApp={() => setIsAuthorized(true)} />;
  }

  return (
    <div className="relative w-full h-full bg-[#050507] overflow-hidden">
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
            key={activeSessionId}
            sessionId={activeSessionId} 
            onLeave={handleLeaveSession} 
          />
        </div>
      )}

      {/* TRANSITION OVERLAY (SIGNET) */}
      {showRune && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center pointer-events-none">
          <div className="relative">
            <div className="absolute inset-0 bg-gold-DEFAULT/40 blur-[60px] animate-pulse rounded-full" />
            <img 
              src={logo} 
              alt="Signet Logo" 
              className="w-32 h-32 object-contain animate-rune-invocation relative z-10" 
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ExternalWindowWrapper() {
  const { type, sessionId } = useParams<{ type: string; sessionId: string }>();
  if (!type || !sessionId) return null;
  return <ExternalWindowPage key={`${type}-${sessionId}`} />;
}

export function App() {
  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-[#0D0D0F]">
      <TitleBar />
      <div className="flex-1 relative">
        <HashRouter>
          <Routes>
            <Route path="/" element={<MainApp />} />
            <Route path="/external/:type/:sessionId" element={<ExternalWindowWrapper />} />
          </Routes>
        </HashRouter>
      </div>
    </div>
  );
}
