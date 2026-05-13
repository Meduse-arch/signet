import { create } from 'zustand';

export type WindowType = 'scenes' | 'story' | 'dice' | 'assets' | 'players' | 'character' | 'bestiary';

interface WindowState {
  isOpen: boolean;
  zIndex: number;
  position: { x: number; y: number };
}

const getCenterPosition = (offset = 0) => {
  if (typeof window !== 'undefined') {
    const w = 320; // approx width (w-80)
    const h = 400; // approx height
    return {
      x: Math.max(0, (window.innerWidth - w) / 2 + offset),
      y: Math.max(0, (window.innerHeight - h) / 2 + offset)
    };
  }
  return { x: 100, y: 100 };
};

const DEFAULT_WINDOWS: Record<WindowType, WindowState> = {
  scenes: { isOpen: false, zIndex: 50, position: getCenterPosition(0) },
  bestiary: { isOpen: false, zIndex: 50, position: getCenterPosition(10) },
  story: { isOpen: false, zIndex: 50, position: getCenterPosition(20) },
  dice: { isOpen: false, zIndex: 50, position: getCenterPosition(40) },
  assets: { isOpen: false, zIndex: 50, position: getCenterPosition(60) },
  players: { isOpen: false, zIndex: 50, position: getCenterPosition(80) },
  character: { isOpen: false, zIndex: 50, position: getCenterPosition(100) },
};

interface SignetInterfaceState {
  windows: Record<WindowType, WindowState>;
  maxZIndex: number;
  openWindow: (type: WindowType, position?: { x: number, y: number }) => void;
  closeWindow: (type: WindowType) => void;
  focusWindow: (type: WindowType) => void;
  updatePosition: (type: WindowType, x: number, y: number) => void;
  initialize: (sessionId: string) => void;
}

export const useSignetStore = create<SignetInterfaceState>((set, get) => ({
  windows: DEFAULT_WINDOWS,
  maxZIndex: 50,

  initialize: (sessionId: string) => {
    const storageKey = `signet_windows_${sessionId}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const closedWindows = { ...DEFAULT_WINDOWS };
        Object.keys(parsed).forEach((key) => {
          const k = key as WindowType;
          if (closedWindows[k]) {
            // Check if saved position is way off screen, if so, reset it
            let pos = parsed[k].position;
            if (typeof window !== 'undefined' && pos) {
              if (pos.y > window.innerHeight - 50 || pos.x > window.innerWidth - 50 || pos.y < -50 || pos.x < -50) {
                 pos = getCenterPosition();
              }
            }
            closedWindows[k] = { 
              ...parsed[k], 
              isOpen: false,
              position: pos || getCenterPosition()
            };
          }
        });
        set({ windows: closedWindows });
        const maxZ = Math.max(...Object.values(parsed).map((w: any) => w.zIndex || 50), 50);
        set({ maxZIndex: maxZ });
      } catch (e) {
        set({ windows: DEFAULT_WINDOWS });
      }
    } else {
      set({ windows: DEFAULT_WINDOWS });
    }
  },

  openWindow: (type, position) => {
    const { maxZIndex, windows } = get();
    const newMaxZ = maxZIndex + 1;
    
    let targetPos = position || windows[type].position;
    
    // Fallback recentering if the window is off-screen
    if (typeof window !== 'undefined') {
       if (targetPos.y > window.innerHeight - 100 || targetPos.x > window.innerWidth - 100) {
           targetPos = getCenterPosition();
       }
    }

    const newWindows = {
      ...windows,
      [type]: { ...windows[type], isOpen: true, zIndex: newMaxZ, position: targetPos }
    };
    set({ windows: newWindows, maxZIndex: newMaxZ });
    
    const sessionId = window.location.hash.split('/').pop()?.split('?')[0];
    if (sessionId) {
      localStorage.setItem(`signet_windows_${sessionId}`, JSON.stringify(newWindows));
    }
  },

  closeWindow: (type) => {
    const { windows } = get();
    const newWindows = {
      ...windows,
      [type]: { ...windows[type], isOpen: false }
    };
    set({ windows: newWindows });
    
    const sessionId = window.location.hash.split('/').pop()?.split('?')[0];
    if (sessionId) {
      localStorage.setItem(`signet_windows_${sessionId}`, JSON.stringify(newWindows));
    }
  },

  focusWindow: (type) => {
    const { maxZIndex, windows } = get();
    const newMaxZ = maxZIndex + 1;
    const newWindows = {
      ...windows,
      [type]: { ...windows[type], zIndex: newMaxZ }
    };
    set({ windows: newWindows, maxZIndex: newMaxZ });
    
    const sessionId = window.location.hash.split('/').pop()?.split('?')[0];
    if (sessionId) {
      localStorage.setItem(`signet_windows_${sessionId}`, JSON.stringify(newWindows));
    }
  },

  updatePosition: (type, x, y) => {
    const { windows } = get();
    const newWindows = {
      ...windows,
      [type]: { ...windows[type], position: { x, y } }
    };
    set({ windows: newWindows });
    
    const sessionId = window.location.hash.split('/').pop()?.split('?')[0];
    if (sessionId) {
      localStorage.setItem(`signet_windows_${sessionId}`, JSON.stringify(newWindows));
    }
  },
}));
