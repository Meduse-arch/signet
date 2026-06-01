import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  activeTab: 'library' | 'search' | 'key' | 'forge';
  showModal: boolean;
  showCreateModal: boolean;
  itemCreationType: 'forge' | 'inventory' | null;
  itemToEdit: any | null;
  selectedItem: any | null;
  itemDetailOpen: boolean;
  itemCreationCharacterId: string | null;
  
  // Characters
  characterManagementId: string | null;
  
  // Skills
  showSkillCreateModal: boolean;
  skillCreationType: 'forge' | 'inventory' | null;
  skillToEdit: any | null;
  selectedSkill: any | null;
  skillDetailOpen: boolean;

  // Quests
  showQuestCreateModal: boolean;
  questToEdit: any | null;
  selectedQuest: any | null;
  questDetailOpen: boolean;

  // Projection / Sync
  autoSync: boolean;
  setAutoSync: (sync: boolean) => void;

  setSidebarOpen: (open: boolean) => void;
  setActiveTab: (tab: 'library' | 'search' | 'key' | 'forge') => void;
  setShowModal: (show: boolean) => void;
  setShowCreateModal: (show: boolean, type?: 'forge' | 'inventory' | null, category?: string, item?: any) => void;
  setSelectedItem: (item: any | null, openModal?: boolean) => void;
  setItemDetailOpen: (open: boolean) => void;
  
  // Characters
  setCharacterManagement: (id: string | null) => void;
  
  // Skills
  setShowSkillCreateModal: (show: boolean, skill?: any, type?: 'forge' | 'inventory' | null) => void;
  setSelectedSkill: (skill: any | null, openModal?: boolean) => void;
  setSkillDetailOpen: (open: boolean) => void;

  // Quests
  setShowQuestCreateModal: (show: boolean, questToEdit?: any) => void;
  setSelectedQuest: (quest: any | null, openModal?: boolean) => void;
  setQuestDetailOpen: (open: boolean) => void;
  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  activeTab: 'library',
  showModal: false,
  showCreateModal: false,
  itemCreationType: null,
  itemToEdit: null,
  selectedItem: null,
  itemDetailOpen: false,
  itemCreationCharacterId: null,

  characterManagementId: null,

  showSkillCreateModal: false,
  skillCreationType: null,
  skillToEdit: null,
  selectedSkill: null,
  skillDetailOpen: false,

  showQuestCreateModal: false,
  questToEdit: null,
  selectedQuest: null,
  questDetailOpen: false,

  autoSync: true,
  setAutoSync: (autoSync) => set({ autoSync }),

  searchQuery: '',

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setShowModal: (show) => set({ showModal: show }),
  setShowCreateModal: (show, type = null, category, item = null) => set({ 
    showCreateModal: show, 
    itemCreationType: type,
    itemToEdit: item
  }),
  setSelectedItem: (item, openModal = true) => set({ selectedItem: item, itemDetailOpen: item ? openModal : false }),
  setItemDetailOpen: (open) => set({ itemDetailOpen: open }),

  setCharacterManagement: (id) => set({ characterManagementId: id }),

  setShowSkillCreateModal: (show, skill = null, type = null) => set({ 
    showSkillCreateModal: show, 
    skillToEdit: skill,
    skillCreationType: type 
  }),
  setSelectedSkill: (skill, openModal = true) => set({ selectedSkill: skill, skillDetailOpen: skill ? openModal : false }),
  setSkillDetailOpen: (open) => set({ skillDetailOpen: open }),

  setShowQuestCreateModal: (show, questToEdit = null) => set({ showQuestCreateModal: show, questToEdit }),
  setSelectedQuest: (quest, openModal = true) => set({ selectedQuest: quest, questDetailOpen: quest ? openModal : false }),
  setQuestDetailOpen: (open) => set({ questDetailOpen: open }),
  
  setSearchQuery: (query) => set({ searchQuery: query }),
}));
