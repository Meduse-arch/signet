import { create } from 'zustand';
import { Tag, tagsService } from '../services/tags.service';

interface TagsState {
  tags: Tag[];
  setTags: (tags: Tag[]) => void;
  initialize: (sessionId: string) => Promise<void>;
  addTag: (sessionId: string, tag: Tag, skipSync?: boolean) => Promise<void>;
  removeTag: (sessionId: string, id: string, skipSync?: boolean) => Promise<void>;
}

export const useTagsStore = create<TagsState>((set, get) => ({
  tags: [],
  setTags: (tags) => set({ tags }),
  
  initialize: async (sessionId: string) => {
    const tags = await tagsService.getTags(sessionId);
    set({ tags });

    const syncChannel = new BroadcastChannel(`sigil_tags_store_sync_${sessionId}`);
    syncChannel.onmessage = async (event) => {
      const { type } = event.data;
      if (type === 'TAGS_UPDATE_INTERNAL') {
        const freshTags = await tagsService.getTags(sessionId);
        set({ tags: freshTags });
      }
    };
  },

  addTag: async (sessionId, tag, skipSync = false) => {
    const success = await tagsService.addTag(sessionId, tag);
    if (success) {
      const state = get();
      const existing = state.tags.find(t => t.id === tag.id);
      let newTags;
      if (existing) {
        newTags = state.tags.map(t => t.id === tag.id ? tag : t);
      } else {
        newTags = [...state.tags, tag];
      }
      set({ tags: newTags });

      if (!skipSync) {
        const syncChannel = new BroadcastChannel(`sigil_tags_store_sync_${sessionId}`);
        syncChannel.postMessage({ type: 'TAGS_UPDATE_INTERNAL', payload: tag });
      }
    }
  },

  removeTag: async (sessionId, id, skipSync = false) => {
    const success = await tagsService.removeTag(sessionId, id);
    if (success) {
      const state = get();
      set({ tags: state.tags.filter(t => t.id !== id) });

      if (!skipSync) {
        const syncChannel = new BroadcastChannel(`sigil_tags_store_sync_${sessionId}`);
        syncChannel.postMessage({ type: 'TAGS_UPDATE_INTERNAL', payload: { id, deleted: true } });
      }
    }
  }
}));
