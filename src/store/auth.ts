import { create } from 'zustand';

export type UserRole = 'joueur' | 'admin' | 'mj';

export interface User {
  id: string;
  pseudo: string;
  role: UserRole;
}

interface AuthState {
  user: User | null;
  setUser: (user: User | null, remember?: boolean) => void;
  logout: () => void;
}

// Récupérer l'utilisateur initial s'il a été mémorisé
const savedUser = localStorage.getItem('signet_auth_user');
const initialUser = savedUser ? JSON.parse(savedUser) : null;

export const useAuthStore = create<AuthState>((set) => ({
  user: initialUser,
  setUser: (user, remember = false) => {
    set({ user });
    if (user && remember) {
      localStorage.setItem('signet_auth_user', JSON.stringify(user));
    } else if (!user) {
      localStorage.removeItem('signet_auth_user');
    }
  },
  logout: () => {
    set({ user: null });
    localStorage.removeItem('signet_auth_user');
  },
}));