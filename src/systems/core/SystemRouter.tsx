import React, { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

const SealEngine = lazy(() => import('../seal'));

interface SystemRouterProps {
  system: string;
  isMJ: boolean;
  onPause: () => void;
  sessionId: string;
  imageUrl?: string;
  players: { peer_id: string; pseudo: string }[];
}

export function SystemRouter({ system, isMJ, onPause, sessionId, imageUrl, players }: SystemRouterProps) {
  // Composant MJ Overlay (Bouton Pause)
  const MJOverlay = () => (
    <div className="absolute top-8 left-1/2 -translate-x-1/2 z-[100] flex items-center justify-center animate-in fade-in slide-in-from-top-4 duration-1000">
      <button 
        onClick={onPause}
        className="relative group px-8 py-2 rounded-full bg-[#0D0D0F]/80 backdrop-blur-xl border border-gold-DEFAULT/40 hover:border-gold-DEFAULT/80 hover:bg-[#0D0D0F]/90 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
      >
        <div className="absolute inset-0 rounded-full border border-white/5 group-hover:scale-105 transition-transform duration-500 pointer-events-none" />
        <span className="text-gold-DEFAULT drop-shadow-md group-hover:text-gold-bright text-[10px] font-cinzel font-black tracking-[0.2em] transition-colors">
          PAUSE SESSION
        </span>
      </button>
    </div>
  );

  const renderSystem = () => {
    switch (system.toLowerCase()) {
      case 'seal':
        return <SealEngine sessionId={sessionId} imageUrl={imageUrl} players={players} />;
      default:
        return (
          <div className="flex-1 flex flex-col items-center justify-center bg-black text-gold-DEFAULT drop-shadow-md font-cinzel">
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