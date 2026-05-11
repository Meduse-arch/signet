import { useRef, useEffect } from 'react';
import { useBoard } from '../../hooks/useBoard';
import { usePeersStore } from '../../store/peers';
import { useAuthStore } from '../../store/auth';
import { usePeer } from '../../hooks/usePeer';

export interface MapItem {
  id: string;
  name: string;
  url: string;
}

interface BoardCanvasProps {
  sessionId: string;
  imageUrl?: string;
  maps: MapItem[];
  currentMapId: string;
  onSelectMap: (map: MapItem) => void;
}

export function BoardCanvas({ sessionId, imageUrl, maps, currentMapId }: BoardCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { addToken, loadMap } = useBoard(containerRef, sessionId, imageUrl);
  const { isHost } = usePeersStore();
  const { user } = useAuthStore();
  const { onData } = usePeer();

  // Synchronisation de la map initiale et des changements de props
  useEffect(() => {
    const currentMap = maps.find(m => m.id === currentMapId);
    if (currentMap) {
      loadMap(currentMap.url);
    } else if (imageUrl) {
      loadMap(imageUrl);
    }
  }, [currentMapId, maps, imageUrl, loadMap]);

  // Synchronisation des changements de map pour les joueurs
  useEffect(() => {
    const unsub = onData((data) => {
      if (data.type === 'MAP_CHANGE' && !isHost) {
        console.log('[Player] Changement de map reçu:', data.payload.name);
        loadMap(data.payload.url);
      }
    });
    return () => unsub();
  }, [onData, isHost, loadMap]);

  const handleAddToken = () => {
    const id = Math.random().toString(36).substring(2, 9);
    addToken({
      id,
      name: user?.pseudo || 'Joueur',
      x: (Math.random() - 0.5) * 200,
      y: (Math.random() - 0.5) * 200,
    });
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div ref={containerRef} className="absolute inset-0 z-0" />
    </div>
  );
}
