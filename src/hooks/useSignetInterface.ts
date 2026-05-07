import { useState, useCallback, useEffect } from 'react';

export type WindowType = 'scenes' | 'story' | 'dice' | 'assets' | 'players';

interface WindowState {
  isOpen: boolean;
  zIndex: number;
  position: { x: number; y: number };
}

const DEFAULT_WINDOWS: Record<WindowType, WindowState> = {
  scenes: { isOpen: false, zIndex: 50, position: { x: 50, y: 50 } },
  story: { isOpen: false, zIndex: 50, position: { x: 100, y: 100 } },
  dice: { isOpen: false, zIndex: 50, position: { x: 150, y: 150 } },
  assets: { isOpen: false, zIndex: 50, position: { x: 200, y: 200 } },
  players: { isOpen: false, zIndex: 50, position: { x: 250, y: 250 } },
};

export function useSignetInterface(sessionId: string) {
  const storageKey = `signet_windows_${sessionId}`;

  const [windows, setWindows] = useState<Record<WindowType, WindowState>>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_WINDOWS;
      }
    }
    return DEFAULT_WINDOWS;
  });

  const [maxZIndex, setMaxZIndex] = useState(() => {
    return Math.max(...Object.values(windows).map(w => w.zIndex), 50);
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(windows));
  }, [windows, storageKey]);

  const openWindow = useCallback((type: WindowType) => {
    setWindows(prev => ({
      ...prev,
      [type]: { ...prev[type], isOpen: true, zIndex: maxZIndex + 1 }
    }));
    setMaxZIndex(prev => prev + 1);
  }, [maxZIndex]);

  const closeWindow = useCallback((type: WindowType) => {
    setWindows(prev => ({
      ...prev,
      [type]: { ...prev[type], isOpen: false }
    }));
  }, []);

  const focusWindow = useCallback((type: WindowType) => {
    setWindows(prev => ({
      ...prev,
      [type]: { ...prev[type], zIndex: maxZIndex + 1 }
    }));
    setMaxZIndex(prev => prev + 1);
  }, [maxZIndex]);

  const updatePosition = useCallback((type: WindowType, x: number, y: number) => {
    setWindows(prev => ({
      ...prev,
      [type]: { ...prev[type], position: { x, y } }
    }));
  }, []);

  return { windows, openWindow, closeWindow, focusWindow, updatePosition };
}
