import { useRef, useEffect, useState } from 'react';
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
  const { addToken, loadMap, clearTokens } = useBoard(containerRef, sessionId, imageUrl);
  const { isHost } = usePeersStore();
  const { onData } = usePeer();
  const [mapTokens, setMapTokens] = useState<any[]>([]);

  // Charger les tokens de la map (Host only, puis broadcast)
  useEffect(() => {
    const fetchTokens = async () => {
      if (isHost && window.electronAPI && currentMapId) {
        const tokens = await window.electronAPI.getMapTokens(sessionId, currentMapId);
        setMapTokens(tokens);
      }
    };
    fetchTokens();
  }, [currentMapId, isHost, sessionId]);

  // Synchronisation de la map initiale et des changements de props
  useEffect(() => {
    const currentMap = maps.find(m => m.id === currentMapId);
    if (currentMap) {
      loadMap(currentMap.url);
    } else if (imageUrl) {
      loadMap(imageUrl);
    }
  }, [currentMapId, maps, imageUrl, loadMap]);

  // Placer les tokens sur la map
  useEffect(() => {
    clearTokens();
    
    // Si on est le host, on place les tokens depuis la DB
    if (isHost) {
      mapTokens.forEach(t => {
        const char = characters.find(c => c.id === t.character_id);
        if (char) {
          addToken({
            id: char.id,
            name: char.name,
            image_url: char.image_url,
            x: t.x,
            y: t.y,
          });
        }
      });
    }
  }, [mapTokens, characters, addToken, clearTokens, isHost]);

  // Synchronisation des changements de map pour les joueurs
  useEffect(() => {
    const unsub = onData((data) => {
      if (data.type === 'MAP_CHANGE' && !isHost) {
        console.log('[Player] Changement de map reçu:', data.payload.name);
        loadMap(data.payload.url);
        clearTokens(); // Tokens will be received via TOKEN_ADD from host
      }
    });
    return () => unsub();
  }, [onData, isHost, loadMap, clearTokens]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div ref={containerRef} className="absolute inset-0 z-0" />
    </div>
  );
}
