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

export interface Character {
  id: string;
  session_id: string;
  peer_id: string;
  name: string;
  stats: Record<string, number>;
  bars: Record<string, number>;
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
  getCharacters: (sessionId: string) => Promise<Character[]>;
  addCharacter: (character: Character) => Promise<void>;
  removeCharacter: (id: string) => Promise<void>;
  updateCharacter: (id: string, name: string, stats: Record<string, number>, bars: Record<string, number>) => Promise<void>;
  openExternalWindow: (type: string, sessionId: string) => Promise<void>;
  reDock: (type: string, sessionId: string) => Promise<void>;
  onReDock: (callback: (type: string) => void) => (() => void);
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  toggleFullscreen: () => void;
  closeWindow: () => void;
  onFullscreen: (callback: (isFS: boolean) => void) => (() => void);
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
  getCharacters: (sessionId: string) => ipcRenderer.invoke('characters:getAll', sessionId),
  addCharacter: (character: Character) => ipcRenderer.invoke('characters:add', character),
  removeCharacter: (id: string) => ipcRenderer.invoke('characters:remove', id),
  updateCharacter: (id: string, name: string, stats: Record<string, number>, bars: Record<string, number>) => ipcRenderer.invoke('characters:update', id, name, stats, bars),
  openExternalWindow: (type: string, sessionId: string) => ipcRenderer.invoke('windows:openExternal', type, sessionId),
  reDock: (type: string, sessionId: string) => ipcRenderer.invoke('windows:reDock', type, sessionId),
  onReDock: (callback: (type: string) => void) => {
    const listener = (_event: any, type: string) => callback(type);
    ipcRenderer.on('windows:reDocked', listener);
    return () => {
      ipcRenderer.removeListener('windows:reDocked', listener);
    };
  },
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  toggleFullscreen: () => ipcRenderer.send('window:toggle-fullscreen'),
  closeWindow: () => ipcRenderer.send('window:close'),
  onFullscreen: (callback: (isFS: boolean) => void) => {
    const listener = (_event: any, isFS: boolean) => callback(isFS);
    ipcRenderer.on('window:fullscreen', listener);
    return () => {
      ipcRenderer.removeListener('window:fullscreen', listener);
    };
  },
});

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}