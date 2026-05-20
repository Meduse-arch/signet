import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  activeTab: 'library' | 'search' | 'key' | 'forge';
  showModal: boolean;
  showCreateModal: boolean;
  itemCreationType: 'forge' | 'inventory' | null;
  itemCreationCharacterId: string | null;
  itemToEdit: any | null;
  selectedItem: any | null;
  itemDetailOpen: boolean;
  characterManagementId: string | null;
  searchQuery: string;
  viewMode: 'grid' | 'codex';
  
  // Skills specific UI state
  showSkillCreateModal: boolean;
  skillToEdit: any | null;
  selectedSkill: any | null;
  skillDetailOpen: boolean;

  setSidebarOpen: (open: boolean) => void;
  setActiveTab: (tab: 'library' | 'search' | 'key' | 'forge') => void;
  setShowModal: (show: boolean) => void;
  setShowCreateModal: (show: boolean, type?: 'forge' | 'inventory', characterId?: string, itemToEdit?: any | null) => void;
  setSelectedItem: (item: any | null, openModal?: boolean) => void;
  setItemDetailOpen: (open: boolean) => void;
  setCharacterManagement: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setViewMode: (mode: 'grid' | 'codex') => void;

  // Skills actions
  setShowSkillCreateModal: (show: boolean, skillToEdit?: any | null) => void;
  setSelectedSkill: (skill: any | null, openModal?: boolean) => void;
  setSkillDetailOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  activeTab: 'library',
  showModal: false,
  showCreateModal: false,
  itemCreationType: null,
  itemCreationCharacterId: null,
  itemToEdit: null,
  selectedItem: null,
  itemDetailOpen: false,
  characterManagementId: null,
  searchQuery: '',
  viewMode: 'grid',

  showSkillCreateModal: false,
  skillToEdit: null,
  selectedSkill: null,
  skillDetailOpen: false,

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setShowModal: (show) => set({ showModal: show }),
  setShowCreateModal: (show, type = null, characterId = null, itemToEdit = null) => set({ 
    showCreateModal: show, 
    itemCreationType: type,
    itemCreationCharacterId: characterId,
    itemToEdit
  }),
  setSelectedItem: (item, openModal = true) => set({ selectedItem: item, itemDetailOpen: item ? openModal : false }),
  setItemDetailOpen: (open) => set({ itemDetailOpen: open }),
  setCharacterManagement: (id) => set({ characterManagementId: id }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setViewMode: (mode) => set({ viewMode: mode }),

  setShowSkillCreateModal: (show, skillToEdit = null) => set({ showSkillCreateModal: show, skillToEdit }),
  setSelectedSkill: (skill, openModal = true) => set({ selectedSkill: skill, skillDetailOpen: skill ? openModal : false }),
  setSkillDetailOpen: (open) => set({ skillDetailOpen: open }),
}));