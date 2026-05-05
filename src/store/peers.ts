import { create } from 'zustand';

interface PeersState {
  peerId: string | null;
  isHost: boolean;
  connections: string[]; // BUG 4 FIX : désormais synchronisé via peerService.onConnectionChange()
  setPeerId: (id: string | null) => void;
  setIsHost: (host: boolean) => void;
  setConnections: (conns: string[]) => void;
}

export const usePeersStore = create<PeersState>((set) => ({
  peerId: null,
  isHost: false,
  connections: [],
  setPeerId: (id) => set({ peerId: id }),
  setIsHost: (host) => set({ isHost: host }),
  setConnections: (conns) => set({ connections: conns }),
}));