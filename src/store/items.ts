import { create } from 'zustand';
import { Item, itemsService } from '../services/items.service';
import { setupStoreSync, emitStoreSync } from './utils/storeSync';

interface ItemsState {
  items: Item[];
  setItems: (items: Item[]) => void;
  initialize: (sessionId: string) => Promise<void>;
  addItem: (sessionId: string, item: Item, skipSync?: boolean) => Promise<void>;
  removeItem: (sessionId: string, id: string, skipSync?: boolean) => Promise<void>;
}

export const useItemsStore = create<ItemsState>((set, get) => ({
  items: [],
  setItems: (items) => set({ items }),
  
  initialize: async (sessionId: string) => {
    set({ items: [] });
    const items = await itemsService.getItems(sessionId);
    set({ items });

    setupStoreSync('items', sessionId, async (type, payload) => {
      if (type === 'ITEMS_UPDATE_INTERNAL') {
        const freshItems = await itemsService.getItems(sessionId);
        set({ items: freshItems });
      }
    });
  },

  addItem: async (sessionId, item, skipSync = false) => {
    const success = await itemsService.addItem(sessionId, item);
    if (success) {
      const state = get();
      const existing = state.items.find(i => i.id === item.id);
      let newItems;
      if (existing) {
        newItems = state.items.map(i => i.id === item.id ? item : i);

        // --- MISE À JOUR SYNCHRONE DES PERSONNAGES ---
        const { useCharactersStore } = await import('./characters');
        const charStore = useCharactersStore.getState();
        const affectedChars = charStore.characters.filter(c => 
          c.inventory?.some((inv: any) => inv.id === item.id)
        );

        if (affectedChars.length > 0) {
          affectedChars.forEach(char => {
            const updatedInventory = char.inventory?.map((inv: any) => 
              inv.id === item.id ? { ...item, instanceId: inv.instanceId, equipped: inv.equipped, quantity: inv.quantity } : inv
            );
            const updatedChar = { ...char, inventory: updatedInventory };
            charStore.addOrUpdateCharacter(updatedChar);
            
            if ((window as any).electronAPI) {
              (window as any).electronAPI.updateCharacter(
                sessionId, updatedChar.id, updatedChar.name, updatedChar.stats, 
                updatedChar.skills, updatedChar.bars, updatedChar.image_url, 
                updatedChar.inventory, updatedChar.custom_skills, updatedChar.type, 
                updatedChar.is_template, updatedChar.quests
              ).catch(console.error);
            }
          });
        }
      } else {
        newItems = [...state.items, item];
      }
      set({ items: newItems });

      if (!skipSync) {
        emitStoreSync('items', sessionId, 'ITEMS_UPDATE_INTERNAL', item);
      }
    }
  },

  removeItem: async (sessionId, id, skipSync = false) => {
    const success = await itemsService.removeItem(sessionId, id);
    if (success) {
      const state = get();
      set({ items: state.items.filter(i => i.id !== id) });

      if (!skipSync) {
        emitStoreSync('items', sessionId, 'ITEMS_UPDATE_INTERNAL', { id, deleted: true });
      }
    }
  }
}));
