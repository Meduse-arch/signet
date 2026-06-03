import React, { useEffect } from 'react';
import { useCombatStore } from '../../store/combat';
import { usePeer } from '../../hooks/usePeer';
import { useSignetStore } from '../../store/signet';
import { usePeersStore } from '../../store/peers';
import { useAuthStore } from '../../store/auth';
import { useCharactersStore } from '../../store/characters';
import { Swords, ChevronRight } from 'lucide-react';
import { AssetImage } from '../AssetImage';
import { useTranslation } from 'react-i18next';

export const CombatHUD = ({ sessionId }: { sessionId: string }) => {
  const { t } = useTranslation();
  const { isActive, activeActorId, actors, nextTurn } = useCombatStore();
  const { isHost } = usePeersStore();
  const { user } = useAuthStore();
  const { broadcast } = usePeer();
  const openWindow = useSignetStore(state => state.openWindow);
  const characters = useCharactersStore(state => state.characters);

  const handleOpenManager = () => {
    openWindow('combat');
  };

  const handleNext = () => {
    if (!isHost) {
      broadcast({ type: 'NEXT_TURN_REQUEST' });
      return;
    }

    nextTurn();
    const rawState = useCombatStore.getState();
    const payload = {
      isActive: rawState.isActive,
      currentRound: rawState.currentRound,
      activeActorId: rawState.activeActorId,
      actors: rawState.actors,
      isInitiativeWindowOpen: rawState.isInitiativeWindowOpen
    };

    if (window.electronAPI) window.electronAPI.saveCombatState(sessionId, payload);
    
    // Synchro locale fenêtres MJ
    const channel = new BroadcastChannel(`signet_sync_${sessionId}`);
    channel.postMessage({ type: 'COMBAT_STATE_UPDATE', payload });
    channel.close();

    // Synchro P2P joueurs
    broadcast({ type: 'COMBAT_STATE_UPDATE', payload });
  };

  // Identifier le personnage du joueur local et s'il est dans le combat
  const myChar = characters.find(c => c.user_id === user?.id);
  const myCharInCombat = myChar ? actors.some(a => a.character_id === myChar.id) : false;

  // MJ : toujours visible. Joueur : visible si combat actif OU si son perso participe
  const shouldShowHUD = isHost || isActive || myCharInCombat;
  if (!shouldShowHUD) return null;

  const sortedActors = [...actors].sort((a, b) => a.turn_order - b.turn_order);
  const currentIndex = sortedActors.findIndex(a => a.id === activeActorId);
  
  let currentActor = currentIndex !== -1 ? sortedActors[currentIndex] : null;
  const nextActor1 = sortedActors.length > 1 ? sortedActors[(currentIndex + 1) % sortedActors.length] : null;
  const nextActor2 = sortedActors.length > 2 ? sortedActors[(currentIndex + 2) % sortedActors.length] : null;

  if (isActive && !currentActor && sortedActors.length > 0) {
    currentActor = sortedActors[0];
  }
  if (!isActive && (isHost || myCharInCombat) && sortedActors.length > 0) {
    currentActor = sortedActors[0];
  }

  const zoomToToken = (actorId: string) => {
    window.dispatchEvent(new CustomEvent('ZOOM_TO_TOKEN', { detail: { id: actorId } }));
  };

  const isMyTurn = isActive && currentActor && myChar && currentActor.character_id === myChar.id;

  const Avatar = ({ actor, size = "w-10 h-10", isActive = false, onClick }: any) => {
    if (!actor) return null;
    return (
      <div 
        onClick={onClick}
        className={`relative rounded-full flex-shrink-0 cursor-pointer overflow-hidden bg-[#1A1A20] transition-all duration-300 border ${isActive ? 'border-gold-DEFAULT shadow-[0_0_15px_rgba(240,192,64,0.2)] scale-110 z-10' : 'border-white/10 opacity-60 hover:opacity-100 hover:scale-105'}`}
      >
        <div className={`${size}`}>
          {(characters.find(c => c.id === actor.character_id)?.image_url || actor.image_url) ? (
            <AssetImage src={characters.find(c => c.id === actor.character_id)?.image_url || actor.image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-600">
               <Swords size={size.includes('14') ? 24 : 16} />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[150] pointer-events-auto">
      <div className="flex items-center gap-3 bg-[#08080A]/70 backdrop-blur-2xl border border-white/5 rounded-full pl-3 pr-3 py-2 shadow-2xl transition-all duration-500">
        
        {/* Actuel */}
        {currentActor && (
          <div className="flex items-center gap-4 bg-white/5 pr-6 pl-2 py-1.5 rounded-full border border-white/5">
             <Avatar actor={currentActor} size="w-14 h-14" isActive={isActive} onClick={() => zoomToToken(currentActor.id)} />
             
             <div className="flex flex-col">
               {(isActive || isHost || myCharInCombat) && (
                 <span className="font-cinzel font-bold tracking-widest text-sm text-gray-200">{currentActor.name}</span>
               )}
             </div>
          </div>
        )}

        {isActive && nextActor1 && nextActor1.id !== currentActor?.id && (
           <ChevronRight size={16} className="text-white/20" />
        )}

        {/* Suivants */}
        {isActive && nextActor1 && nextActor1.id !== currentActor?.id && (
           <Avatar actor={nextActor1} size="w-10 h-10" onClick={() => zoomToToken(nextActor1.id)} />
        )}

        {isActive && nextActor2 && nextActor2.id !== currentActor?.id && nextActor2.id !== nextActor1?.id && (
           <Avatar actor={nextActor2} size="w-8 h-8" onClick={() => zoomToToken(nextActor2.id)} />
        )}

        {/* Controls */}
        <div className="w-[1px] h-8 bg-white/10 mx-2"></div>
        <div className="flex items-center gap-2">
          {isActive && (isHost || isMyTurn) && (
            <button 
              onClick={handleNext}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-black/40 border border-gold-DEFAULT/20 text-gold-DEFAULT hover:bg-gold-DEFAULT/10 hover:border-gold-DEFAULT/50 transition-all"
              title={t('context.nextTurn', 'Tour Suivant')}
            >
              <ChevronRight size={20} />
            </button>
          )}
          <button 
            onClick={handleOpenManager}
            className={`flex items-center justify-center w-10 h-10 rounded-full transition-all border ${isActive ? 'bg-red-900/20 border-red-500/20 text-red-400 hover:bg-red-900/40 hover:border-red-500/50' : 'bg-black/40 border-gold-DEFAULT/20 text-gold-DEFAULT hover:bg-gold-DEFAULT/10 hover:border-gold-DEFAULT/50'}`}
            title={isHost ? t('context.combatManagement', "Gestion des Combats") : t('context.combatOrder', "Ordre de Combat")}
          >
            <Swords size={18} />
          </button>
        </div>

      </div>
    </div>
  );
};
