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
  addSession: (session) => set((state) => ({ sessions: [...state.sessions, session] })),
  removeSession: (id) => set((state) => ({ sessions: state.sessions.filter(s => s.id !== id) })),
  setActivePeer: (id) => set({ activePeerId: id }),
  setLoading: (loading) => set({ isLoading: loading }),
}));