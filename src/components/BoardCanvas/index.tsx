import { useRef, useEffect } from 'react';
import { useBoard } from '../../hooks/useBoard';
import { usePeersStore } from '../../store/peers';
import { useAuthStore } from '../../store/auth';
import { usePeer } from '../../hooks/usePeer';
import { Character } from '../../services/characters.service';

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
  characters: Character[];
}

export function BoardCanvas({ sessionId, imageUrl, maps, currentMapId, characters }: BoardCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { addToken, loadMap } = useBoard(containerRef, sessionId, imageUrl);
  const { isHost } = usePeersStore();
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

  // Synchronisation des personnages en tant que tokens
  useEffect(() => {
    characters.forEach(char => {
      addToken({
        id: char.id,
        name: char.name,
        image_url: char.image_url,
        x: 0,
        y: 0,
      });
    });
  }, [characters, addToken]);

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

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div ref={containerRef} className="absolute inset-0 z-0" />
    </div>
  );
}
