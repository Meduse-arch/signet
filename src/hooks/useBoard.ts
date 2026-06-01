import { RefObject, useEffect, useRef, useCallback, useState } from 'react';
import * as PIXI from 'pixi.js';
import { BoardScene } from '../pixi/BoardScene';
import { usePeer } from './usePeer';
import { TokenData } from '../pixi/TokenSprite';
import { usePeersStore } from '../store/peers';
import { mapSyncService } from '../services/map-sync.service';

import { useSessionStore } from '../store/session';

import { BrowserImageCompressor } from '../services/browser-image-compressor';

import { dbStorage } from '../services/db.storage';

export function useBoard(containerRef: RefObject<HTMLDivElement>, sessionId: string, currentMapId?: string, imageUrl?: string) {
  const boardRef = useRef<BoardScene | null>(null);
  const { onData, broadcast, sendTo, peerId } = usePeer();
  const { isHost } = usePeersStore();
  const session = useSessionStore(state => state.sessions.find(s => s.id === sessionId));
  const cachedMapBuffer = useRef<{ buffer: ArrayBuffer; type: string } | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState<{
    loaded: number;
    total: number;
    active: boolean;
    status: 'idle' | 'waiting_manifest' | 'loading_chunks' | 'painting_cache' | 'complete' | 'error';
    error?: string;
  }>({ loaded: 0, total: 0, active: false, status: 'idle' });
  const chunkQueue = useRef<{mapId: string, chunk: any, data: ArrayBuffer}[]>([]);
  const pendingManifest = useRef<{mapId: string, manifest: any, missingChunks: any[], hostPeerId: string} | null>(null);

  const getCenterView = useCallback(() => {
    if (!boardRef.current || !containerRef.current) return { x: 0, y: 0 };
    
    // On calcule le centre du container en coordonnée "monde" Pixi
    const container = containerRef.current;
    const centerX = container.offsetWidth / 2;
    const centerY = container.offsetHeight / 2;
    
    // On convertit ce point local au container vers le repère local de la scène
    return boardRef.current.toLocal({ x: centerX, y: centerY });
  }, [containerRef]);

  const paintMapFromCache = useCallback(async (mapId: string, manifest: any) => {
    setLoadingProgress({ loaded: 0, total: manifest.chunks.length, active: true, status: 'painting_cache' });
    let loadedCount = 0;
    for (const chunk of manifest.chunks) {
      if (currentMapIdRef.current !== mapId) return;
      const record = await dbStorage.getChunk(chunk.id);
      if (record?.data && record.status === 'complete') {
        if (boardRef.current && isReady) {
          boardRef.current.paintChunk(chunk.id, chunk.x, chunk.y, record.data);
        }
      }
      loadedCount++;
      // On met juste à jour pour la forme, mais sans charger l'interface avec la barre
    }
    setLoadingProgress({ loaded: manifest.chunks.length, total: manifest.chunks.length, active: false, status: 'complete' });
  }, [isReady]);

  const retryLoad = useCallback(() => {
    if (!currentMapIdRef.current || isHost) return;
    setLoadingProgress({ loaded: 0, total: 0, active: true, status: 'waiting_manifest' });
    broadcast({ type: 'REQUEST_MAP_MANIFEST', payload: { mapId: currentMapIdRef.current } });
  }, [isHost, broadcast]);

  const processManifest = useCallback((mapId: string, manifest: any, missingChunks: any[], hostPeerId: string) => {
    if (!boardRef.current || !isReady) {
      console.log(`[useBoard] Pixi not ready, queuing manifest for ${mapId}`);
      pendingManifest.current = { mapId, manifest, missingChunks, hostPeerId };
      return;
    }

    console.log(`[useBoard] Processing manifest for ${mapId}. Missing: ${missingChunks.length}`);
    
    // On utilise les dimensions réelles si présentes, sinon on calcule à partir des chunks
    let width = manifest.width;
    let height = manifest.height;

    if (!width || !height) {
        const maxX = Math.max(...manifest.chunks.map((c: any) => c.x));
        const maxY = Math.max(...manifest.chunks.map((c: any) => c.y));
        width = (maxX + 1) * 512;
        height = (maxY + 1) * 512;
    }

    const gridSize = manifest.grid_size || 50;

    boardRef.current.loadManifest(width, height, gridSize);

    if (missingChunks.length > 0 && hostPeerId) {
      setLoadingProgress({ loaded: manifest.chunks.length - missingChunks.length, total: manifest.chunks.length, active: true, status: 'loading_chunks' });
      const center = getCenterView();
      const camX = isNaN(center.x) ? width / 2 : center.x + width / 2;
      const camY = isNaN(center.y) ? height / 2 : center.y + height / 2;

      const sortedChunks = [...missingChunks].sort((a, b) => {
        const distA = Math.hypot((a.x * 512 + 256) - camX, (a.y * 512 + 256) - camY);
        const distB = Math.hypot((b.x * 512 + 256) - camX, (b.y * 512 + 256) - camY);
        return distA - distB;
      });

      const chunkIds = sortedChunks.map(c => c.id);
      mapSyncService.requestChunks(mapId, chunkIds, hostPeerId);
    } else if (missingChunks.length === 0) {
      console.log(`[useBoard] Map ${mapId} complete in cache, starting hydration...`);
      paintMapFromCache(mapId, manifest);
    }
  }, [getCenterView, isReady, paintMapFromCache]);

  const loadMap = useCallback(async (url: string, format?: string, gridSize: number = 50) => {
    if (!boardRef.current) {
      console.warn('[useBoard] Attempted to load map before board is ready');
      return;
    }
    
    console.log('[useBoard] Loading map:', url, 'with grid size:', gridSize);
    setLoadingProgress({ loaded: 0, total: 100, active: true, status: 'painting_cache' });
    
    // Attendre 300ms pour que le brouillard masque l'écran avant de charger
    await new Promise(resolve => setTimeout(resolve, 300));
    
    await boardRef.current.loadMap(url, format, gridSize);
    setLoadingProgress({ loaded: 100, total: 100, active: false, status: 'complete' });

    if (isHost && !url.startsWith('blob:')) {
      try {
        let finalUrl = url;
        if (window.electronAPI && window.electronAPI.fetchImage && !url.startsWith('data:')) {
          const base64 = await window.electronAPI.fetchImage(url);
          if (base64) finalUrl = base64;
        }

        const response = await fetch(finalUrl);
        const blob = await response.blob();
        cachedMapBuffer.current = { buffer: await blob.arrayBuffer(), type: blob.type };
        
        if (currentMapIdRef.current) {
          console.log('[Host] Buffer size:', cachedMapBuffer.current.buffer.byteLength);
          console.log('[Host] Compression et découpage de la map en cours...');
          await mapSyncService.broadcastNewMap(
            currentMapIdRef.current, 
            blob, 
            new BrowserImageCompressor(),
            gridSize
          );
        }
      } catch (e) {
        console.error('Erreur MJ lors de la préparation de la map:', e);
      }
    }
  }, [isHost]);

  const setGridSize = useCallback((size: number) => {
    if (boardRef.current) {
        boardRef.current.setGridSize(size);
    }
  }, []);

  const currentMapIdRef = useRef(currentMapId);
  useEffect(() => { currentMapIdRef.current = currentMapId; }, [currentMapId]);

  useEffect(() => {
    const unsubManifest = mapSyncService.onManifestReceived((mapId, manifest, missingChunks, hostPeerId) => {
      if (mapId !== currentMapIdRef.current) {
          console.log(`[useBoard] Ignoring manifest for ${mapId} (current: ${currentMapIdRef.current})`);
          return;
      }
      
      if (!boardRef.current || !isReady) {
        console.log(`[useBoard] Pixi not ready, queuing manifest for ${mapId}`);
        pendingManifest.current = { mapId, manifest, missingChunks, hostPeerId };
        return;
      }
      
      processManifest(mapId, manifest, missingChunks, hostPeerId);
    });

    const unsubChunk = mapSyncService.onChunkReady((mapId, chunk, data) => {
      if (mapId !== currentMapIdRef.current) return;
      
      setLoadingProgress(prev => {
        if (!prev.active) return prev;
        const newLoaded = prev.loaded + 1;
        const active = newLoaded < prev.total;
        return {
          ...prev,
          loaded: newLoaded,
          active: active,
          status: active ? 'loading_chunks' : 'complete'
        };
      });

      if (boardRef.current && isReady) {
        boardRef.current.paintChunk(chunk.id, chunk.x, chunk.y, data);
      } else {
        console.log(`[useBoard] Queuing chunk ${chunk.id} for ${mapId}`);
        chunkQueue.current.push({ mapId, chunk, data });
      }
    });

    return () => {
      unsubManifest();
      unsubChunk();
    };
  }, [isReady, processManifest]);

  // Drain queues when ready
  useEffect(() => {
    if (isReady && boardRef.current) {
      if (pendingManifest.current) {
        const { mapId, manifest, missingChunks, hostPeerId } = pendingManifest.current;
        if (mapId === currentMapIdRef.current) {
            processManifest(mapId, manifest, missingChunks, hostPeerId);
            
            // Si la map était déjà complète, on déclenche l'hydratation maintenant que Pixi est prêt
            if (missingChunks.length === 0) {
                console.log(`[useBoard] Retrying hydration for complete map ${mapId}`);
                paintMapFromCache(mapId, manifest);
            }
        }
        pendingManifest.current = null;
      }

      if (chunkQueue.current.length > 0) {
        // Filtrer les chunks qui ne correspondent plus à la map actuelle
        const validChunks = chunkQueue.current.filter(c => c.mapId === currentMapIdRef.current);
        if (validChunks.length > 0) {
            console.log(`[useBoard] Replaying ${validChunks.length} queued chunks for ${currentMapIdRef.current}`);
            validChunks.forEach(({ chunk, data }) => {
              boardRef.current!.paintChunk(chunk.id, chunk.x, chunk.y, data);
            });
        }
        chunkQueue.current = [];
      }
    }
  }, [isReady, processManifest]);

  // 1. Initialisation de Pixi (Une seule fois)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let app: PIXI.Application | null = null;
    let isDestroyed = false;
    let isInitialized = false;

    async function init() {
      console.log('[useBoard] Initializing Pixi Application');
      app = new PIXI.Application();
      
      try {
        await app.init({
          width: container!.offsetWidth,
          height: container!.offsetHeight,
          backgroundAlpha: 0,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
        });

        isInitialized = true;

        if (isDestroyed) {
          console.log('[useBoard] Init finished but already destroyed, cleaning up...');
          app.destroy({ removeView: true });
          return;
        }

        app.canvas.style.position = 'absolute';
        app.canvas.style.inset = '0';
        container!.appendChild(app.canvas);

        const scene = new BoardScene(app);
        boardRef.current = scene;
        app.stage.addChild(scene);

        // Resize handling
        const resizeObserver = new ResizeObserver(() => {
          if (app && isInitialized && !isDestroyed) {
            app.renderer.resize(container!.offsetWidth, container!.offsetHeight);
            // On centre la scène à chaque resize
            scene.x = app.screen.width / 2;
            scene.y = app.screen.height / 2;
          }
        });
        resizeObserver.observe(container!);

        setIsReady(true);

        return () => {
          resizeObserver.disconnect();
        };
      } catch (err) {
        console.error('Board Pixi initialization failed', err);
      }
    }

    init();

    return () => {
      console.log('[useBoard] Requesting destruction of Pixi Application and clearing caches');
      isDestroyed = true;
      setIsReady(false);
      
      // ✅ Vider les caches globaux de Pixi pour éviter de réutiliser des textures d'une autre session
      if (typeof PIXI !== 'undefined') {
        try {
          (PIXI.Assets as any)?.reset?.();
          (PIXI.Cache as any)?.reset?.();
          // Pour Pixi v8, on peut aussi vider les textures manuellement si nécessaire
        } catch (e) {
          console.warn('[useBoard] Failed to reset PIXI caches:', e);
        }
      }

      if (app && isInitialized) {
        app.destroy({ removeView: true });
        app = null;
      }
      boardRef.current = null;
    };
  }, [containerRef]); // On ne dépend que du container

  // Gestion du onTokenMove avec les IDs à jour
  useEffect(() => { 
      currentMapIdRef.current = currentMapId; 
      // ✅ MJ : On vide les files d'attente lors d'un changement de map manuel
      pendingManifest.current = null;
      chunkQueue.current = [];
      console.log(`[useBoard] Scene change detected, queues cleared for: ${currentMapId}`);
  }, [currentMapId]);

  useEffect(() => {
    if (isReady && boardRef.current) {
      boardRef.current.onTokenMove = (id, x, y) => {
        if (isHost) {
          // ✅ MJ : On prévient tout le monde directement et on sauve en DB
          broadcast({ type: 'TOKEN_MOVE', payload: { id, x, y } });
          const syncChannel = new BroadcastChannel(`board_position_sync_${sessionId}`);
          syncChannel.postMessage({ type: 'TOKEN_MOVE', payload: { id, x, y } });
          syncChannel.close();
          if (window.electronAPI && currentMapIdRef.current) {
            window.electronAPI.updateMapToken(sessionId, currentMapIdRef.current, id, x, y).catch(console.error);
          }
        } else {
          // ✅ JOUEUR : On demande seulement au MJ de bouger le token
          // On ne le broadcast pas nous-même pour éviter les conflits
          const sData = useSessionStore.getState().sessions.find(s => s.id === sessionId);
          if (sData?.hostPeerId) {
            sendTo(sData.hostPeerId, { type: 'TOKEN_MOVE_REQUEST', payload: { id, x, y } });
          }
        }
      };
    }
  }, [isReady, isHost, sessionId, broadcast, sendTo]);

  // 2. Chargement initial et synchronisation
  useEffect(() => {
    if (!currentMapId || isHost) return;

    let timeoutId: NodeJS.Timeout;

    const checkAndRequestMap = async () => {
        // Déclencher le brouillard immédiatement
        setLoadingProgress({ loaded: 0, total: 100, active: true, status: 'painting_cache' });
        
        // Attendre 300ms que le brouillard masque l'écran avant de changer la carte
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Si la map a rechangé entre temps, on abandonne
        if (currentMapIdRef.current !== currentMapId) return;

        const existing = await dbStorage.getMap(currentMapId);
        if (existing) {
            console.log(`[useBoard] Map ${currentMapId} trouvée en cache, hydratation...`);
            if (isReady) {
                const maxX = Math.max(...existing.manifest.chunks.map(c => c.x));
                const maxY = Math.max(...existing.manifest.chunks.map(c => c.y));
                const width = existing.manifest.width || (maxX + 1) * 512;
                const height = existing.manifest.height || (maxY + 1) * 512;
                boardRef.current?.loadManifest(width, height, existing.manifest.grid_size || 50);
                paintMapFromCache(currentMapId, existing.manifest);
            }
        } else {
            console.log(`[useBoard] Map ${currentMapId} manquante, demande du manifest au MJ...`);
            setLoadingProgress({ loaded: 0, total: 0, active: true, status: 'waiting_manifest' });
            broadcast({ type: 'REQUEST_MAP_MANIFEST', payload: { mapId: currentMapId } });
            
            timeoutId = setTimeout(() => {
                setLoadingProgress(prev => {
                    if (prev.active && prev.status === 'waiting_manifest') {
                        return { ...prev, status: 'error', error: "Impossible de récupérer la carte auprès de l'hôte. Veuillez vérifier la connexion." };
                    }
                    return prev;
                });
            }, 8000);
        }
    };
    checkAndRequestMap();

    return () => {
        if (timeoutId) clearTimeout(timeoutId);
    };
  }, [currentMapId, isHost, isReady, broadcast, paintMapFromCache]);

  // Networking logic for tokens
  useEffect(() => {
    const unsub = onData((data, fromPeerId) => {
      if (!boardRef.current) return;

      if (data.type === 'TOKEN_ADD') {
        boardRef.current.addToken(data.payload as TokenData);
      } else if (data.type === 'TOKEN_MOVE') {
        const { id, x, y } = data.payload;
        boardRef.current.moveToken(id, x, y);
      } else if (data.type === 'TOKEN_REMOVE') {
        boardRef.current.removeToken(data.payload.id);
      }
    });

    return () => unsub();
  }, [onData]);

  const addToken = useCallback((token: TokenData) => {
    if (boardRef.current) {
      boardRef.current.addToken(token);
    }
  }, []);

  const removeToken = useCallback((id: string) => {
    if (boardRef.current) {
      boardRef.current.removeToken(id);
    }
  }, []);

  const clearTokens = useCallback(() => {
    if (boardRef.current) {
      boardRef.current.clearTokens();
    }
  }, []);

  const moveToken = useCallback((id: string, x: number, y: number) => {
    if (boardRef.current) {
      boardRef.current.moveToken(id, x, y);
    }
  }, []);

  
  useEffect(() => {
    const handleZoom = (e: CustomEvent<{ id: string }>) => {
      if (boardRef.current) {
        boardRef.current.zoomToToken(e.detail.id);
      }
    };
    window.addEventListener('ZOOM_TO_TOKEN', handleZoom as EventListener);
    return () => window.removeEventListener('ZOOM_TO_TOKEN', handleZoom as EventListener);
  }, []);

  return { addToken, removeToken, moveToken, loadMap, setGridSize, clearTokens, isReady, getCenterView, loadingProgress, retryLoad };
}
