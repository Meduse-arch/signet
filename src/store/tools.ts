import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PaintType = 'wall' | 'rain' | 'fog';

export const PAINT_TYPE_COLORS: Record<PaintType, string> = {
  wall: '#F97316',  // Orange vif — mur/blocage
  rain: '#38BDF8',  // Bleu ciel — pluie
  fog:  '#A78BFA',  // Violet clair — brouillard
};

interface ToolsState {
  shareRuler: boolean;
  sharePing: boolean;
  pingRadius: number; // en cases
  paintType: PaintType;
  isEraserActive: boolean;
  paintRadius: number;
  setShareRuler: (share: boolean) => void;
  setSharePing: (share: boolean) => void;
  setPingRadius: (radius: number) => void;
  setPaintType: (type: PaintType) => void;
  setIsEraserActive: (active: boolean) => void;
  setPaintRadius: (radius: number) => void;
}

export const useToolsStore = create<ToolsState>()(
  persist(
    (set) => ({
      shareRuler: false,
      sharePing: false, // Le ping est privé par défaut
      pingRadius: 1, // 1 case par défaut
      paintType: 'wall' as PaintType,
      isEraserActive: false,
      paintRadius: 1,
      setShareRuler: (share) => set({ shareRuler: share }),
      setSharePing: (share) => set({ sharePing: share }),
      setPingRadius: (radius) => set({ pingRadius: radius }),
      setPaintType: (type) => set({ paintType: type }),
      setIsEraserActive: (active) => set({ isEraserActive: active }),
      setPaintRadius: (radius) => set({ paintRadius: radius }),
    }),
    {
      name: 'signet-tools-storage',
    }
  )
);
