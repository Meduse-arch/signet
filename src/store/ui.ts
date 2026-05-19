import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  activeTab: 'library' | 'search' | 'key' | 'forge';
  showModal: boolean;
  showCreateModal: boolean;
  itemCreationType: 'forge' | 'inventory' | null;
  itemCreationCharacterId: string | null;
  searchQuery: string;
  setSidebarOpen: (open: boolean) => void;
  setActiveTab: (tab: 'library' | 'search' | 'key' | 'forge') => void;
  setShowModal: (show: boolean) => void;
  setShowCreateModal: (show: boolean, type?: 'forge' | 'inventory', characterId?: string) => void;
  setSearchQuery: (query: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  activeTab: 'library',
  showModal: false,
  showCreateModal: false,
  itemCreationType: null,
  itemCreationCharacterId: null,
  searchQuery: '',
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setShowModal: (show) => set({ showModal: show }),
  setShowCreateModal: (show, type = null, characterId = null) => set({ 
    showCreateModal: show, 
    itemCreationType: type,
    itemCreationCharacterId: characterId
  }),
  setSearchQuery: (query) => set({ searchQuery: query }),
}));