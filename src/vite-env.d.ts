/// <reference types="vite/client" />

declare global {
  interface Window {
    electronAPI?: {
      getSessions: () => Promise<any[]>;
      addSession: (session: any) => Promise<void>;
      removeSession: (id: string) => Promise<void>;
      updateLastPlayed: (id: string, lastPlayed: number) => Promise<void>;
      getPlayers: (sessionId: string) => Promise<any[]>;
      addPlayer: (sessionId: string, peerId: string, pseudo: string) => Promise<void>;
      removePlayer: (sessionId: string, peerId: string) => Promise<void>;
      clearPlayers: (sessionId: string) => Promise<void>;
      getCharacters: (sessionId: string) => Promise<any[]>;
      addCharacter: (character: any) => Promise<void>;
      removeCharacter: (id: string) => Promise<void>;
      updateCharacter: (id: string, name: string, stats: Record<string, number>, bars: Record<string, number>) => Promise<void>;
      openExternalWindow: (type: string, sessionId: string) => void;
      reDock: (type: string, sessionId: string) => void;
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
