import React from 'react';

/**
 * Standard interface that every game system must implement.
 * Each system in src/systems/ exports a default object satisfying this interface.
 */
export interface GameSystemSettings {
  sheetMode?: 'manual' | 'roll';
  manualPoints?: number;
  rollFormula?: { diceCount: number; diceSides: number; rerolls: number };
  stats?: { id: string; name: string }[];
  bars?: { id: string; name: string; color: string; formula: string }[];
  rerollAllAllowed?: boolean;
  [key: string]: any;
}

export interface GameSystem {
  /** Unique identifier for this system, e.g. 'seal', 'srd5' */
  id: string;
  /** Display name, e.g. 'Seal Engine', 'Système 5e' */
  name: string;
  /** Default configuration when a new session is created with this system */
  defaultSettings: GameSystemSettings;
  /** System-specific React components */
  components: {
    /** Settings modal shown when configuring the system at session creation */
    SettingsModal: React.ComponentType<{
      isOpen: boolean;
      onClose: () => void;
      settings: GameSystemSettings;
      onSave: (settings: GameSystemSettings) => void;
    }>;
    /** Character sheet used inside the VTT for this system */
    CharacterSheet: React.ComponentType<{
      sessionId: string;
      variant?: 'popup' | 'window';
      forceCharacterId?: string;
    }>;
  };
}
