import { create } from 'zustand';

interface ConfirmState {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  ask: (message: string) => Promise<boolean>;
}

export const useConfirmStore = create<ConfirmState>((set) => ({
  isOpen: false,
  message: '',
  onConfirm: () => {},
  onCancel: () => {},
  ask: (message: string) => {
    return new Promise((resolve) => {
      set({
        isOpen: true,
        message,
        onConfirm: () => {
          set({ isOpen: false });
          resolve(true);
        },
        onCancel: () => {
          set({ isOpen: false });
          resolve(false);
        }
      });
    });
  }
}));
