import { useState, useEffect } from 'react';
import { usePeer } from './usePeer';
import { usePeersStore } from '../store/peers';
import { Character } from '../services/characters.service';

export function useTokenMapStatus(sessionId: string, character: Character | null) {
  const [currentMapId, setCurrentMapId] = useState<string>('');
  const [isTokenOnMap, setIsTokenOnMap] = useState(false);
  const { onData, broadcast } = usePeer();
  const isHost = usePeersStore(state => state.isHost);

  useEffect(() => {
    // Initial load : On commence toujours par la scène initiale
    setCurrentMapId('initial-scene');

    // Listen to changes
    const channel = new BroadcastChannel(`signet_sync_${sessionId}`);
    channel.onmessage = (event) => {
      if (event.data.type === 'MAP_CHANGE') {
        // Le payload contient l'URL ou l'ID selon le composant émetteur
        // Ici on se base sur le fait que SealEngine synchronise l'ID via P2P/Internal
        // mais pour le BroadcastChannel local (pop-outs), on peut avoir besoin d'extraire l'ID.
      }
    };
    return () => channel.close();
  }, [sessionId]);

  useEffect(() => {
    if (!character || !currentMapId) return;
    
    const checkToken = async () => {
      if (isHost && window.electronAPI) {
        const tokens = await window.electronAPI.getMapTokens(sessionId, currentMapId);
        setIsTokenOnMap(tokens.some((t: any) => t.character_id === character.id));
      }
    };
    checkToken();
    
    const unsub = onData((data: any) => {
       if (data.type === 'TOKEN_ADD' && data.payload.id === character.id) setIsTokenOnMap(true);
       if (data.type === 'TOKEN_REMOVE' && data.payload.id === character.id) setIsTokenOnMap(false);
    });

    return () => { if (unsub) unsub(); };
  }, [character, currentMapId, sessionId, onData, isHost]);

  const toggleTokenPlacement = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!character || !currentMapId) return;
    
    if (isTokenOnMap) {
      if (isHost && window.electronAPI) {
        await window.electronAPI.removeMapToken(sessionId, currentMapId, character.id);
      }
      broadcast({ type: 'TOKEN_REMOVE', payload: { id: character.id } });
      setIsTokenOnMap(false);
    } else {
      let finalImageUrl = character.image_url;
      if (isHost && finalImageUrl && !finalImageUrl.startsWith('asset://') && !finalImageUrl.startsWith('http') && window.electronAPI) {
          try {
              const base64 = await window.electronAPI.fetchImage(finalImageUrl);
              if (base64) {
                  const res = await fetch(base64);
                  const blob = await res.blob();
                  const { assetSyncService } = await import('../services/asset-sync.service');
                  finalImageUrl = await assetSyncService.uploadLocalAsset(blob);
              }
          } catch (e) {
              console.error("Auto-conversion failed for token:", e);
          }
      }

      if (isHost && window.electronAPI) {
        await window.electronAPI.updateMapToken(sessionId, currentMapId, character.id, 0, 0);
      }
      const payload = {
        id: character.id,
        name: character.name,
        image_url: finalImageUrl,
        x: 0,
        y: 0
      };
      broadcast({ type: 'TOKEN_ADD', payload });
      setIsTokenOnMap(true);
    }
  };

  return { isTokenOnMap, toggleTokenPlacement };
}
