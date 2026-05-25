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
  role?: number;
}

export interface Character {
  id: string;
  session_id: string;
  user_id?: string;
  name: string;
  stats: Record<string, number>;
  skills: Record<string, number>;
  bars: Record<string, number>;
  image_url?: string;
  inventory?: any[];
  custom_skills?: any[];
}

export interface MapItem {
  id: string;
  name: string;
  url: string;
}

export interface ElectronAPI {
  getSessions: () => Promise<Session[]>;
  addSession: (session: Session) => Promise<void>;
  removeSession: (id: string) => Promise<void>;
  updateLastPlayed: (id: string, lastPlayed: number) => Promise<void>;
  getPlayers: (sessionId: string) => Promise<SessionPlayer[]>;
  addPlayer: (sessionId: string, peerId: string, pseudo: string, role?: number) => Promise<void>;
  removePlayer: (sessionId: string, peerId: string) => Promise<void>;
  clearPlayers: (sessionId: string) => Promise<void>;
  getCharacters: (sessionId: string) => Promise<Character[]>;
  addCharacter: (character: Character) => Promise<void>;
  removeCharacter: (id: string) => Promise<void>;
  updateCharacter: (id: string, name: string, stats: Record<string, number>, skills: Record<string, number>, bars: Record<string, number>, imageUrl?: string, inventory?: any[], custom_skills?: any[], type?: string, is_template?: boolean) => Promise<void>;
  updateCharacterBars: (id: string, bars: Record<string, number>) => Promise<void>;
  getItems: (sessionId: string) => Promise<any[]>;
  addItem: (sessionId: string, item: any) => Promise<boolean>;
  removeItem: (sessionId: string, id: string) => Promise<boolean>;
  getSkills: (sessionId: string) => Promise<any[]>;
  addSkill: (sessionId: string, skill: any) => Promise<boolean>;
  removeSkill: (sessionId: string, id: string) => Promise<boolean>;
  getTags: (sessionId: string) => Promise<any[]>;
  addTag: (sessionId: string, tag: any) => Promise<boolean>;
  removeTag: (sessionId: string, id: string) => Promise<boolean>;
  getMaps: (sessionId: string) => Promise<MapItem[]>;
  addMap: (sessionId: string, map: MapItem) => Promise<void>;
  removeMap: (sessionId: string, id: string) => Promise<void>;
  getLogs: (sessionId: string) => Promise<any[]>;
  addLog: (sessionId: string, log: any) => Promise<void>;
  getQuests: (sessionId: string) => Promise<any[]>;
  addQuest: (sessionId: string, quest: any) => Promise<boolean>;
  removeQuest: (sessionId: string, id: string) => Promise<boolean>;
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
  addPlayer: (sessionId: string, peerId: string, pseudo: string, role?: number) => ipcRenderer.invoke('players:add', sessionId, peerId, pseudo, role),
  removePlayer: (sessionId: string, peerId: string) => ipcRenderer.invoke('players:remove', sessionId, peerId),
  clearPlayers: (sessionId: string) => ipcRenderer.invoke('players:clear', sessionId),
  getCharacters: (sessionId: string) => ipcRenderer.invoke('characters:getAll', sessionId),
  addCharacter: (character: Character) => ipcRenderer.invoke('characters:add', character),
  removeCharacter: (id: string) => ipcRenderer.invoke('characters:remove', id),
  updateCharacter: (id: string, name: string, stats: Record<string, number>, skills: Record<string, number>, bars: Record<string, number>, imageUrl?: string, inventory?: any[], custom_skills?: any[], type?: string, is_template?: boolean) => ipcRenderer.invoke('characters:update', id, name, stats, skills, bars, imageUrl, inventory, custom_skills, type, is_template),
  updateCharacterBars: (id: string, bars: Record<string, number>) => ipcRenderer.invoke('characters:updateBars', id, bars),
  getItems: (sessionId: string) => ipcRenderer.invoke('items:getAll', sessionId),
  addItem: (sessionId: string, item: any) => ipcRenderer.invoke('items:add', sessionId, item),
  removeItem: (sessionId: string, id: string) => ipcRenderer.invoke('items:remove', sessionId, id),
  getSkills: (sessionId: string) => ipcRenderer.invoke('skills:getAll', sessionId),
  addSkill: (sessionId: string, skill: any) => ipcRenderer.invoke('skills:add', sessionId, skill),
  removeSkill: (sessionId: string, id: string) => ipcRenderer.invoke('skills:remove', sessionId, id),
  getTags: (sessionId: string) => ipcRenderer.invoke('tags:getAll', sessionId),
  addTag: (sessionId: string, tag: any) => ipcRenderer.invoke('tags:add', sessionId, tag),
  removeTag: (sessionId: string, id: string) => ipcRenderer.invoke('tags:remove', sessionId, id),
  getMaps: (sessionId: string) => ipcRenderer.invoke('maps:getAll', sessionId),
  addMap: (sessionId: string, map: MapItem) => ipcRenderer.invoke('maps:add', sessionId, map),
  removeMap: (sessionId: string, id: string) => ipcRenderer.invoke('maps:remove', sessionId, id),
  getLogs: (sessionId: string) => ipcRenderer.invoke('logs:getAll', sessionId),
  addLog: (sessionId: string, log: any) => ipcRenderer.invoke('logs:add', sessionId, log),
  getQuests: (sessionId: string) => ipcRenderer.invoke('quests:getAll', sessionId),
  addQuest: (sessionId: string, quest: any) => ipcRenderer.invoke('quests:add', sessionId, quest),
  removeQuest: (sessionId: string, id: string) => ipcRenderer.invoke('quests:remove', sessionId, id),
  getMapTokens: (sessionId: string, mapId: string) => ipcRenderer.invoke('map_tokens:getAll', sessionId, mapId),
  updateMapToken: (sessionId: string, mapId: string, characterId: string, x: number, y: number) => ipcRenderer.invoke('map_tokens:update', sessionId, mapId, characterId, x, y),
  removeMapToken: (sessionId: string, mapId: string, characterId: string) => ipcRenderer.invoke('map_tokens:remove', sessionId, mapId, characterId),
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