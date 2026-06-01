import { create } from 'zustand';
import { setupStoreSync, emitStoreSync } from './utils/storeSync';

interface MapState {
  tokenStatuses: Record<string, boolean>; // characterId -> isOnMap
  setTokenStatus: (characterId: string, isOnMap: boolean, skipSync?: boolean) => void;
  updateTokenList: (characterIds: string[], skipSync?: boolean) => void;
  initialize: (sessionId: string) => void;
}

export const useMapStore = create<MapState>((set, get) => ({
  tokenStatuses: {},
  setTokenStatus: (characterId, isOnMap, skipSync = false) => {
    set((state) => ({ 
      tokenStatuses: { ...state.tokenStatuses, [characterId]: isOnMap } 
    }));
    if (!skipSync) {
      // Pour éviter de chercher la session, on peut utiliser un nom générique ou localStorage
      const sessionId = localStorage.getItem('last_active_session') || 'default';
      emitStoreSync('map', sessionId, 'MAP_UPDATE_INTERNAL', { characterId, isOnMap });
    }
  },
  updateTokenList: (characterIds, skipSync = false) => {
    const newStatuses: Record<string, boolean> = {};
    characterIds.forEach(id => {
      newStatuses[id] = true;
    });
    set({ tokenStatuses: newStatuses });
    if (!skipSync) {
      const sessionId = localStorage.getItem('last_active_session') || 'default';
      emitStoreSync('map', sessionId, 'MAP_LIST_INTERNAL', { characterIds });
    }
  },
  initialize: (sessionId: string) => {
    setupStoreSync('map', sessionId, (type, payload) => {
      if (type === 'MAP_UPDATE_INTERNAL') {
        get().setTokenStatus(payload.characterId, payload.isOnMap, true);
      } else if (type === 'MAP_LIST_INTERNAL') {
        get().updateTokenList(payload.characterIds, true);
      }
    });
  }
}));
