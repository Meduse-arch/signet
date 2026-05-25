import { useRef, useEffect, useState, useCallback } from 'react';
import { useBoard } from '../../hooks/useBoard';
import { usePeersStore } from '../../store/peers';
import { useAuthStore, SecurityLevel } from '../../store/auth';
import { usePeer } from '../../hooks/usePeer';
import { Character } from '../../services/characters.service';
import { useMapStore } from '../../store/map';

interface MapItem {
  id: string;
  name: string;
  url: string;
  is_hidden: boolean;
  grid_size?: number;
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
  const { addToken, removeToken, moveToken, loadMap, setGridSize, clearTokens, isReady, getCenterView } = useBoard(containerRef, sessionId, currentMapId, imageUrl);
  const { isHost } = usePeersStore();
  const { onData, broadcast, sendTo } = usePeer();
  const { user } = useAuthStore();
  const [mapTokens, setMapTokens] = useState<any[]>([]);
  const updateTokenList = useMapStore(state => state.updateTokenList);
  const setTokenStatus = useMapStore(state => state.setTokenStatus);

  const isMJ = user && user.role >= SecurityLevel.MJ;

  const [hasLoadedTokensForMap, setHasLoadedTokensForMap] = useState<string>('');

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

  // Placer les tokens sur la map (Source de vérité MJ : Initialisation uniquement)
  useEffect(() => {
    if (!isReady || !isHost || !currentMapId) return;
    if (hasLoadedTokensForMap === currentMapId) return;

    const loadInitialTokens = async () => {
      console.log(`[BoardCanvas] Loading tokens for map: ${currentMapId}. Characters available: ${characters.length}`);
      const tokens = await window.electronAPI.getMapTokens(sessionId, currentMapId);
      console.log(`[BoardCanvas] Found ${tokens.length} tokens in DB for this map`);
      
      setMapTokens(tokens);
      updateTokenList(tokens.map((t: any) => t.character_id));
      
      clearTokens();
      tokens.forEach(t => {
        const char = characters.find(c => c.id === t.character_id);
        if (char) {
          console.log(`[BoardCanvas] Restoring token for character: ${char.name}`);
          addToken({
            id: char.id,
            name: char.name,
            image_url: char.image_url,
            x: isNaN(t.x) ? 0 : t.x,
            y: isNaN(t.y) ? 0 : t.y,
          });
        } else {
          console.warn(`[BoardCanvas] Character not found for token: ${t.character_id}`);
        }
      });
      setHasLoadedTokensForMap(currentMapId);
      
      // Notifier les joueurs du statut initial
      const channel = new BroadcastChannel(`board_actions_${sessionId}`);
      channel.postMessage({ 
        type: 'TOKEN_LIST_UPDATE', 
        payload: { tokens: tokens.map((t: any) => t.character_id) } 
      });
      channel.close();
    };

    loadInitialTokens();
  }, [isReady, isHost, currentMapId, hasLoadedTokensForMap, characters, addToken, clearTokens, sessionId, updateTokenList]);

  const handleToggleToken = useCallback(async (char: Character) => {
    if (!isHost || !currentMapId) return;

    const isOnMap = mapTokens.some(t => t.character_id === char.id);

    if (isOnMap) {
      // Retirer le token
      if (window.electronAPI) {
        await window.electronAPI.removeMapToken(sessionId, currentMapId, char.id);
      }
      setMapTokens(prev => prev.filter(t => t.character_id !== char.id));
      updateTokenList(mapTokens.filter(t => t.character_id !== char.id).map(t => t.character_id));
      
      removeToken(char.id); // On l'enlève de Pixi pour le MJ
      broadcast({ type: 'TOKEN_REMOVE', payload: { id: char.id } }); // On previent les autres
      setTokenStatus(char.id, false); // Update UI
    } else {
      // Ajouter le token au centre
      const center = getCenterView();
      const x = isNaN(center.x) ? 0 : Math.round(center.x);
      const y = isNaN(center.y) ? 0 : Math.round(center.y);

      const tokenData = {
        id: char.id,
        name: char.name,
        image_url: char.image_url,
        x,
        y
      };

      if (window.electronAPI) {
        await window.electronAPI.updateMapToken(sessionId, currentMapId, char.id, x, y);
      }
      
      const newMapToken = { character_id: char.id, x, y };
      setMapTokens(prev => [...prev, newMapToken]);
      updateTokenList([...mapTokens, newMapToken].map(t => t.character_id));

      addToken(tokenData); // Ajout Pixi pour le MJ
      broadcast({ type: 'TOKEN_ADD', payload: tokenData }); // Prevenir les autres
      setTokenStatus(char.id, true); // Update UI
    }
  }, [isHost, currentMapId, mapTokens, sessionId, getCenterView, broadcast, addToken, updateTokenList, setTokenStatus, removeToken]);

