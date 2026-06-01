import { create } from 'zustand';
import { DiceResult } from '../services/des.service';

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
      const channel = new BroadcastChannel(`signet_dice_store_sync_${sessionId}`);
      channel.postMessage({ type: 'DICE_RESULT', payload: result });
      channel.close();
    }
  },
  setDiceSharingEnabled: (enabled, skipSync = false) => {
    set({ diceSharingEnabled: enabled });
    if (!skipSync) {
      const sessionId = localStorage.getItem('last_active_session') || 'default';
      const channel = new BroadcastChannel(`signet_dice_store_sync_${sessionId}`);
      channel.postMessage({ type: 'DICE_SHARING', payload: enabled });
      channel.close();
    }
  },
  setNbDice: (nb, skipSync = false) => {
    set({ nbDice: nb });
    if (!skipSync) {
      const sessionId = localStorage.getItem('last_active_session') || 'default';
      const channel = new BroadcastChannel(`signet_dice_store_sync_${sessionId}`);
      channel.postMessage({ type: 'DICE_NB', payload: nb });
      channel.close();
    }
  },
  setModifier: (mod, skipSync = false) => {
    set({ modifier: mod });
    if (!skipSync) {
      const sessionId = localStorage.getItem('last_active_session') || 'default';
      const channel = new BroadcastChannel(`signet_dice_store_sync_${sessionId}`);
      channel.postMessage({ type: 'DICE_MOD', payload: mod });
      channel.close();
    }
  },
  initialize: (sessionId: string) => {
    const syncChannel = new BroadcastChannel(`signet_dice_store_sync_${sessionId}`);
    syncChannel.onmessage = (event) => {
      const { type, payload } = event.data;
      if (type === 'DICE_RESULT') {
        get().setDiceResult(payload, true);
      } else if (type === 'DICE_SHARING') {
        get().setDiceSharingEnabled(payload, true);
      } else if (type === 'DICE_NB') {
        get().setNbDice(payload, true);
      } else if (type === 'DICE_MOD') {
        get().setModifier(payload, true);
      }
    };
  }
}));
