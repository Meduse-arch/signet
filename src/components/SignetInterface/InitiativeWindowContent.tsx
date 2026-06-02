import React, { useState } from 'react';
import { useCombatStore } from '../../store/combat';
import { usePeer } from '../../hooks/usePeer';
import { useCharactersStore } from '../../store/characters';
import { usePeersStore } from '../../store/peers';

export const InitiativeWindowContent = ({ sessionId }: { sessionId: string }) => {
  const { isHost } = usePeersStore();
  const { broadcast } = usePeer();
  const {
    isActive, currentRound, activeActorId, actors,
    startCombat, endCombat, nextTurn, addActor, removeActor, reorderActors, setActors
  } = useCombatStore();

  const characters = useCharactersStore(state => state.characters);

  const saveAndBroadcast = async () => {
    setTimeout(async () => {
      const state = useCombatStore.getState();
      if (window.electronAPI && window.electronAPI.saveCombatState) {
        await window.electronAPI.saveCombatState(sessionId, state);
      }
      broadcast({ type: 'COMBAT_STATE_UPDATE', payload: state });
    }, 50);
  };

  const handleStart = async () => {
    // Jet d'initiative automatique pour les PNJs / Monstres
    const updatedActors = actors.map(actor => {
      const char = characters.find(c => c.id === actor.character_id);
      const isPlayer = char && char.user_id; // S'il a un user_id, c'est un joueur
      if (!isPlayer) {
        return { ...actor, initiative: Math.floor(Math.random() * 20) + 1 };
      }
      return actor;
    });

    // Tri automatique (Initiative décroissante)
    const sortedActors = [...updatedActors].sort((a, b) => b.initiative - a.initiative).map((a, index) => ({ ...a, turn_order: index }));
    setActors(sortedActors);

    startCombat();
    await saveAndBroadcast();

    // Envoi du signal aux joueurs pour jeter les dés
    broadcast({ type: 'ROLL_INITIATIVE_PROMPT', payload: {} });
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

    addActor({
      id: char.id,
      character_id: char.id,
      name: char.name,
      initiative: 0,
      turn_order: actors.length,
      is_active: false,
      conditions: [],
      image_url: char.image_url
    });
    saveAndBroadcast();
  };

  const handleAddAllCharacters = () => {
    let changed = false;
    characters.forEach(char => {
      if (!actors.find(a => a.id === char.id)) {
        addActor({
          id: char.id,
          character_id: char.id,
          name: char.name,
          initiative: 0,
          turn_order: actors.length, // L'ordre sera trié au lancement
          is_active: false,
          conditions: [],
          image_url: char.image_url
        });
        changed = true;
      }
    });
    if (changed) saveAndBroadcast();
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

  if (!isHost) {
    return <div className="p-4 text-center text-red-500 font-cinzel">Réservé au Maître de Jeu</div>;
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
              {actor.image_url ? (
                <img src={actor.image_url} alt="" className="w-10 h-10 rounded-full border border-gray-700 object-cover" />
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
