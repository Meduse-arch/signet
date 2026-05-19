import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  activeTab: 'library' | 'search' | 'key' | 'forge';
  showModal: boolean;
  showCreateModal: boolean;
  itemCreationType: 'forge' | 'inventory' | null;
  itemCreationCharacterId: string | null;
  selectedItem: any | null;
  itemDetailOpen: boolean;
  searchQuery: string;
  viewMode: 'grid' | 'codex';
  setSidebarOpen: (open: boolean) => void;
  setActiveTab: (tab: 'library' | 'search' | 'key' | 'forge') => void;
  setShowModal: (show: boolean) => void;
  setShowCreateModal: (show: boolean, type?: 'forge' | 'inventory', characterId?: string) => void;
  setSelectedItem: (item: any | null) => void;
  setItemDetailOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  setViewMode: (mode: 'grid' | 'codex') => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  activeTab: 'library',
  showModal: false,
  showCreateModal: false,
  itemCreationType: null,
  itemCreationCharacterId: null,
  selectedItem: null,
  itemDetailOpen: false,
  searchQuery: '',
  viewMode: 'grid',
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setShowModal: (show) => set({ showModal: show }),
  setShowCreateModal: (show, type = null, characterId = null) => set({ 
    showCreateModal: show, 
    itemCreationType: type,
    itemCreationCharacterId: characterId
  }),
  setSelectedItem: (item) => set({ selectedItem: item, itemDetailOpen: !!item }),
  setItemDetailOpen: (open) => set({ itemDetailOpen: open }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setViewMode: (mode) => set({ viewMode: mode }),
}));