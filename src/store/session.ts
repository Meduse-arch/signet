import { create } from 'zustand';
import { Session } from '../services/session.service';

interface SessionState {
  sessions: Session[];
  activePeerId: string | null;
  isLoading: boolean;
  setSessions: (sessions: Session[]) => void;
  addSession: (session: Session) => void;
  removeSession: (id: string) => void;
  setActivePeer: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  sessions: [],
  activePeerId: null,
  isLoading: true,
  setSessions: (sessions) => set({ sessions }),
  addSession: (session) => set((state) => {
    const exists = state.sessions.find(s => s.id === session.id);
    if (exists) {
      return { 
        sessions: state.sessions
          .map(s => s.id === session.id ? session : s)
          .sort((a, b) => b.lastPlayed - a.lastPlayed)
      };
    }
    return { 
      sessions: [session, ...state.sessions].sort((a, b) => b.lastPlayed - a.lastPlayed) 
    };
  }),
  removeSession: (id) => set((state) => ({ sessions: state.sessions.filter(s => s.id !== id) })),
  setActivePeer: (id) => set({ activePeerId: id }),
  setLoading: (loading) => set({ isLoading: loading }),
}));