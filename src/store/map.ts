import { create } from 'zustand';

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
      const channel = new BroadcastChannel(`signet_map_store_sync_${sessionId}`);
      channel.postMessage({ type: 'MAP_UPDATE_INTERNAL', payload: { characterId, isOnMap } });
      channel.close();
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
      const channel = new BroadcastChannel(`signet_map_store_sync_${sessionId}`);
      channel.postMessage({ type: 'MAP_LIST_INTERNAL', payload: { characterIds } });
      channel.close();
    }
  },
  initialize: (sessionId: string) => {
    const syncChannel = new BroadcastChannel(`signet_map_store_sync_${sessionId}`);
    syncChannel.onmessage = (event) => {
      const { type, payload } = event.data;
      if (type === 'MAP_UPDATE_INTERNAL') {
        get().setTokenStatus(payload.characterId, payload.isOnMap, true);
      } else if (type === 'MAP_LIST_INTERNAL') {
        get().updateTokenList(payload.characterIds, true);
      }
    };
  }
}));
