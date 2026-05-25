import { useRef, useEffect, useState, useCallback } from 'react';
import { useBoard } from '../../hooks/useBoard';
import { usePeersStore } from '../../store/peers';
import { useAuthStore, SecurityLevel } from '../../store/auth';
import { usePeer } from '../../hooks/usePeer';
import { Character } from '../../services/characters.service';
import { useMapStore } from '../../store/map';

// ... (MapItem interface remains same)

export function BoardCanvas({ sessionId, imageUrl, maps, currentMapId, characters }: BoardCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { addToken, loadMap, setGridSize, clearTokens, isReady, getCenterView } = useBoard(containerRef, sessionId, currentMapId, imageUrl);
  const { isHost } = usePeersStore();
  const { onData, broadcast } = usePeer();
  const { user } = useAuthStore();
  const [mapTokens, setMapTokens] = useState<any[]>([]);
  const updateTokenList = useMapStore(state => state.updateTokenList);
  const setTokenStatus = useMapStore(state => state.setTokenStatus);

  const isMJ = user && user.role >= SecurityLevel.MJ;

  // Charger les tokens de la map (Host only)
  const fetchTokens = useCallback(async () => {
    if (isHost && window.electronAPI && currentMapId) {
      console.log('[BoardCanvas] Fetching tokens for map:', currentMapId);
      const tokens = await window.electronAPI.getMapTokens(sessionId, currentMapId);
      setMapTokens(tokens);
      
      // Update store for all windows
      updateTokenList(tokens.map((t: any) => t.character_id));
      
      // Notifier tout le monde du nouvel état des tokens
      const channel = new BroadcastChannel(`board_actions_${sessionId}`);
      channel.postMessage({ 
        type: 'TOKEN_LIST_UPDATE', 
        payload: { tokens: tokens.map((t: any) => t.character_id) } 
      });
      channel.close();
    }
  }, [isHost, sessionId, currentMapId, updateTokenList]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  // Synchronisation de la map initiale et des changements de props
  useEffect(() => {
    if (!isReady) return;

    const currentMap = maps.find(m => m.id === currentMapId);
    if (currentMap) {
      loadMap(currentMap.url, undefined, currentMap.grid_size || 50);
    } else if (imageUrl) {
      loadMap(imageUrl);
    }

    // ✅ Si on est un joueur, on demande une synchro des tokens dès que la map est prête
    if (!isHost) {
      console.log('[Player] Map prête, demande de synchro des tokens...');
      broadcast({ type: 'TOKEN_SYNC_REQUEST', payload: {} });
    }
  }, [isReady, currentMapId, maps, imageUrl, loadMap, isHost, broadcast]);

  // Synchroniser la taille de la grille spécifiquement si elle change (sans recharger toute l'image)
  useEffect(() => {
    if (!isReady) return;
    const currentMap = maps.find(m => m.id === currentMapId);
    if (currentMap?.grid_size) {
      setGridSize(currentMap.grid_size);
    }
  }, [isReady, currentMapId, maps, setGridSize]);

  // Placer les tokens sur la map (Source de vérité MJ)
  useEffect(() => {
    if (!isReady || !isHost) return;

    // ✅ Seulement le MJ (host) vide et replace selon sa DB locale
    clearTokens();
    
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
  }, [isReady, mapTokens, characters, addToken, clearTokens, isHost]);

  // Synchronisation des changements de map et tokens pour les joueurs
  useEffect(() => {
    if (!isReady) return;

    const unsub = onData((data) => {
      if (data.type === 'MAP_CHANGE' && !isHost) {
        console.log('[Player] Changement de map reçu:', data.payload.name);
        // On utilise la grid_size du payload ou 50 par défaut
        loadMap(data.payload.url, undefined, data.payload.grid_size || 50);
        clearTokens();
        // On demande les tokens de la nouvelle map
        broadcast({ type: 'TOKEN_SYNC_REQUEST', payload: {} });
      } else if (data.type === 'TOKEN_ADD') {
        // Un nouveau token arrive (ou suite à une synchro)
        if (!isHost) {
          boardRef.current?.addToken({
            id: data.payload.id,
            name: data.payload.name,
            image_url: data.payload.image_url,
            x: data.payload.x,
            y: data.payload.y,
          });
          setTokenStatus(data.payload.id, true);
        }
      } else if (data.type === 'TOKEN_MOVE') {
        // Mise à jour de position reçue
        const { id, x, y } = data.payload;
        boardRef.current?.moveToken(id, x, y);
      } else if (data.type === 'TOKEN_REMOVE') {
        // Un token est retiré
        if (!isHost) {
          boardRef.current?.removeToken(data.payload.id);
          setTokenStatus(data.payload.id, false);
        }
      } else if (data.type === 'TOKEN_SYNC_REQUEST' && isHost) {
        // Un joueur demande une synchro complète des tokens (Le MJ répond)
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
      } else if (data.type === 'TOGGLE_TOKEN_REQUEST' && isHost) {
        // Un joueur demande à poser/retirer son token
        const char = characters.find(c => c.id === data.payload.id);
        if (char) {
            handleToggleToken(char);
        }
      }
    });
    return () => unsub();
  }, [isReady, onData, isHost, loadMap, clearTokens, mapTokens, characters, broadcast, setTokenStatus, addToken]);

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
      // ✅ CRITIQUE : Informer les autres joueurs de l'ajout
      broadcast({ type: 'TOKEN_ADD', payload: tokenData });
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
