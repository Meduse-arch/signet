import { create } from 'zustand';

export enum SecurityLevel {
  PLAYER = 0,
  MJ = 1,
  ADMIN = 2
}

export type UserRole = 'joueur' | 'admin' | 'mj';

export interface User {
  id: string;
  pseudo: string;
  role: SecurityLevel;
}

interface AuthState {
  user: User | null;
  setUser: (user: any | null, remember?: boolean) => void;
  logout: () => void;
}

function mapRoleToLevel(role: string | number): SecurityLevel {
  if (typeof role === 'number') return role as SecurityLevel;
  switch (role) {
    case 'admin': return SecurityLevel.ADMIN;
    case 'mj': return SecurityLevel.MJ;
    default: return SecurityLevel.PLAYER;
  }
}

// Récupérer l'utilisateur initial s'il a été mémorisé
const savedUser = localStorage.getItem('signet_auth_user');
let initialUser = null;
if (savedUser) {
  try {
    const parsed = JSON.parse(savedUser);
    initialUser = { ...parsed, role: mapRoleToLevel(parsed.role) };
  } catch (e) {
    localStorage.removeItem('signet_auth_user');
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: initialUser,
  setUser: (user, remember = false) => {
    const mappedUser = user ? { ...user, role: mapRoleToLevel(user.role) } : null;
    set({ user: mappedUser });
    if (mappedUser && remember) {
      localStorage.setItem('signet_auth_user', JSON.stringify(mappedUser));
    } else if (!user) {
      localStorage.removeItem('signet_auth_user');
    }
  },
  logout: () => {
    set({ user: null });
    localStorage.removeItem('signet_auth_user');
  },
}));