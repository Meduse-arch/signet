import { create } from 'zustand';

interface MapState {
  tokenStatuses: Record<string, boolean>; // characterId -> isOnMap
  setTokenStatus: (characterId: string, isOnMap: boolean) => void;
  updateTokenList: (characterIds: string[]) => void;
}

export const useMapStore = create<MapState>((set) => ({
  tokenStatuses: {},
  setTokenStatus: (characterId, isOnMap) => 
    set((state) => ({ 
      tokenStatuses: { ...state.tokenStatuses, [characterId]: isOnMap } 
    })),
  updateTokenList: (characterIds) => {
    const newStatuses: Record<string, boolean> = {};
    characterIds.forEach(id => {
      newStatuses[id] = true;
    });
    set({ tokenStatuses: newStatuses });
  }
}));
