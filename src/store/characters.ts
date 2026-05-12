import { create } from 'zustand';
import { Character } from '../services/characters.service';

interface CharactersState {
  characters: Character[];
  setCharacters: (characters: Character[]) => void;
  addOrUpdateCharacter: (character: Character, skipSync?: boolean) => void;
  removeCharacter: (id: string) => void;
  initialize: (sessionId: string) => void;
}

export const useCharactersStore = create<CharactersState>((set, get) => ({
  characters: [],
  setCharacters: (characters) => set((state) => {
    if (characters.length > 0) {
      localStorage.setItem(`sigil_chars_${characters[0].session_id}`, JSON.stringify(characters));
    }
    return { characters };
  }),
  
  initialize: (sessionId: string) => {
    console.log(`[CharactersStore] Initializing for session: ${sessionId}`);
    const saved = localStorage.getItem(`sigil_chars_${sessionId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        console.log(`[CharactersStore] Loaded ${parsed.length} characters from localStorage:`, parsed.map((p: any) => p.name));
        set({ characters: parsed });
      } catch (e) {
        console.error('[CharactersStore] Failed to parse localStorage', e);
      }
    }

    // Listen for updates from other windows/stores
    const syncChannel = new BroadcastChannel(`sigil_char_store_sync_${sessionId}`);
    syncChannel.onmessage = (event) => {
      const { type, payload } = event.data;
      if (type === 'CHAR_UPDATE_INTERNAL') {
        console.log(`[CharactersStore] Internal sync received for ${payload.name}`);
        const state = get();
        const existing = state.characters.find(c => c.id === payload.id);
        let newChars;
        if (existing) {
          // Si les données sont identiques, on évite l'update pour stopper les loops
          if (JSON.stringify(existing) === JSON.stringify(payload)) return;
          newChars = state.characters.map(c => c.id === payload.id ? payload : c);
        } else {
          newChars = [...state.characters, payload];
        }
        set({ characters: newChars });
      }
    };
  },

  addOrUpdateCharacter: (character, skipSync = false) => set((state) => {
    console.log(`[CharactersStore] Add/Update character: ${character.name}`, { id: character.id, user_id: character.user_id });
    const existing = state.characters.find(c => c.id === character.id);
    let newChars;
    if (existing) {
      newChars = state.characters.map(c => c.id === character.id ? character : c);
    } else {
      newChars = [...state.characters, character];
    }
    
    // Auto save
    localStorage.setItem(`sigil_chars_${character.session_id}`, JSON.stringify(newChars));

    // Sync with other local windows
    if (!skipSync) {
      console.log(`[CharactersStore] Broadcasting internal update for ${character.name}`);
      const syncChannel = new BroadcastChannel(`sigil_char_store_sync_${character.session_id}`);
      syncChannel.postMessage({ type: 'CHAR_UPDATE_INTERNAL', payload: character });
    }

    return { characters: newChars };
  }),

  removeCharacter: (id) => set((state) => {
    const newChars = state.characters.filter(c => c.id !== id);
    const char = state.characters.find(c => c.id === id);
    if (char) {
      localStorage.setItem(`sigil_chars_${char.session_id}`, JSON.stringify(newChars));
    }
    return { characters: newChars };
  }),
}));
