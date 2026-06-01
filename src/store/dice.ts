import { create } from 'zustand';
import { DiceResult } from '../services/des.service';
import { setupStoreSync, emitStoreSync } from './utils/storeSync';

interface DiceState {
  diceResult: DiceResult[] | null;
  diceSharingEnabled: boolean;
  nbDice: number;
  modifier: number;
  setDiceResult: (result: DiceResult[] | null, skipSync?: boolean) => void;
  setDiceSharingEnabled: (enabled: boolean, skipSync?: boolean) => void;
  setNbDice: (nb: number, skipSync?: boolean) => void;
  setModifier: (mod: number, skipSync?: boolean) => void;
  initialize: (sessionId: string) => void;
}

export const useDiceStore = create<DiceState>((set, get) => ({
  diceResult: null,
  diceSharingEnabled: false,
  nbDice: 1,
  modifier: 0,
  setDiceResult: (result, skipSync = false) => {
    set({ diceResult: result });
    if (!skipSync) {
      const sessionId = localStorage.getItem('last_active_session') || 'default';
      emitStoreSync('dice', sessionId, 'DICE_RESULT', result);
    }
  },
  setDiceSharingEnabled: (enabled, skipSync = false) => {
    set({ diceSharingEnabled: enabled });
    if (!skipSync) {
      const sessionId = localStorage.getItem('last_active_session') || 'default';
      emitStoreSync('dice', sessionId, 'DICE_SHARING', enabled);
    }
  },
  setNbDice: (nb, skipSync = false) => {
    set({ nbDice: nb });
    if (!skipSync) {
      const sessionId = localStorage.getItem('last_active_session') || 'default';
      emitStoreSync('dice', sessionId, 'DICE_NB', nb);
    }
  },
  setModifier: (mod, skipSync = false) => {
    set({ modifier: mod });
    if (!skipSync) {
      const sessionId = localStorage.getItem('last_active_session') || 'default';
      emitStoreSync('dice', sessionId, 'DICE_MOD', mod);
    }
  },
  initialize: (sessionId: string) => {
    setupStoreSync('dice', sessionId, (type, payload) => {
      if (type === 'DICE_RESULT') {
        get().setDiceResult(payload, true);
      } else if (type === 'DICE_SHARING') {
        get().setDiceSharingEnabled(payload, true);
      } else if (type === 'DICE_NB') {
        get().setNbDice(payload, true);
      } else if (type === 'DICE_MOD') {
        get().setModifier(payload, true);
      }
    });
  }
}));
