import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PaintType = 'wall' | 'rain' | 'fog' | 'snow' | 'poison' | 'fire' | 'sand' | 'magic';

export const PAINT_TYPE_COLORS: Record<PaintType, string> = {
  wall: '#F97316',   // Orange vif — mur/blocage
  rain: '#38BDF8',   // Bleu ciel — pluie
  fog:  '#A78BFA',   // Violet clair — brouillard
  snow: '#FFFFFF',   // Blanc pur — neige
  poison: '#84CC16', // Vert acide — gaz toxique
  fire: '#EF4444',   // Rouge vif — feu/lave
  sand: '#EAB308',   // Jaune ocre — sable
  magic: '#2DD4BF',  // Cyan lumineux — magie/lucioles
};

interface ToolsState {
  shareRuler: boolean;
  sharePing: boolean;
  pingRadius: number; // en cases
  paintType: PaintType;
  isEraserActive: boolean;
  paintRadius: number;
  isPlacingSound: boolean;
  spatialTarget: { x: number; y: number; q: number; r: number } | null;
  setShareRuler: (share: boolean) => void;
  setSharePing: (share: boolean) => void;
  setPingRadius: (radius: number) => void;
  setPaintType: (type: PaintType) => void;
  setIsEraserActive: (active: boolean) => void;
  setPaintRadius: (radius: number) => void;
  setIsPlacingSound: (active: boolean) => void;
  setSpatialTarget: (target: { x: number; y: number; q: number; r: number } | null) => void;
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
      isPlacingSound: false,
      spatialTarget: null,
      setShareRuler: (share) => set({ shareRuler: share }),
      setSharePing: (share) => set({ sharePing: share }),
      setPingRadius: (radius) => set({ pingRadius: radius }),
      setPaintType: (type) => set({ paintType: type }),
      setIsEraserActive: (active) => set({ isEraserActive: active }),
      setPaintRadius: (radius) => set({ paintRadius: radius }),
      setIsPlacingSound: (active) => set({ isPlacingSound: active }), // On ne clear PAS la cible pour qu'elle reste affichée pdt le son
      setSpatialTarget: (target) => set({ spatialTarget: target }),
    }),
    {
      name: 'signet-tools-storage',
    }
  )
);
