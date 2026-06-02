import { useRef, useEffect, useState, useCallback } from 'react';
import { useBoard } from '../../hooks/useBoard';
import { usePeersStore } from '../../store/peers';
import { useAuthStore, SecurityLevel } from '../../store/auth';
import { usePeer } from '../../hooks/usePeer';
import { Character } from '../../services/characters.service';
import { useMapStore } from '../../store/map';
import { mapSyncService } from '../../services/map-sync.service';
import { BrowserImageCompressor } from '../../services/browser-image-compressor';
import { MapTransitionOverlay } from './MapTransitionOverlay';
import { assetSyncService } from '../../services/asset-sync.service';


export interface MapItem {
  id: string;
  name: string;
  url: string;
  is_hidden?: boolean;
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
  const { addToken, removeToken, moveToken, loadMap, setGridSize, clearTokens, isReady, getCenterView, loadingProgress, retryLoad } = useBoard(containerRef, sessionId, currentMapId, imageUrl);
  const { isHost } = usePeersStore();
  const { onData, broadcast, sendTo } = usePeer();
  const { user } = useAuthStore();
  const [mapTokens, setMapTokens] = useState<any[]>([]);
  const updateTokenList = useMapStore(state => state.updateTokenList);
  const setTokenStatus = useMapStore(state => state.setTokenStatus);

  const isMJ = user && user.role >= SecurityLevel.MJ;

  const [hasLoadedTokensForMap, setHasLoadedTokensForMap] = useState<string>('');
  const lastPreparedMapRef = useRef<string>('');

  const isExternalMap = window.location.href.includes('/external/map');

  // Reset local state when sessionId changes to prevent leakage
  useEffect(() => {
    setHasLoadedTokensForMap('');
    lastPreparedMapRef.current = '';
    setMapTokens([]);
  }, [sessionId]);

  // Synchronisation MJ : Préparation de la map quand l'ID change
  useEffect(() => {
    if (!isReady || !isHost || !currentMapId) return;
    if (lastPreparedMapRef.current === currentMapId) return;

    const currentMap = maps.find(m => m.id === currentMapId);
    if (!currentMap) return;

    const prepareCurrentMap = async () => {
        try {
          let finalUrl = currentMap.url;
          if (window.electronAPI && window.electronAPI.fetchImage && !finalUrl.startsWith('data:') && !finalUrl.startsWith('blob:')) {
            const base64 = await window.electronAPI.fetchImage(finalUrl);
            if (base64) finalUrl = base64;
          }

          const response = await fetch(finalUrl);
          const blob = await response.blob();
          
          console.log('[Host] BoardCanvas prépare la map:', currentMap.name);
          lastPreparedMapRef.current = currentMapId;
          await mapSyncService.broadcastNewMap(
            currentMap.id, 
            blob, 
            new BrowserImageCompressor(),
            currentMap.grid_size || 50
          );
        } catch (e) {
          console.error('[Host] Erreur préparation map:', e);
        }
    };
    prepareCurrentMap();
  }, [isReady, currentMapId, maps, isHost]);

