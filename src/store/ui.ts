import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  activeTab: 'library' | 'search' | 'key' | 'forge';
  showModal: boolean;
  showCreateModal: boolean;
  searchQuery: string;
  setSidebarOpen: (open: boolean) => void;
  setActiveTab: (tab: 'library' | 'search' | 'key' | 'forge') => void;
  setShowModal: (show: boolean) => void;
  setShowCreateModal: (show: boolean) => void;
  setSearchQuery: (query: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  activeTab: 'library',
  showModal: false,
  showCreateModal: false,
  searchQuery: '',
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setShowModal: (show) => set({ showModal: show }),
  setShowCreateModal: (show) => set({ showCreateModal: show }),
  setSearchQuery: (query) => set({ searchQuery: query }),
}));