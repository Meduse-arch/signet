import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ToolsState {
  shareRuler: boolean;
  sharePing: boolean;
  pingRadius: number; // en cases
  setShareRuler: (share: boolean) => void;
  setSharePing: (share: boolean) => void;
  setPingRadius: (radius: number) => void;
}

export const useToolsStore = create<ToolsState>()(
  persist(
    (set) => ({
      shareRuler: false,
      sharePing: false, // Le ping est privé par défaut
      pingRadius: 1, // 1 case par défaut
      setShareRuler: (share) => set({ shareRuler: share }),
      setSharePing: (share) => set({ sharePing: share }),
      setPingRadius: (radius) => set({ pingRadius: radius }),
    }),
    {
      name: 'signet-tools-storage',
    }
  )
);
