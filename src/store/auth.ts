import { create } from 'zustand';

export type UserRole = 'joueur' | 'admin' | 'mj';

export interface User {
  id: string;
  pseudo: string;
  role: UserRole;
}

interface AuthState {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  logout: () => set({ user: null }),
}));