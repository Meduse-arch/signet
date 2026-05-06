import React, { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

const SealEngine = lazy(() => import('../seal'));

interface SystemRouterProps {
  system: string;
  isMJ: boolean;
  onPause: () => void;
  sessionId: string;
  imageUrl?: string;
}

export function SystemRouter({ system, isMJ, onPause, sessionId, imageUrl }: SystemRouterProps) {
  // Composant MJ Overlay (Bouton Pause)
  const MJOverlay = () => (
    <div className="absolute top-6 left-6 z-[100] flex items-center gap-4 animate-in fade-in duration-1000">
      <button 
        onClick={onPause}
        className="px-6 py-2.5 rounded-xl bg-black/60 backdrop-blur-md border border-gold-DEFAULT/20 text-gold-dim hover:text-gold-bright hover:border-gold-DEFAULT/50 text-[10px] font-cinzel font-black tracking-widest transition-all shadow-2xl group"
      >
        <span className="group-hover:scale-105 inline-block transition-transform">SESSION PAUSE</span>
      </button>
    </div>
  );

  const renderSystem = () => {
    switch (system.toLowerCase()) {
      case 'seal':
        return <SealEngine sessionId={sessionId} imageUrl={imageUrl} />;
      default:
        return (
          <div className="flex-1 flex flex-col items-center justify-center bg-black text-gold-dim font-cinzel">
            <h2 className="text-xl tracking-widest uppercase mb-4">Système Inconnu: {system}</h2>
            <p className="text-xs italic opacity-50">Aucun moteur n'a été trouvé pour cette arcane.</p>
          </div>
        );
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden">
      {isMJ && <MJOverlay />}
      <Suspense fallback={
        <div className="flex-1 flex items-center justify-center bg-black">
          <Loader2 className="w-12 h-12 text-gold-bright animate-spin" />
        </div>
      }>
        {renderSystem()}
      </Suspense>
    </div>
  );
}