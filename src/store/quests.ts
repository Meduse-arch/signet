import { create } from 'zustand';
import { Quest, questsService } from '../services/quests.service';

interface QuestsState {
  quests: Quest[];
  selectedQuest: Quest | null;
  initialize: (sessionId: string) => Promise<void>;
  addQuest: (sessionId: string, quest: Quest, skipSync?: boolean) => Promise<void>;
  removeQuest: (sessionId: string, id: string, skipSync?: boolean) => Promise<void>;
  updateQuestStatus: (sessionId: string, id: string, status: Quest['status']) => Promise<void>;
  setSelectedQuest: (quest: Quest | null, openCodex?: boolean) => void;
}

export const useQuestsStore = create<QuestsState>((set, get) => ({
  quests: [],
  selectedQuest: null,

  initialize: async (sessionId: string) => {
    set({ quests: [] });
    const quests = await questsService.getQuests(sessionId);
    set({ quests });

    const syncChannel = new BroadcastChannel(`signet_quests_store_sync_${sessionId}`);

    syncChannel.onmessage = async (event) => {
      const { type } = event.data;
      if (type === 'QUESTS_UPDATE_INTERNAL') {
        const freshQuests = await questsService.getQuests(sessionId);
        set({ quests: freshQuests });
      }
    };
  },

  addQuest: async (sessionId, quest, skipSync = false) => {
    const success = await questsService.addQuest(sessionId, quest);
    if (success) {
      const state = get();
      const existing = state.quests.find(q => q.id === quest.id);
      let newQuests;
      if (existing) {
        newQuests = state.quests.map(q => q.id === quest.id ? quest : q);
        
        // --- MISE À JOUR SYNCHRONE DES PERSONNAGES ---
        const { useCharactersStore } = await import('./characters');
        const charStore = useCharactersStore.getState();
        const affectedChars = charStore.characters.filter(c => 
          c.quests?.some((q: any) => q.id === quest.id)
        );

        if (affectedChars.length > 0) {
          affectedChars.forEach(char => {
            const updatedQuests = char.quests?.map((q: any) => 
              q.id === quest.id ? { ...quest, customId: q.customId, status: q.status } : q
            );
            const updatedChar = { ...char, quests: updatedQuests };
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
        newQuests = [...state.quests, quest];
      }
      set({ quests: newQuests });

      if (!skipSync) {
        const syncChannel = new BroadcastChannel(`signet_quests_store_sync_${sessionId}`);

        syncChannel.postMessage({ type: 'QUESTS_UPDATE_INTERNAL', payload: quest });
      }
    }
  },

  removeQuest: async (sessionId, id, skipSync = false) => {
    const success = await questsService.removeQuest(sessionId, id);
    if (success) {
      const state = get();
      set({ quests: state.quests.filter(q => q.id !== id) });

      if (!skipSync) {
        const syncChannel = new BroadcastChannel(`signet_quests_store_sync_${sessionId}`);

        syncChannel.postMessage({ type: 'QUESTS_UPDATE_INTERNAL', payload: { id, deleted: true } });
      }
    }
  }
,

  updateQuestStatus: async (sessionId, id, status) => {
    const state = get();
    const quest = state.quests.find(q => q.id === id);
    if (quest) {
      const updatedQuest = { ...quest, status };
      await get().addQuest(sessionId, updatedQuest);
    }
  },

  setSelectedQuest: (quest, openCodex = false) => {
    set({ selectedQuest: quest });
  }
}));
