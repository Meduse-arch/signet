/// <reference types="vite/client" />

declare global {
  interface Window {
    electronAPI: {
      getSessions: () => Promise<any[]>;
      addSession: (session: any) => Promise<void>;
      removeSession: (id: string) => Promise<void>;
      updateLastPlayed: (id: string, lastPlayed: number) => Promise<void>;
      getPlayers: (sessionId: string) => Promise<any[]>;
      addPlayer: (sessionId: string, peerId: string, pseudo: string, role?: number) => Promise<void>;
      removePlayer: (sessionId: string, peerId: string) => Promise<void>;
      clearPlayers: (sessionId: string) => Promise<void>;
      getCharacters: (sessionId: string) => Promise<any[]>;
      addCharacter: (character: any) => Promise<void>;
      removeCharacter: (id: string) => Promise<void>;
      updateCharacter: (id: string, name: string, stats: Record<string, number>, skills: Record<string, number>, bars: Record<string, number>, imageUrl?: string, inventory?: any[], custom_skills?: any[], type?: string, is_template?: boolean) => Promise<void>;

      updateCharacterBars: (id: string, bars: Record<string, number>) => Promise<void>;
      getMaps: (sessionId: string) => Promise<any[]>;
      addMap: (sessionId: string, map: any) => Promise<void>;
      removeMap: (sessionId: string, id: string) => Promise<void>;
      getLogs: (sessionId: string) => Promise<any[]>;
      addLog: (sessionId: string, log: any) => Promise<void>;
      getMapTokens: (sessionId: string, mapId: string) => Promise<any[]>;
      updateMapToken: (sessionId: string, mapId: string, characterId: string, x: number, y: number) => Promise<void>;
      removeMapToken: (sessionId: string, mapId: string, characterId: string) => Promise<void>;
      openExternalWindow: (type: string, sessionId: string) => Promise<void>;
      reDock: (type: string, sessionId: string) => Promise<void>;
      onReDock: (callback: (type: string) => void) => (() => void);
      minimizeWindow: () => void;
      maximizeWindow: () => void;
      toggleFullscreen: () => void;
      closeWindow: () => void;
      onFullscreen: (callback: (isFS: boolean) => void) => (() => void);
    };
  }
}

export {};
