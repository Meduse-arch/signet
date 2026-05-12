import { useEffect } from 'react';
import { useSignetStore, WindowType } from '../store/signet';

export function useSignetInterface(sessionId: string) {
  const { windows, openWindow, closeWindow, focusWindow, updatePosition, initialize } = useSignetStore();

  useEffect(() => {
    initialize(sessionId);
  }, [sessionId, initialize]);

  return { windows, openWindow, closeWindow, focusWindow, updatePosition };
}
export type { WindowType };
