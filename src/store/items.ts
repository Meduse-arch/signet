import { create } from 'zustand';
import { Item, itemsService } from '../services/items.service';

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

    const syncChannel = new BroadcastChannel(`signet_items_store_sync_${sessionId}`);

    syncChannel.onmessage = async (event) => {
      const { type, payload } = event.data;
      if (type === 'ITEMS_UPDATE_INTERNAL') {
        const freshItems = await itemsService.getItems(sessionId);
        set({ items: freshItems });
      }
    };
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
            
            // Notification pour les autres composants
            const channel = new BroadcastChannel(`signet_char_sync_${sessionId}`);
            channel.postMessage({ type: 'CHAR_UPDATE', payload: updatedChar });
            channel.close();
          });
        }
      } else {
        newItems = [...state.items, item];
      }
      set({ items: newItems });

      if (!skipSync) {
        const syncChannel = new BroadcastChannel(`signet_items_store_sync_${sessionId}`);

        syncChannel.postMessage({ type: 'ITEMS_UPDATE_INTERNAL', payload: item });
      }
    }
  },

  removeItem: async (sessionId, id, skipSync = false) => {
    const success = await itemsService.removeItem(sessionId, id);
    if (success) {
      const state = get();
      set({ items: state.items.filter(i => i.id !== id) });

      if (!skipSync) {
        const syncChannel = new BroadcastChannel(`signet_items_store_sync_${sessionId}`);

        syncChannel.postMessage({ type: 'ITEMS_UPDATE_INTERNAL', payload: { id, deleted: true } });
      }
    }
  }
}));
