import React, { useEffect, useState } from 'react';
import { useCombatStore } from '../../store/combat';
import { usePeer } from '../../hooks/usePeer';
import { useSignetStore } from '../../store/signet';
import { usePeersStore } from '../../store/peers';
import { useCharactersStore } from '../../store/characters';
import { Swords, ChevronRight } from 'lucide-react';

export const CombatHUD = ({ sessionId }: { sessionId: string }) => {
  const { isActive, activeActorId, actors, nextTurn } = useCombatStore();
  const { isHost, peerId } = usePeersStore();
  const { onData } = usePeer();
  const [showPrompt, setShowPrompt] = useState(false);
  const openWindow = useSignetStore(state => state.openWindow);
  const characters = useCharactersStore(state => state.characters);

  useEffect(() => {
    const unsub = onData((data) => {
      if (data.type === 'ROLL_INITIATIVE_PROMPT') {
        setShowPrompt(true);
        setTimeout(() => setShowPrompt(false), 5000);
      }
    });
    return () => unsub();
  }, [onData]);

  const handleOpenManager = () => {
    openWindow('combat');
  };

  const handleNext = () => {
    nextTurn();
    const state = useCombatStore.getState();
    if (window.electronAPI) window.electronAPI.saveCombatState(sessionId, state);
    // Le P2P est géré soit via le bouton next global, soit via l'event de P2P
    // Ici on envoie un event local qui sera rattrapé si nécessaire, mais nextTurn fait l'emitStoreSync local
    // Pour que ce soit sûr, on le diffuse :
    const channel = new BroadcastChannel(`signet_sync_${sessionId}`);
    channel.postMessage({ type: 'COMBAT_STATE_UPDATE', payload: state });
    channel.close();
  };

  if (!isActive && !isHost && !showPrompt) return null;

  const sortedActors = [...actors].sort((a, b) => a.turn_order - b.turn_order);
  const currentIndex = sortedActors.findIndex(a => a.id === activeActorId);
  
  let currentActor = currentIndex !== -1 ? sortedActors[currentIndex] : null;
  let prevActor = currentIndex > 0 ? sortedActors[currentIndex - 1] : (sortedActors.length > 0 ? sortedActors[sortedActors.length - 1] : null);
  let nextActor = currentIndex < sortedActors.length - 1 ? sortedActors[currentIndex + 1] : (sortedActors.length > 0 ? sortedActors[0] : null);

  if (!isActive && isHost && sortedActors.length > 0) {
    currentActor = sortedActors[0];
    prevActor = null;
    nextActor = null;
  }

  const zoomToToken = (actorId: string) => {
    const channel = new BroadcastChannel(`board_actions_${sessionId}`);
    channel.postMessage({ type: 'ZOOM_TO_TOKEN', payload: { id: actorId } });
    channel.close();
  };

  // Déterminer si c'est le tour du joueur local
  // On cherche le perso contrôlé par le joueur local
  const myChar = characters.find(c => c.user_id === peerId);
  const isMyTurn = isActive && currentActor && myChar && currentActor.character_id === myChar.id;

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[150] flex flex-col items-center pointer-events-none">
      
      {showPrompt && !isHost && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none animate-in fade-in zoom-in duration-500">
           <div className="text-6xl md:text-8xl font-cinzel font-black text-gold-bright drop-shadow-[0_0_30px_rgba(240,192,64,0.8)] tracking-widest text-center uppercase">
              À VOS DÉS !
           </div>
        </div>
      )}

      {/* Banner / Title */}
      {isActive && currentActor && (
        <div className="mb-3 flex flex-col items-center">
           <div className={`font-cinzel font-black tracking-[0.2em] text-sm px-6 py-1 rounded-full border bg-black/80 backdrop-blur-md shadow-lg ${
             isMyTurn 
              ? 'text-gold-bright border-gold-DEFAULT shadow-gold-DEFAULT/20' 
              : 'text-gray-400 border-gray-700'
           }`}>
              {isMyTurn ? 'YOUR TURN' : 'WAIT !'}
           </div>
        </div>
      )}

      <div className="flex items-center gap-6 pointer-events-auto">
        
        {/* Previous */}
        {isActive && prevActor && prevActor.id !== currentActor?.id && (
          <div 
            onClick={() => zoomToToken(prevActor!.id)}
            className="flex flex-col items-center opacity-40 hover:opacity-100 transition-all cursor-pointer scale-75 origin-center hover:scale-90"
          >
            <div className="w-14 h-14 rounded-full border-2 border-gray-600 bg-gray-900 overflow-hidden shadow-black shadow-lg">
              {prevActor.image_url ? <img src={prevActor.image_url} alt="" className="w-full h-full object-cover" /> : null}
            </div>
          </div>
        )}

        {/* Current */}
        <div className="relative flex items-center justify-center group">
          <div 
             onClick={() => currentActor && zoomToToken(currentActor.id)}
             className="flex flex-col items-center cursor-pointer"
          >
             <div className={`w-24 h-24 rounded-full border-[3px] shadow-2xl overflow-hidden transition-all duration-300 bg-[#0D0D0F] flex items-center justify-center ${isActive ? 'border-gold-DEFAULT shadow-gold-DEFAULT/40 scale-110' : 'border-gray-700 opacity-60'}`}>
                {currentActor?.image_url ? (
                  <img src={currentActor.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Swords size={32} className={isActive ? "text-gold-DEFAULT/50" : "text-gray-700"} />
                )}
             </div>
             
             {/* Name Tag (Only for current) */}
             {(isActive || isHost) && currentActor && (
               <div className="absolute -bottom-4 bg-black/90 border border-gold-DEFAULT/40 px-5 py-1.5 rounded-full text-gold-bright font-bold text-xs tracking-widest backdrop-blur-md shadow-lg whitespace-nowrap">
                 {currentActor.name}
               </div>
             )}
          </div>
        </div>

        {/* Next */}
        {isActive && nextActor && nextActor.id !== currentActor?.id && (
           <div 
             onClick={() => zoomToToken(nextActor!.id)}
             className="flex flex-col items-center opacity-40 hover:opacity-100 transition-all cursor-pointer scale-75 origin-center hover:scale-90"
           >
             <div className="w-14 h-14 rounded-full border-2 border-gray-600 bg-gray-900 overflow-hidden shadow-black shadow-lg">
               {nextActor.image_url ? <img src={nextActor.image_url} alt="" className="w-full h-full object-cover" /> : null}
             </div>
           </div>
        )}

        {/* Admin Controls (Right side of the carousel) */}
        {isHost && (
          <div className="flex flex-col gap-2 ml-4">
            {isActive && (
              <button 
                onClick={handleNext}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-black/60 border border-gold-DEFAULT/30 text-gold-DEFAULT hover:bg-gold-DEFAULT/20 hover:border-gold-DEFAULT hover:scale-110 transition-all backdrop-blur-sm"
                title="Tour Suivant"
              >
                <ChevronRight size={20} />
              </button>
            )}
            <button 
              onClick={handleOpenManager}
              className={`flex items-center justify-center gap-2 px-4 h-10 rounded-full transition-all border backdrop-blur-sm ${isActive ? 'bg-black/60 border-red-500/30 text-red-400 hover:bg-red-900/40 hover:border-red-500 hover:scale-110' : 'bg-black/60 border-gold-DEFAULT/30 text-gold-DEFAULT hover:bg-gold-DEFAULT/20 hover:border-gold-DEFAULT hover:scale-110'}`}
              title="Gestionnaire d'Initiative"
            >
              <Swords size={18} />
              <span className="font-cinzel font-bold text-xs tracking-widest uppercase">Fight</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
