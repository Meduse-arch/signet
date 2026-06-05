import { create } from 'zustand';

export interface AudioTrack {
  id: string; // The hash of the audio file
  name: string;
  size: number; // in bytes
}

export type TrackStatus = 'missing' | 'transferring' | 'ready';

interface AudioState {
  tracks: AudioTrack[];
  // Map of track hash -> Map of peerId -> true if they have it
  peerPossession: Record<string, Record<string, boolean>>;
  // Map of track hash -> status for the host
  trackStatuses: Record<string, TrackStatus>;
  
  addTrack: (track: AudioTrack) => void;
  removeTrack: (trackHash: string) => void;
  setPeerPossession: (trackHash: string, peerId: string, hasIt: boolean) => void;
  updateTrackStatus: (trackHash: string, peerIds: string[]) => void;
}

export const useAudioStore = create<AudioState>((set, get) => ({
  tracks: [],
  peerPossession: {},
  trackStatuses: {},

  addTrack: (track) => set((state) => {
    if (state.tracks.find(t => t.id === track.id)) return state;
    return {
      tracks: [...state.tracks, track],
      trackStatuses: { ...state.trackStatuses, [track.id]: 'missing' }
    };
  }),

  removeTrack: (trackHash) => set((state) => {
    const newStatuses = { ...state.trackStatuses };
    delete newStatuses[trackHash];
    return {
      tracks: state.tracks.filter(t => t.id !== trackHash),
      trackStatuses: newStatuses
    };
  }),

  setPeerPossession: (trackHash, peerId, hasIt) => set((state) => {
    const possession = state.peerPossession[trackHash] || {};
    return {
      peerPossession: {
        ...state.peerPossession,
        [trackHash]: { ...possession, [peerId]: hasIt }
      }
    };
  }),

  updateTrackStatus: (trackHash, peerIds) => set((state) => {
    const possession = state.peerPossession[trackHash] || {};
    let allHaveIt = true;
    const someTransferring = false; // Logic to detect if a transfer is in progress would rely on TransferService

    for (const peerId of peerIds) {
      if (!possession[peerId]) {
        allHaveIt = false;
        break;
      }
    }

    // Default simplified logic: If everyone has it, it's ready. Otherwise missing/transferring.
    const status: TrackStatus = allHaveIt ? 'ready' : 'missing';
    
    return {
      trackStatuses: {
        ...state.trackStatuses,
        [trackHash]: status
      }
    };
  })
}));
