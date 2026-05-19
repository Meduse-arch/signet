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
    const items = await itemsService.getItems(sessionId);
    set({ items });

    const syncChannel = new BroadcastChannel(`sigil_items_store_sync_${sessionId}`);
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
      } else {
        newItems = [...state.items, item];
      }
      set({ items: newItems });

      if (!skipSync) {
        const syncChannel = new BroadcastChannel(`sigil_items_store_sync_${sessionId}`);
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
        const syncChannel = new BroadcastChannel(`sigil_items_store_sync_${sessionId}`);
        syncChannel.postMessage({ type: 'ITEMS_UPDATE_INTERNAL', payload: { id, deleted: true } });
      }
    }
  }
}));
