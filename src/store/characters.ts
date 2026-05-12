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
  setCharacters: (characters) => set({ characters }),
  
  initialize: (sessionId: string) => {
    console.log(`[CharactersStore] Initialisation pour la session: ${sessionId}`);
    const saved = localStorage.getItem(`sigil_chars_${sessionId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        console.log(`[CharactersStore] ${parsed.length} personnages chargés depuis le localStorage`);
        set({ characters: parsed });
      } catch (e) {
        console.error('[CharactersStore] Échec du parsing du localStorage', e);
      }
    }

    // Écouter les mises à jour venant d'autres fenêtres (Pop-outs <-> Main)
    const syncChannel = new BroadcastChannel(`sigil_char_store_sync_${sessionId}`);
    syncChannel.onmessage = (event) => {
      const { type, payload } = event.data;
      console.log(`[CharactersStore] Message de sync interne reçu: ${type}`, payload.name);
      if (type === 'CHAR_UPDATE_INTERNAL') {
        const state = get();
        const existing = state.characters.find(c => c.id === payload.id);
        let newChars;
        if (existing) {
          newChars = state.characters.map(c => c.id === payload.id ? payload : c);
        } else {
          newChars = [...state.characters, payload];
        }
        set({ characters: newChars });
      }
    };
  },

  addOrUpdateCharacter: (character, skipSync = false) => set((state) => {
    console.log(`[CharactersStore] Ajout/Update personnage: ${character.name}`, { skipSync });
    const existing = state.characters.find(c => c.id === character.id);
    let newChars;
    if (existing) {
      newChars = state.characters.map(c => c.id === character.id ? character : c);
    } else {
      newChars = [...state.characters, character];
    }
    
    // Sauvegarde auto
    localStorage.setItem(`sigil_chars_${character.session_id}`, JSON.stringify(newChars));

    // Sync avec les autres fenêtres locales
    if (!skipSync) {
      console.log(`[CharactersStore] Diffusion de la mise à jour interne pour ${character.name}`);
      const syncChannel = new BroadcastChannel(`sigil_char_store_sync_${character.session_id}`);
      syncChannel.postMessage({ type: 'CHAR_UPDATE_INTERNAL', payload: character });
      // On ne ferme pas le canal pour pouvoir continuer à écouter si besoin, 
      // mais ici c'est un envoi ponctuel.
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
