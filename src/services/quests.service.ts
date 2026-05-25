export interface QuestReward {
  id: string;
  type: 'Item' | 'Experience' | 'Autre';
  itemId?: string;
  value?: number;
  description?: string;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  status: 'En cours' | 'Terminée' | 'Échouée';
  image_url?: string;
  rewards: QuestReward[];
  participantIds: string[]; // Character IDs
  isFollowed?: boolean; // For local player tracking
  created_at?: string;
}

export const questsService = {
  getQuests: async (sessionId: string): Promise<Quest[]> => {
    if (!window.electronAPI) return [];
    return window.electronAPI.getQuests(sessionId);
  },

  addQuest: async (sessionId: string, quest: Quest): Promise<boolean> => {
    if (!window.electronAPI) return false;
    return window.electronAPI.addQuest(sessionId, quest);
  },

  removeQuest: async (sessionId: string, id: string): Promise<boolean> => {
    if (!window.electronAPI) return false;
    return window.electronAPI.removeQuest(sessionId, id);
  }
};
