import React, { useState } from 'react';
import { useCombatStore } from '../../store/combat';
import { usePeer } from '../../hooks/usePeer';
import { useCharactersStore } from '../../store/characters';
import { usePeersStore } from '../../store/peers';
import { useMapStore } from '../../store/map';
import { AssetImage } from '../AssetImage';
import { useAuthStore, SecurityLevel } from '../../store/auth';

export const InitiativeWindowContent = ({ sessionId }: { sessionId: string }) => {
  const { isHost } = usePeersStore();
  const { user } = useAuthStore();
  const isMJ = !!user && user.role >= SecurityLevel.MJ;
  const { broadcast } = usePeer();
  const {
    isActive, currentRound, activeActorId, actors,
    startCombat, endCombat, nextTurn, addActor, removeActor, reorderActors, setActors
  } = useCombatStore();

  const characters = useCharactersStore(state => state.characters);
  const tokenStatuses = useMapStore(state => state.tokenStatuses);

  React.useEffect(() => {
    // Si on est en mode Electron, on peut récupérer l'état directement depuis le backend
    if (window.electronAPI && window.electronAPI.getCombatState) {
      window.electronAPI.getCombatState(sessionId).then((savedState: any) => {
        if (savedState) {
          useCombatStore.getState()._applySync({
            isActive: savedState.is_active,
            currentRound: savedState.current_round,
            activeActorId: savedState.active_actor_id,
            actors: savedState.actors.map((a: any) => {
              const matchingChar = useCharactersStore.getState().characters.find(c => c.id === a.character_id);
              return {
                ...a,
                image_url: matchingChar ? matchingChar.image_url : a.image_url
              };
            }),
            isInitiativeWindowOpen: true
          });
        }
      });
    } else {
      // Fallback web: Demander la synchronisation de l'état du combat à la fenêtre principale
      const channel = new BroadcastChannel(`signet_sync_${sessionId}`);
      channel.postMessage({ type: 'REQUEST_COMBAT_STATE' });
      channel.close();
    }
  }, [sessionId]);

  const saveAndBroadcast = async () => {
    setTimeout(async () => {
      const rawState = useCombatStore.getState();
      const payload = {
        isActive: rawState.isActive,
        currentRound: rawState.currentRound,
        activeActorId: rawState.activeActorId,
        actors: rawState.actors,
        isInitiativeWindowOpen: rawState.isInitiativeWindowOpen
      };

      if (window.electronAPI && window.electronAPI.saveCombatState) {
        // Le backend attend du snake_case
        await window.electronAPI.saveCombatState(sessionId, {
          is_active: rawState.isActive,
          current_round: rawState.currentRound,
          active_actor_id: rawState.activeActorId,
          actors: rawState.actors
        });
      }
      
      // Relais via BroadcastChannel pour la fenêtre principale
      const channel = new BroadcastChannel(`signet_sync_${sessionId}`);
      channel.postMessage({ type: 'COMBAT_STATE_UPDATE', payload });
      channel.close();

      // Broadcast P2P (utile si le gestionnaire n'est pas en mode pop-out)
      if (isHost) {
        broadcast({ type: 'COMBAT_STATE_UPDATE', payload });
      }
    }, 50);
  };

  const resolveInitiativeAndSort = (actorsList: any[]) => {
    // Cloner pour éviter de muter le store Zustand directement
    const clonedActors = actorsList.map(a => ({
      ...a,
      tiebreaker_rolls: a.tiebreaker_rolls ? [...a.tiebreaker_rolls] : []
    }));

    // 1. Assigner un jet à ceux qui n'en ont pas
    clonedActors.forEach(a => {
      if (!a.initiative) {
        const roll = Math.floor(Math.random() * 20) + 1;
        a.initiative = roll;
        a.tiebreaker_rolls = []; // Initialiser les jets de départage
        
        // Diffuser le résultat aux joueurs
        const char = characters.find(c => c.id === a.character_id);
        if (char && char.user_id) { // Uniquement si c'est un joueur
            broadcast({ 
              type: 'DICE_ROLL', 
              payload: {
                rolls: [roll],
                total: roll,
                bonus: 0,
                diceString: `1d20`,
                label: `Initiative`,
                color: '#d4af37',
                secret: false,
                timestamp: Date.now(),
                sender_id: char.user_id,
                sender_name: char.name
              } 
            });
        }
      }
    });

    // 2. Trier avec départage silencieux (Timsort)
    clonedActors.sort((a, b) => {
      if (a.initiative !== b.initiative) return b.initiative - a.initiative;
      
      let i = 0;
      while(true) {
        a.tiebreaker_rolls = a.tiebreaker_rolls || [];
        b.tiebreaker_rolls = b.tiebreaker_rolls || [];
        
        if (a.tiebreaker_rolls[i] === undefined) a.tiebreaker_rolls[i] = Math.floor(Math.random() * 20) + 1;
        if (b.tiebreaker_rolls[i] === undefined) b.tiebreaker_rolls[i] = Math.floor(Math.random() * 20) + 1;
        
        if (a.tiebreaker_rolls[i] !== b.tiebreaker_rolls[i]) {
          return b.tiebreaker_rolls[i] - a.tiebreaker_rolls[i];
        }
        i++;
      }
    });

    return clonedActors.map((a, index) => ({ ...a, turn_order: index }));
  };

  const handleStart = async () => {
    const sortedActors = resolveInitiativeAndSort([...actors]);
    
    // Activer le premier acteur immédiatement (pas besoin d'appuyer sur Suivant)
    const firstActor = sortedActors[0] ?? null;
    const actorsWithActive = sortedActors.map((a, i) => ({ ...a, is_active: i === 0 }));
    
    setActors(actorsWithActive);
    // On démarre avec le premier acteur déjà sélectionné
    useCombatStore.getState().setCombatState({
      isActive: true,
      currentRound: 1,
      activeActorId: firstActor?.id ?? null,
      actors: actorsWithActive,
    });
    await saveAndBroadcast();
  };

  const handleEnd = async () => {
    endCombat();
    await saveAndBroadcast();
  };

  const handleNextTurn = async () => {
    nextTurn();
    await saveAndBroadcast();
  };

  const handleAddCharacter = (charId: string) => {
    const char = characters.find(c => c.id === charId);
    if (!char) return;
    if (actors.find(a => a.id === char.id)) return;

    let newActors = [...actors, {
      id: char.id,
      character_id: char.id,
      name: char.name,
      initiative: 0,
      turn_order: actors.length,
      is_active: false,
      conditions: [],
      image_url: char.image_url
    }];

    if (isActive) {
      newActors = resolveInitiativeAndSort(newActors);
      setActors(newActors);
    } else {
      setActors(newActors);
    }
    saveAndBroadcast();
  };

  const handleAddAllCharacters = () => {
    let changed = false;
    let newActors = [...actors];
    
    // Seulement les personnages dont le token est posé sur la scène courante
    const charsOnMap = characters.filter(char => tokenStatuses[char.id] === true);

    charsOnMap.forEach(char => {
      if (!newActors.find(a => a.id === char.id)) {
        newActors.push({
          id: char.id,
          character_id: char.id,
          name: char.name,
          initiative: 0,
          turn_order: newActors.length,
          is_active: false,
          conditions: [],
          image_url: char.image_url
        });
        changed = true;
      }
    });

    if (changed) {
      if (isActive) {
        newActors = resolveInitiativeAndSort(newActors);
      }
      setActors(newActors);
      saveAndBroadcast();
    }
  };

  const updateInitiative = (actorId: string, init: number) => {
    const newActors = actors.map(a => a.id === actorId ? { ...a, initiative: init } : a);
    setActors(newActors);
    saveAndBroadcast();
  };

  const moveActor = (index: number, direction: -1 | 1) => {
    if (index + direction < 0 || index + direction >= actors.length) return;
    const newActors = [...actors];
    const temp = newActors[index];
    newActors[index] = newActors[index + direction];
    newActors[index + direction] = temp;
    reorderActors(newActors);
    saveAndBroadcast();
  };

  if (!isMJ) {
    return (
      <div className="flex flex-col h-full bg-[#0D0D0F] text-gray-300 p-4 font-inter text-sm">
        <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
          <h2 className="font-cinzel text-xl text-gold-DEFAULT tracking-wider">Ordre de Combat</h2>
        </div>

        <div className="mb-4 flex items-center justify-between text-xs text-gray-400 uppercase tracking-widest">
          <span>Statut : {isActive ? <span className="text-green-400 font-bold">En cours</span> : 'Attente'}</span>
          {isActive && <span className="font-bold text-gold-bright">Round {currentRound}</span>}
        </div>

        <div className="flex-1 overflow-y-auto mb-4 bg-black/20 rounded-xl p-2 border border-white/5 shadow-inner">
          {actors.map((actor) => (
            <div key={actor.id} className={`flex items-center gap-3 p-2 mb-2 rounded-lg border transition-all duration-300 ${actor.id === activeActorId ? 'border-gold-DEFAULT bg-gold-DEFAULT/10 shadow-[0_0_15px_rgba(240,192,64,0.15)] scale-[1.02]' : 'border-white/5 bg-black/40'}`}>
              
              <div className="relative">
                {(characters.find(c => c.id === actor.character_id)?.image_url || actor.image_url) ? (
                  <AssetImage src={characters.find(c => c.id === actor.character_id)?.image_url || actor.image_url} alt="" className="w-10 h-10 rounded-full border border-gray-700 object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full border border-gray-700 bg-gray-900 flex items-center justify-center font-cinzel text-xs text-gray-500">?</div>
                )}
                {actor.id === activeActorId && <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0D0D0F]"></div>}
              </div>
              
              <div className="flex-1 min-w-0 flex items-center justify-between pr-2">
                <div className={`font-bold truncate ${actor.id === activeActorId ? 'text-gold-bright' : 'text-gray-300'}`}>{actor.name}</div>
              </div>
            </div>
          ))}
          {actors.length === 0 && <div className="text-center text-gray-600 mt-8 font-cinzel tracking-wider text-xs">Aucun combattant</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0D0D0F] text-gray-300 p-4 font-inter text-sm">
      <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
        <h2 className="font-cinzel text-xl text-gold-DEFAULT tracking-wider">Gestion des Combats</h2>
        <div className="flex gap-2">
          {!isActive ? (
            <button onClick={handleStart} className="px-4 py-1.5 bg-green-500/10 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/20 transition-all font-semibold uppercase text-xs tracking-wider">Lancer</button>
          ) : (
            <button onClick={handleEnd} className="px-4 py-1.5 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/20 transition-all font-semibold uppercase text-xs tracking-wider">Terminer</button>
          )}
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between text-xs text-gray-400 uppercase tracking-widest">
        <span>Statut : {isActive ? <span className="text-green-400 font-bold">En cours</span> : 'Attente'}</span>
        {isActive && <span className="font-bold text-gold-bright">Round {currentRound}</span>}
      </div>

      <div className="flex gap-2 mb-6">
        <select onChange={(e) => { if(e.target.value) handleAddCharacter(e.target.value); e.target.value=''; }} className="bg-black/40 border border-white/10 rounded-lg p-2 flex-1 outline-none focus:border-gold-DEFAULT/50 text-gray-300">
          <option value="">+ Ajouter un Personnage / Monstre...</option>
          {characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button onClick={handleAddAllCharacters} className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors text-xs font-semibold whitespace-nowrap">Tout Ajouter</button>
      </div>

      <div className="flex-1 overflow-y-auto mb-4 bg-black/20 rounded-xl p-2 border border-white/5 shadow-inner">
        {actors.map((actor, index) => (
          <div key={actor.id} className={`flex items-center gap-3 p-2 mb-2 rounded-lg border transition-all duration-300 ${actor.id === activeActorId ? 'border-gold-DEFAULT bg-gold-DEFAULT/10 shadow-[0_0_15px_rgba(240,192,64,0.15)] scale-[1.02]' : 'border-white/5 bg-black/40'}`}>
            <div className="flex flex-col gap-1">
              <button onClick={() => moveActor(index, -1)} disabled={index === 0} className="text-gray-600 hover:text-white disabled:opacity-20 transition-colors">▲</button>
              <button onClick={() => moveActor(index, 1)} disabled={index === actors.length - 1} className="text-gray-600 hover:text-white disabled:opacity-20 transition-colors">▼</button>
            </div>
            
            <div className="relative">
              {(characters.find(c => c.id === actor.character_id)?.image_url || actor.image_url) ? (
                <AssetImage src={characters.find(c => c.id === actor.character_id)?.image_url || actor.image_url} alt="" className="w-10 h-10 rounded-full border border-gray-700 object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full border border-gray-700 bg-gray-900 flex items-center justify-center font-cinzel text-xs text-gray-500">?</div>
              )}
              {actor.id === activeActorId && <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0D0D0F]"></div>}
            </div>
            
            <div className="flex-1 min-w-0 flex items-center justify-between pr-2">
              <div className={`font-bold truncate ${actor.id === activeActorId ? 'text-gold-bright' : 'text-gray-300'}`}>{actor.name}</div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 tracking-wider">Init:</span>
                <input 
                  type="number" 
                  value={actor.initiative} 
                  onChange={(e) => updateInitiative(actor.id, parseInt(e.target.value) || 0)}
                  className="w-12 bg-black/40 border border-white/10 rounded text-center text-gray-300 focus:border-gold-DEFAULT"
                />
              </div>
            </div>

            <button onClick={() => { removeActor(actor.id); saveAndBroadcast(); }} className="text-gray-600 hover:text-red-400 px-2 transition-colors">✕</button>
          </div>
        ))}
        {actors.length === 0 && <div className="text-center text-gray-600 mt-8 font-cinzel tracking-wider text-xs">Aucun combattant</div>}
      </div>

      {isActive && (
        <button onClick={handleNextTurn} className="w-full py-4 mt-auto bg-gradient-to-r from-gold-DEFAULT/10 via-gold-DEFAULT/20 to-gold-DEFAULT/10 text-gold-bright border border-gold-DEFAULT/50 rounded-xl hover:from-gold-DEFAULT/20 hover:via-gold-DEFAULT/30 hover:to-gold-DEFAULT/20 transition-all font-cinzel font-bold tracking-[0.2em] uppercase shadow-[0_0_20px_rgba(240,192,64,0.15)] flex justify-center items-center gap-2">
          Tour Suivant <span>➔</span>
        </button>
      )}
    </div>
  );
};
