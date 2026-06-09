import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Keybindings {
  moveUp: string[];
  moveDown: string[];
  moveLeft: string[];
  moveRight: string[];
}

interface SettingsState {
  keybindings: Keybindings;
  setKeybinding: (action: keyof Keybindings, slotIndex: 0 | 1, key: string | null) => void;
}

const defaultKeybindings: Keybindings = {
  moveUp: ['z', 'arrowup'],
  moveDown: ['s', 'arrowdown'],
  moveLeft: ['q', 'arrowleft'],
  moveRight: ['d', 'arrowright'],
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      keybindings: defaultKeybindings,
      setKeybinding: (action, slotIndex, key) => set((state) => {
        const newKeys = [...state.keybindings[action]];
        
        // If we assign a valid key
        if (key !== null) {
          // Prevent duplicates in the same action
          const existingIndex = newKeys.indexOf(key);
          if (existingIndex !== -1 && existingIndex !== slotIndex) {
            newKeys[existingIndex] = ''; // remove the duplicate
          }
          newKeys[slotIndex] = key;
        } else {
          // Clear the slot
          newKeys[slotIndex] = '';
        }

        // Fill empty array elements to ensure length is at least 2 for UI logic
        while (newKeys.length < 2) {
          newKeys.push('');
        }
        
        return {
          keybindings: {
            ...state.keybindings,
            [action]: newKeys.slice(0, 2), // Keep exactly 2 slots
          }
        };
      }),
    }),
    {
      name: 'sigil-settings-storage', // name of item in localStorage
    }
  )
);