  // Synchronisation des changements de map et tokens pour les joueurs
  useEffect(() => {
    if (!isReady) return;

    const unsub = onData((data, fromPeerId) => {
      if (data.type === 'MAP_CHANGE' && !isHost) {
        console.log('[Player] Changement de map reçu:', data.payload.name);
        const { url, grid_size, id } = data.payload;
        loadMap(url, undefined, grid_size || 50);
        clearTokens();
        // On demande les tokens de la nouvelle map
        broadcast({ type: 'TOKEN_SYNC_REQUEST', payload: {} });
        // On demande l'image au cas où ce soit un fichier local MJ
        broadcast({ type: 'REQUEST_MAP_IMAGE', payload: { peerId: usePeersStore.getState().peerId } });
      } else if (data.type === 'TOKEN_ADD') {
        if (!isHost) {
          addToken({
            id: data.payload.id,
            name: data.payload.name,
            image_url: data.payload.image_url,
            x: data.payload.x,
            y: data.payload.y,
          });
        }
        setTokenStatus(data.payload.id, true);
      } else if (data.type === 'TOKEN_REMOVE') {
        if (!isHost) {
          removeToken(data.payload.id);
        }
        setTokenStatus(data.payload.id, false);
      } else if (data.type === 'TOKEN_MOVE') {
        if (!isHost) {
          const { id, x, y } = data.payload;
          moveToken(id, x, y);
        }
      } else if (data.type === 'TOKEN_SYNC_REQUEST' && isHost) {
        // Un joueur demande une synchro complète des tokens (Le MJ répond)
        console.log(`[Host] Réponse à TOKEN_SYNC_REQUEST pour ${fromPeerId}`);
        if (window.electronAPI && currentMapId) {
            window.electronAPI.getMapTokens(sessionId, currentMapId).then(tokens => {
                tokens.forEach((t: any) => {
                    const char = characters.find(c => c.id === t.character_id);
                    if (char && fromPeerId) {
                        sendTo(fromPeerId, {
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
            });
        }
      } else if (data.type === 'TOGGLE_TOKEN_REQUEST' && isHost) {
        // Un joueur demande à poser/retirer son token
        const char = characters.find(c => c.id === data.payload.id);
        if (char) {
            handleToggleToken(char);
        }
      }
    });
    return () => unsub();
  }, [isReady, onData, isHost, loadMap, clearTokens, mapTokens, characters, broadcast, sendTo, setTokenStatus, handleToggleToken, addToken, removeToken, moveToken, currentMapId, sessionId]);

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
      } else if (type === 'REFRESH_TOKEN_DATA') {
        // ✅ CRITIQUE : Si des données de perso arrivent après le token, on met à jour le token existant
        console.log(`[BoardCanvas] Refreshing token data for: ${payload.name}`);
        addToken({
            id: payload.id,
            name: payload.name,
            image_url: payload.image_url,
            x: NaN, // BoardScene gérera le maintien de la position actuelle si NaN
            y: NaN
        });
      }
    };

  }, [sessionId, isHost, characters, handleToggleToken, mapTokens]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div ref={containerRef} className="absolute inset-0 z-0" />
    </div>
  );
}
