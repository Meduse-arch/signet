import { create } from 'zustand';
import { DiceResult } from '../services/des.service';

interface DiceState {
  diceResult: DiceResult[] | null;
  diceSharingEnabled: boolean;
  nbDice: number;
  modifier: number;
  setDiceResult: (result: DiceResult[] | null) => void;
  setDiceSharingEnabled: (enabled: boolean) => void;
  setNbDice: (nb: number) => void;
  setModifier: (mod: number) => void;
}

export const useDiceStore = create<DiceState>((set) => ({
  diceResult: null,
  diceSharingEnabled: false,
  nbDice: 1,
  modifier: 0,
  setDiceResult: (result) => set({ diceResult: result }),
  setDiceSharingEnabled: (enabled) => set({ diceSharingEnabled: enabled }),
  setNbDice: (nb) => set({ nbDice: nb }),
  setModifier: (mod) => set({ modifier: mod }),
}));
