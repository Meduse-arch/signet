import { contextBridge, ipcRenderer } from 'electron';

export interface Session {
  id: string;
  name: string;
  imageUrl?: string;
  settings?: Record<string, any>;
  lastPlayed: number;
  hostPeerId: string;
  system?: string;
}

export interface SessionPlayer {
  session_id: string;
  peer_id: string;
  pseudo: string;
}

export interface ElectronAPI {
  getSessions: () => Promise<Session[]>;
  addSession: (session: Session) => Promise<void>;
  removeSession: (id: string) => Promise<void>;
  updateLastPlayed: (id: string, lastPlayed: number) => Promise<void>;
  getPlayers: (sessionId: string) => Promise<SessionPlayer[]>;
  addPlayer: (sessionId: string, peerId: string, pseudo: string) => Promise<void>;
  removePlayer: (sessionId: string, peerId: string) => Promise<void>;
  clearPlayers: (sessionId: string) => Promise<void>;
}

contextBridge.exposeInMainWorld('electronAPI', {
  getSessions: () => ipcRenderer.invoke('sessions:getAll'),
  addSession: (session: Session) => ipcRenderer.invoke('sessions:add', session),
  removeSession: (id: string) => ipcRenderer.invoke('sessions:remove', id),
  updateLastPlayed: (id: string, lastPlayed: number) => ipcRenderer.invoke('sessions:updateLastPlayed', id, lastPlayed),
  getPlayers: (sessionId: string) => ipcRenderer.invoke('players:getAll', sessionId),
  addPlayer: (sessionId: string, peerId: string, pseudo: string) => ipcRenderer.invoke('players:add', sessionId, peerId, pseudo),
  removePlayer: (sessionId: string, peerId: string) => ipcRenderer.invoke('players:remove', sessionId, peerId),
  clearPlayers: (sessionId: string) => ipcRenderer.invoke('players:clear', sessionId),
});

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}