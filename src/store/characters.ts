import { create } from 'zustand';
import { Character, getSessionCharacters } from '../services/characters.service';

interface CharactersState {
  characters: Character[];
  controlledCharacterId: string | null;
  setCharacters: (characters: Character[]) => void;
  addOrUpdateCharacter: (character: Character, skipSync?: boolean) => void;
  removeCharacter: (sessionId: string, id: string) => void;
  setPnjControle: (sessionId: string, id: string | null) => void;
  initialize: (sessionId: string) => Promise<void>;
}

export const useCharactersStore = create<CharactersState>((set, get) => ({
  characters: [],
  controlledCharacterId: null,
  
  setCharacters: (characters) => {
    set({ characters });
  },
  
  initialize: async (sessionId: string) => {
    console.log(`[CharactersStore] Initializing for session: ${sessionId}`);
    // Toujours reset pour éviter les fuites de données entre sessions
    set({ characters: [], controlledCharacterId: null });
    
    // 1. Charger depuis la base de données (Source de vérité)
    const dbChars = await getSessionCharacters(sessionId);
    if (dbChars && dbChars.length > 0) {
      console.log(`[CharactersStore] Loaded ${dbChars.length} characters from DB`);
      set({ characters: dbChars });
    } else {
      // 2. Fallback localStorage (Compatibilité ou offline)
      const saved = localStorage.getItem(`signet_chars_${sessionId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          console.log(`[CharactersStore] Fallback: Loaded ${parsed.length} characters from localStorage`);
          set({ characters: parsed });
        } catch (e) {
          console.error('[CharactersStore] Failed to parse localStorage', e);
        }
      }
    }

    const savedPnj = localStorage.getItem(`signet_pnj_control_${sessionId}`);
    if (savedPnj) set({ controlledCharacterId: savedPnj });

    // Listen for updates from other windows/stores
    const syncChannel = new BroadcastChannel(`signet_char_store_sync_${sessionId}`);
    syncChannel.onmessage = (event) => {
      const { type, payload } = event.data;
      if (type === 'CHAR_UPDATE_INTERNAL') {
        const state = get();
        const existing = state.characters.find(c => c.id === payload.id);
        if (existing && JSON.stringify(existing) === JSON.stringify(payload)) return;
        
        let newChars;
        if (existing) {
          newChars = state.characters.map(c => c.id === payload.id ? payload : c);
        } else {
          newChars = [...state.characters, payload];
        }
        set({ characters: newChars });
      } else if (type === 'PNJ_CONTROL_INTERNAL') {
        set({ controlledCharacterId: payload });
      }
    };
  },

  setPnjControle: (sessionId, id) => {
    if (id) localStorage.setItem(`signet_pnj_control_${sessionId}`, id);
    else localStorage.removeItem(`signet_pnj_control_${sessionId}`);

    const syncChannel = new BroadcastChannel(`signet_char_store_sync_${sessionId}`);
    syncChannel.postMessage({ type: 'PNJ_CONTROL_INTERNAL', payload: id });
    
    set({ controlledCharacterId: id });
  },

  addOrUpdateCharacter: (character, skipSync = false) => {
    const sessionId = character.session_id;
    if (!sessionId) {
        console.error('[CharactersStore] character.session_id is missing!');
        return;
    }

    const state = get();
    const existing = state.characters.find(c => c.id === character.id);
    let newChars;
    if (existing) {
      newChars = state.characters.map(c => c.id === character.id ? character : c);
    } else {
      newChars = [...state.characters, character];
    }
    
    // Save to State and LocalStorage (namespaced by session)
    set({ characters: newChars });
    localStorage.setItem(`signet_chars_${sessionId}`, JSON.stringify(newChars));

    // Sync with other local windows
    if (!skipSync) {
      const syncChannel = new BroadcastChannel(`signet_char_store_sync_${sessionId}`);
      syncChannel.postMessage({ type: 'CHAR_UPDATE_INTERNAL', payload: character });
    }
  },

  removeCharacter: (sessionId, id) => {
    const state = get();
    const newChars = state.characters.filter(c => c.id !== id);
    
    set({ characters: newChars });
    localStorage.setItem(`signet_chars_${sessionId}`, JSON.stringify(newChars));

    const syncChannel = new BroadcastChannel(`signet_char_store_sync_${sessionId}`);
    syncChannel.postMessage({ type: 'CHAR_DELETE_INTERNAL', payload: { id } });
  },
}));
