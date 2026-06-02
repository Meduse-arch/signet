import { create } from 'zustand';
import { setupStoreSync, emitStoreSync } from './utils/storeSync';

export interface CombatActor {
  id: string; // Format attendu: mapId_characterId ou juste characterId
  character_id: string;
  name: string;
  initiative: number;
  turn_order: number;
  is_active: boolean;
  conditions: Array<{ name: string; duration: number }>;
  image_url?: string; // Ajout pratique pour l'UI
}

export interface CombatState {
  isActive: boolean;
  currentRound: number;
  activeActorId: string | null;
  actors: CombatActor[];
  isInitiativeWindowOpen: boolean;
  
  // Actions
  toggleInitiativeWindow: () => void;
  setCombatState: (state: Partial<CombatState>) => void;
  startCombat: () => void;
  endCombat: () => void;
  addActor: (actor: CombatActor) => void;
  removeActor: (id: string) => void;
  updateActor: (id: string, updates: Partial<CombatActor>) => void;
  nextTurn: () => void;
  setActors: (actors: CombatActor[]) => void;
  reorderActors: (actors: CombatActor[]) => void;
  
  // Fonction interne de synchronisation entre fenêtres (Electron)
  _applySync: (state: any) => void;
}

export const useCombatStore = create<CombatState>((set, get) => ({
  isActive: false,
  currentRound: 1,
  activeActorId: null,
  actors: [],
  isInitiativeWindowOpen: false,

  toggleInitiativeWindow: () => {
    const nextState = !get().isInitiativeWindowOpen;
    set({ isInitiativeWindowOpen: nextState });
    const sessionId = window.location.hash.split('/').pop()?.split('?')[0] || 'default';
    emitStoreSync('combat', sessionId, 'TOGGLE_WINDOW', { isInitiativeWindowOpen: nextState });
  },

  setCombatState: (state) => {
    set(state);
    const sessionId = window.location.hash.split('/').pop()?.split('?')[0] || 'default';
    emitStoreSync('combat', sessionId, 'SET_STATE', state);
  },

  startCombat: () => {
    set({ isActive: true, currentRound: 1 });
    const sessionId = window.location.hash.split('/').pop()?.split('?')[0] || 'default';
    emitStoreSync('combat', sessionId, 'START_COMBAT', { isActive: true, currentRound: 1 });
  },

  endCombat: () => {
    set({ isActive: false, actors: [], activeActorId: null, currentRound: 1 });
    const sessionId = window.location.hash.split('/').pop()?.split('?')[0] || 'default';
    emitStoreSync('combat', sessionId, 'END_COMBAT', { isActive: false, actors: [], activeActorId: null, currentRound: 1 });
  },

  addActor: (actor) => {
    const actors = [...get().actors, actor];
    set({ actors });
    const sessionId = window.location.hash.split('/').pop()?.split('?')[0] || 'default';
    emitStoreSync('combat', sessionId, 'SET_ACTORS', { actors });
  },

  removeActor: (id) => {
    const actors = get().actors.filter(a => a.id !== id);
    set({ actors });
    const sessionId = window.location.hash.split('/').pop()?.split('?')[0] || 'default';
    emitStoreSync('combat', sessionId, 'SET_ACTORS', { actors });
  },

  updateActor: (id, updates) => {
    const actors = get().actors.map(a => a.id === id ? { ...a, ...updates } : a);
    set({ actors });
    const sessionId = window.location.hash.split('/').pop()?.split('?')[0] || 'default';
    emitStoreSync('combat', sessionId, 'SET_ACTORS', { actors });
  },
  
  setActors: (actors) => {
    set({ actors });
    const sessionId = window.location.hash.split('/').pop()?.split('?')[0] || 'default';
    emitStoreSync('combat', sessionId, 'SET_ACTORS', { actors });
  },

  reorderActors: (actors) => {
    const reordered = actors.map((a, index) => ({ ...a, turn_order: index }));
    set({ actors: reordered });
    const sessionId = window.location.hash.split('/').pop()?.split('?')[0] || 'default';
    emitStoreSync('combat', sessionId, 'SET_ACTORS', { actors: reordered });
  },

  nextTurn: () => {
    const { actors, activeActorId, currentRound } = get();
    if (actors.length === 0) return;

    // Trier les acteurs par ordre de tour
    const sorted = [...actors].sort((a, b) => a.turn_order - b.turn_order);
    const currentIndex = sorted.findIndex(a => a.id === activeActorId);
    
    let nextIndex = currentIndex + 1;
    let nextRound = currentRound;

    // Si on arrive à la fin ou si personne n'est actif, on recommence au premier
    if (nextIndex >= sorted.length || currentIndex === -1) {
      nextIndex = 0;
      if (currentIndex !== -1) {
        nextRound += 1;
      }
    }

    const nextActor = sorted[nextIndex];
    const updatedActors = actors.map(a => ({
      ...a,
      is_active: a.id === nextActor.id
    }));

    set({ currentRound: nextRound, activeActorId: nextActor.id, actors: updatedActors });
    const sessionId = window.location.hash.split('/').pop()?.split('?')[0] || 'default';
    emitStoreSync('combat', sessionId, 'NEXT_TURN', { currentRound: nextRound, activeActorId: nextActor.id, actors: updatedActors });
  },

  _applySync: (state) => {
    set(state);
  }
}));

// Activation de la synchronisation inter-fenêtres locales avec un wrapper pour récupérer le sessionId au moment du message
if (typeof window !== 'undefined') {
  // On doit écouter sur 'default' et sur le sessionId courant pour capter tous les cas
  const initSync = () => {
    const sessionId = window.location.hash.split('/').pop()?.split('?')[0] || 'default';
    setupStoreSync('combat', sessionId, (type, payload) => {
      useCombatStore.getState()._applySync(payload);
    });
  };
  
  // Exécuter l'initialisation après le montage complet
  setTimeout(initSync, 100);
}