  // Synchronisation de la map initiale et des changements de props
  useEffect(() => {
    if (!isReady) return;

    const currentMap = maps.find(m => m.id === currentMapId);
    if (currentMap && isHost) {
      console.log('[Host] BoardCanvas prêt pour la map:', currentMap.name);
    }

    // ✅ Si on est un joueur, on demande une synchro des tokens dès que la map est prête
    if (!isHost) {
      console.log('[Player] Map prête, demande de synchro des tokens...');
      broadcast({ type: 'TOKEN_SYNC_REQUEST', payload: {} });
    }
  }, [isReady, currentMapId, maps, isHost, broadcast]);

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
      if (!isExternalMap) {
         const syncChannel = new BroadcastChannel(`board_position_sync_${sessionId}`);
         syncChannel.postMessage({ type: 'TOKEN_REMOVE', payload: { id: char.id } });
         syncChannel.close();
      }
    } else {
      // Ajouter le token au centre
      const center = getCenterView();
      const x = isNaN(center.x) ? 0 : Math.round(center.x);
      const y = isNaN(center.y) ? 0 : Math.round(center.y);

      // ✅ Résoudre l'image en asset:// avant diffusion aux joueurs
      const resolvedImageUrl = await assetSyncService.resolveLocalImage(char.image_url);

      const tokenData = {
        id: char.id,
        name: char.name,
        image_url: resolvedImageUrl,
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
      if (!isExternalMap) {
         const syncChannel = new BroadcastChannel(`board_position_sync_${sessionId}`);
         syncChannel.postMessage({ type: 'TOKEN_ADD', payload: tokenData });
         syncChannel.close();
      }
    }
  }, [isHost, currentMapId, mapTokens, sessionId, getCenterView, broadcast, addToken, updateTokenList, setTokenStatus, removeToken, isExternalMap]);

  // Synchronisation des changements de map et tokens pour les joueurs
  useEffect(() => {
    if (!isReady) return;

    const unsub = onData((data, fromPeerId) => {
      if (data.type === 'MAP_CHANGE' && !isHost) {
        console.log('[Player] Changement de map reçu:', data.payload.name);
        // ✅ On ne charge plus l'URL en direct (CORS + doublon système de chunks)
        // L'hydratation de la map se fera via useBoard qui écoute ControlChannelMessage.TRANSFER_START
        clearTokens();
        // On demande les tokens de la nouvelle map
        broadcast({ type: 'TOKEN_SYNC_REQUEST', payload: {} });
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
        if (!isExternalMap) {
            const syncChannel = new BroadcastChannel(`board_position_sync_${sessionId}`);
            syncChannel.postMessage(data);
            syncChannel.close();
        }
      } else if (data.type === 'TOKEN_REMOVE') {
        if (!isHost) {
          removeToken(data.payload.id);
        }
        setTokenStatus(data.payload.id, false);
        if (!isExternalMap) {
            const syncChannel = new BroadcastChannel(`board_position_sync_${sessionId}`);
            syncChannel.postMessage(data);
            syncChannel.close();
        }
      } else if (data.type === 'TOKEN_MOVE') {
        if (!isHost) {
          const { id, x, y } = data.payload;
          moveToken(id, x, y);
        }
        if (!isExternalMap) {
            const syncChannel = new BroadcastChannel(`board_position_sync_${sessionId}`);
            syncChannel.postMessage(data);
            syncChannel.close();
        }
      } else if (data.type === 'TOGGLE_TOKEN_REQUEST' && isHost) {
        const char = characters.find(c => c.id === data.payload.id);
        console.log(`[Host] TOGGLE_TOKEN_REQUEST reçu pour le perso: ${char?.name || 'Inconnu'} (id: ${data.payload.id})`);
        if (char) {
            handleToggleToken(char);
        }
      } else if (data.type === 'TOKEN_MOVE_REQUEST' && isHost) {
        // ✅ Un joueur demande à bouger un token (Le MJ arbitre)
        const { id, x, y } = data.payload;
        console.log(`[Host] Autorisation de mouvement pour ${id} vers ${x},${y}`);
        
        // 1. Mise à jour locale du MJ
        moveToken(id, x, y);
        
        // 2. Sauvegarde en DB
        if (window.electronAPI && currentMapId) {
            window.electronAPI.updateMapToken(sessionId, currentMapId, id, x, y).catch(console.error);
        }
        
        // 3. Diffusion de la position "officielle" à tous les autres
        broadcast({ type: 'TOKEN_MOVE', payload: { id, x, y } });
        if (!isExternalMap) {
            const syncChannel = new BroadcastChannel(`board_position_sync_${sessionId}`);
            syncChannel.postMessage({ type: 'TOKEN_MOVE', payload: { id, x, y } });
            syncChannel.close();
        }

      } else if (data.type === 'TOKEN_SYNC_REQUEST' && isHost) {
        // Un joueur demande une synchro complète des tokens (Le MJ répond)
        console.log(`[Host] Réponse à TOKEN_SYNC_REQUEST pour ${fromPeerId}`);
        if (window.electronAPI && currentMapId) {
            window.electronAPI.getMapTokens(sessionId, currentMapId).then(async tokens => {
                for (const t of tokens) {
                    const char = characters.find(c => c.id === t.character_id);
                    if (char && fromPeerId) {
                        // ✅ Résoudre l'image locale → asset://
                        const resolvedImageUrl = await assetSyncService.resolveLocalImage(char.image_url);
                        // ✅ PUSH proactif de l'asset avant l'envoi du token
                        if (resolvedImageUrl?.startsWith('asset://')) {
                            await assetSyncService.pushAssetToPeer(resolvedImageUrl, fromPeerId);
                        }
                        sendTo(fromPeerId, {
                            type: 'TOKEN_ADD',
                            payload: {
                                id: char.id,
                                name: char.name,
                                image_url: resolvedImageUrl,
                                x: t.x,
                                y: t.y,
                            }
                        });
                    }
                }
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
  }, [isReady, onData, isHost, loadMap, clearTokens, mapTokens, characters, broadcast, sendTo, setTokenStatus, handleToggleToken, addToken, removeToken, moveToken, currentMapId, sessionId, isExternalMap]);

  // Exposer handleToggleToken via BroadcastChannel
  useEffect(() => {
    const channel = new BroadcastChannel(`board_actions_${sessionId}`);
    channel.onmessage = (event) => {
      const { type, payload } = event.data;
      if (type === 'TOGGLE_TOKEN') {
        if (isHost) {
          const char = characters.find(c => c.id === payload.id);
          if (char) handleToggleToken(char);
        } else {
          broadcast({ type: 'TOGGLE_TOKEN_REQUEST', payload: { id: payload.id } });
        }
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
    return () => channel.close();
  }, [sessionId, isHost, characters, handleToggleToken, mapTokens, broadcast, addToken]);

  // Sync vers fenêtre externe (mode projecteur)
  useEffect(() => {
    if (!sessionId) return;
    const syncChannel = new BroadcastChannel(`board_position_sync_${sessionId}`);

    if (isExternalMap) {
      syncChannel.onmessage = (event) => {
        const { type, payload } = event.data;
        if (type === 'TOKEN_ADD') addToken(payload);
        else if (type === 'TOKEN_REMOVE') removeToken(payload.id);
        else if (type === 'TOKEN_MOVE') moveToken(payload.id, payload.x, payload.y);
        else if (type === 'INITIAL_STATE') {
          clearTokens();
          payload.tokens.forEach((t: any) => addToken(t));
        }
      };

      if (isReady) {
        syncChannel.postMessage({ type: 'REQUEST_INITIAL_STATE' });
      }
    } else {
      syncChannel.onmessage = (event) => {
        if (event.data.type === 'REQUEST_INITIAL_STATE') {
          // Relayer l'état actuel
          const fullTokens = mapTokens.map(t => {
            const char = characters.find(c => c.id === t.character_id);
            return char ? { id: char.id, name: char.name, image_url: char.image_url, x: t.x, y: t.y } : null;
          }).filter(Boolean);
          syncChannel.postMessage({ type: 'INITIAL_STATE', payload: { tokens: fullTokens } });
        }
      };
    }

    return () => syncChannel.close();
  }, [sessionId, isExternalMap, isReady, mapTokens, characters, addToken, removeToken, moveToken, clearTokens]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div ref={containerRef} className="absolute inset-0 z-0" />
      <MapTransitionOverlay progress={loadingProgress} onRetry={retryLoad} />
    </div>
  );
}
