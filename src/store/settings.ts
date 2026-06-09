import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type VisualQuality = 'low' | 'medium' | 'high';
export type ShadersIntensity = 'off' | 'soft' | 'normal';

export interface Keybindings {
  moveUp: string[];
  moveDown: string[];
  moveLeft: string[];
  moveRight: string[];
}

interface SettingsState {
  visualQuality: VisualQuality;
  shadersIntensity: ShadersIntensity;
  runeTrailEnabled: boolean;
  keybindings: Keybindings;
  keyboardInitialized: boolean;
  setVisualQuality: (quality: VisualQuality) => void;
  setShadersIntensity: (intensity: ShadersIntensity) => void;
  setRuneTrailEnabled: (enabled: boolean) => void;
  setKeybinding: (action: keyof Keybindings, slotIndex: 0 | 1, key: string | null) => void;
  detectKeyboardLayout: () => Promise<void>;
}

const defaultKeybindings: Keybindings = {
  moveUp: ['z', 'arrowup'],
  moveDown: ['s', 'arrowdown'],
  moveLeft: ['q', 'arrowleft'],
  moveRight: ['d', 'arrowright'],
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      visualQuality: 'medium', // Default to medium (Moyen preset)
      shadersIntensity: 'off',
      runeTrailEnabled: true,
      keybindings: defaultKeybindings,
      keyboardInitialized: false,
      setVisualQuality: (quality) => set({ visualQuality: quality }),
      setShadersIntensity: (intensity) => set({ shadersIntensity: intensity }),
      setRuneTrailEnabled: (enabled) => set({ runeTrailEnabled: enabled }),
      detectKeyboardLayout: async () => {
        const state = get();
        if (state.keyboardInitialized) return; // Only do this once

        try {
          const keyboard = (navigator as any).keyboard;
          if (keyboard && keyboard.getLayoutMap) {
            const layoutMap = await keyboard.getLayoutMap();
            const keyW = layoutMap.get('KeyW') || 'w';
            const keyA = layoutMap.get('KeyA') || 'a';
            const keyS = layoutMap.get('KeyS') || 's';
            const keyD = layoutMap.get('KeyD') || 'd';
            
            set({
              keybindings: {
                ...state.keybindings,
                moveUp: [keyW, 'arrowup'],
                moveLeft: [keyA, 'arrowleft'],
                moveDown: [keyS, 'arrowdown'],
                moveRight: [keyD, 'arrowright']
              },
              keyboardInitialized: true
            });
            return;
          }
        } catch (e) {
          console.warn('Keyboard layout detection failed or not supported', e);
        }
        
        // Fallback: Just mark as initialized so we don't try again
        set({ keyboardInitialized: true });
      },
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
