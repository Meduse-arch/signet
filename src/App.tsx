import { useState } from 'react';
import { HubPage } from './pages/HubPage';
import { SessionPage } from './pages/SessionPage';
import { AuthPage } from './pages/AuthPage';
import { useAuthStore } from './store/auth';

export function App() {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const { user } = useAuthStore();

  if (!user) {
    return <AuthPage />;
  }

  return (
    <>
      {activeSessionId ? (
        <SessionPage 
          sessionId={activeSessionId} 
          onLeave={() => setActiveSessionId(null)} 
        />
      ) : (
        <HubPage 
          onEnterSession={(id) => setActiveSessionId(id)} 
        />
      )}
    </>
  );
}