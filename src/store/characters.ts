import { create } from 'zustand';
import { Character } from '../services/characters.service';

interface CharactersState {
  characters: Character[];
  setCharacters: (characters: Character[]) => void;
  addOrUpdateCharacter: (character: Character) => void;
  removeCharacter: (id: string) => void;
}

export const useCharactersStore = create<CharactersState>((set) => ({
  characters: [],
  setCharacters: (characters) => set({ characters }),
  addOrUpdateCharacter: (character) => set((state) => {
    const existing = state.characters.find(c => c.id === character.id);
    if (existing) {
      return { characters: state.characters.map(c => c.id === character.id ? character : c) };
    }
    return { characters: [...state.characters, character] };
  }),
  removeCharacter: (id) => set((state) => ({
    characters: state.characters.filter(c => c.id !== id)
  })),
}));
