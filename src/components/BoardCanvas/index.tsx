import { useRef, useEffect, useState, useCallback } from 'react';
import { useBoard } from '../../hooks/useBoard';
import { usePeersStore } from '../../store/peers';
import { useAuthStore, SecurityLevel } from '../../store/auth';
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
  characters: Character[];
}

export function BoardCanvas({ sessionId, imageUrl, maps, currentMapId, characters }: BoardCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { addToken, loadMap, clearTokens, isReady, getCenterView } = useBoard(containerRef, sessionId, currentMapId, imageUrl);
  const { isHost } = usePeersStore();
  const { onData, broadcast } = usePeer();
  const { user } = useAuthStore();
  const [mapTokens, setMapTokens] = useState<any[]>([]);

  const isMJ = user && user.role >= SecurityLevel.MJ;

  // Charger les tokens de la map (Host only)
  const fetchTokens = useCallback(async () => {
    if (isHost && window.electronAPI && currentMapId) {
      console.log('[BoardCanvas] Fetching tokens for map:', currentMapId);
      const tokens = await window.electronAPI.getMapTokens(sessionId, currentMapId);
      setMapTokens(tokens);
      
      // Notifier tout le monde du nouvel état des tokens
      const channel = new BroadcastChannel(`board_actions_${sessionId}`);
      channel.postMessage({ 
        type: 'TOKEN_LIST_UPDATE', 
        payload: { tokens: tokens.map((t: any) => t.character_id) } 
      });
      channel.close();
    }
  }, [isHost, sessionId, currentMapId]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  // Synchronisation de la map initiale et des changements de props
  useEffect(() => {
    if (!isReady) return;

    const currentMap = maps.find(m => m.id === currentMapId);
    if (currentMap) {
      loadMap(currentMap.url);
    } else if (imageUrl) {
      loadMap(imageUrl);
    }
  }, [isReady, currentMapId, maps, imageUrl, loadMap]);

  // Placer les tokens sur la map
  useEffect(() => {
    if (!isReady) return;

    clearTokens();
    
    // Si on est le host, on place les tokens depuis la DB
    if (isHost) {
      console.log('[BoardCanvas] Placing tokens on board:', mapTokens.length);
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
  }, [isReady, mapTokens, characters, addToken, clearTokens, isHost]);

  // Synchronisation des changements de map pour les joueurs
  useEffect(() => {
    if (!isReady) return;

    const unsub = onData((data) => {
      if (data.type === 'MAP_CHANGE' && !isHost) {
        console.log('[Player] Changement de map reçu:', data.payload.name);
        loadMap(data.payload.url);
        clearTokens();
      } else if (data.type === 'TOKEN_SYNC_REQUEST' && isHost) {
        // Un joueur demande une synchro complète des tokens
        mapTokens.forEach(t => {
            const char = characters.find(c => c.id === t.character_id);
            if (char) {
                broadcast({
                    type: 'TOKEN_ADD',
                    payload: {
                        id: char.id,
                        name: char.name,
                        image_url: char.image_url,
                        x: t.x,
                        y: t.y,
                    }
                });
            }
        });
      }
    });
    return () => unsub();
  }, [isReady, onData, isHost, loadMap, clearTokens, mapTokens, characters, broadcast]);

  const handleToggleToken = useCallback(async (char: Character) => {
    if (!isHost || !currentMapId) return;

    const isOnMap = mapTokens.some(t => t.character_id === char.id);

    if (isOnMap) {
      // Retirer le token
      if (window.electronAPI) {
        await window.electronAPI.removeMapToken(sessionId, currentMapId, char.id);
        fetchTokens();
      }
      // Notify pixi and network
      broadcast({ type: 'TOKEN_REMOVE', payload: { id: char.id } });
    } else {
      // Ajouter le token au centre
      const center = getCenterView();
      const x = Math.round(center.x);
      const y = Math.round(center.y);

      const tokenData = {
        id: char.id,
        name: char.name,
        image_url: char.image_url,
        x,
        y
      };

      if (window.electronAPI) {
        await window.electronAPI.updateMapToken(sessionId, currentMapId, char.id, x, y);
        fetchTokens();
      }
      addToken(tokenData);
    }
  }, [isHost, currentMapId, mapTokens, sessionId, fetchTokens, getCenterView, broadcast, addToken]);

  // Exposer handleToggleToken via BroadcastChannel
  useEffect(() => {
    if (!isHost) return;
    const channel = new BroadcastChannel(`board_actions_${sessionId}`);
    channel.onmessage = (event) => {
      const { type, payload } = event.data;
      if (type === 'TOGGLE_TOKEN') {
        const char = characters.find(c => c.id === payload.id);
        if (char) handleToggleToken(char);
      } else if (type === 'GET_TOKEN_STATUS') {
        const isOnMap = mapTokens.some(t => t.character_id === payload.id);
        channel.postMessage({ type: 'TOKEN_STATUS_RESPONSE', payload: { id: payload.id, isOnMap } });
      }
    };
    return () => channel.close();
  }, [sessionId, isHost, characters, handleToggleToken, mapTokens]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div ref={containerRef} className="absolute inset-0 z-0" />
    </div>
  );
}
