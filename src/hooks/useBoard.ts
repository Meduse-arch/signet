import { RefObject, useEffect, useRef, useCallback, useState } from 'react';
import * as PIXI from 'pixi.js';
import { BoardScene } from '../pixi/BoardScene';
import { usePeer } from './usePeer';
import { TokenData } from '../pixi/TokenSprite';
import { usePeersStore } from '../store/peers';
import { mapSyncService } from '../services/map-sync.service';

import { useSessionStore } from '../store/session';

import { BrowserImageCompressor } from '../services/browser-image-compressor';

export function useBoard(containerRef: RefObject<HTMLDivElement>, sessionId: string, currentMapId?: string, imageUrl?: string) {
  const boardRef = useRef<BoardScene | null>(null);
  const { onData, broadcast, sendTo, peerId } = usePeer();
  const { isHost } = usePeersStore();
  const session = useSessionStore(state => state.sessions.find(s => s.id === sessionId));
  const cachedMapBuffer = useRef<{ buffer: ArrayBuffer; type: string } | null>(null);
  const [isReady, setIsReady] = useState(false);
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
      mapSyncService.hydrateMapFromCache(mapId);
    }
  }, [getCenterView, isReady]);

  const loadMap = useCallback(async (url: string, format?: string, gridSize: number = 50) => {
    if (!boardRef.current) {
      console.warn('[useBoard] Attempted to load map before board is ready');
      return;
    }
    
    console.log('[useBoard] Loading map:', url, 'with grid size:', gridSize);
    await boardRef.current.loadMap(url, format, gridSize);

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
      if (mapId !== currentMapIdRef.current) return;
      
      if (!boardRef.current || !isReady) {
        pendingManifest.current = { mapId, manifest, missingChunks, hostPeerId };
        return;
      }
      
      processManifest(mapId, manifest, missingChunks, hostPeerId);
    });

    const unsubChunk = mapSyncService.onChunkReady((mapId, chunk, data) => {
      console.log(`[useBoard] Chunk ready for ${mapId}: ${chunk.id}. Pixi ready: ${isReady}`);
      if (mapId !== currentMapIdRef.current) return;
      
      if (boardRef.current && isReady) {
        boardRef.current.paintChunk(chunk.id, chunk.x, chunk.y, data);
      } else {
        console.log(`[useBoard] Queuing chunk ${chunk.id}`);
        chunkQueue.current.push({ mapId, chunk, data });
      }
    });

    return () => {
      unsubManifest();
      unsubChunk();
    };
  }, [session?.hostPeerId, isReady, processManifest]);

  // Drain queues when ready
  useEffect(() => {
    if (isReady && boardRef.current) {
      if (pendingManifest.current) {
        const { mapId, manifest, missingChunks, hostPeerId } = pendingManifest.current;
        processManifest(mapId, manifest, missingChunks, hostPeerId);
        
        // Si la map était déjà complète, on déclenche l'hydratation maintenant que Pixi est prêt
        if (missingChunks.length === 0) {
            console.log(`[useBoard] Retrying hydration for complete map ${mapId}`);
            mapSyncService.hydrateMapFromCache(mapId);
        }
        
        pendingManifest.current = null;
      }

      if (chunkQueue.current.length > 0) {
        console.log(`[useBoard] Replaying ${chunkQueue.current.length} queued chunks`);
        chunkQueue.current.forEach(({ chunk, data }) => {
          boardRef.current!.paintChunk(chunk.id, chunk.x, chunk.y, data);
        });
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
      console.log('[useBoard] Requesting destruction of Pixi Application');
      isDestroyed = true;
      setIsReady(false);
      if (app && isInitialized) {
        app.destroy({ removeView: true });
        app = null;
      }
      boardRef.current = null;
    };
  }, [containerRef]); // On ne dépend que du container

  // Gestion du onTokenMove avec les IDs à jour
  useEffect(() => { currentMapIdRef.current = currentMapId; }, [currentMapId]);

  useEffect(() => {
    if (isReady && boardRef.current) {
      boardRef.current.onTokenMove = (id, x, y) => {
        broadcast({ type: 'TOKEN_MOVE', payload: { id, x, y } });
        if (isHost && window.electronAPI && currentMapIdRef.current) {
          window.electronAPI.updateMapToken(sessionId, currentMapIdRef.current, id, x, y).catch(console.error);
        }
      };
    }
  }, [isReady, isHost, sessionId, broadcast]);

  // 2. Chargement initial et synchronisation
  useEffect(() => {
    if (!currentMapId || isHost) return;

    const checkAndRequestMap = async () => {
        const existing = await mapSyncService.dbStorage.getMap(currentMapId);
        if (existing) {
            console.log(`[useBoard] Map ${currentMapId} trouvée en cache, hydratation...`);
            // loadManifest sera appelé via processManifest si on déclenche l'évènement manuellement
            // ou on peut appeler hydrateMapFromCache directement si isReady est vrai
            if (isReady) {
                const maxX = Math.max(...existing.manifest.chunks.map(c => c.x));
                const maxY = Math.max(...existing.manifest.chunks.map(c => c.y));
                const width = existing.manifest.width || (maxX + 1) * 512;
                const height = existing.manifest.height || (maxY + 1) * 512;
                boardRef.current?.loadManifest(width, height, existing.manifest.grid_size || 50);
                mapSyncService.hydrateMapFromCache(currentMapId);
            }
        } else {
            console.log(`[useBoard] Map ${currentMapId} manquante, demande du manifest au MJ...`);
            broadcast({ type: 'REQUEST_MAP_MANIFEST', payload: { mapId: currentMapId } });
        }
    };
    checkAndRequestMap();
  }, [currentMapId, isHost, isReady, broadcast]);

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

  return { addToken, removeToken, moveToken, loadMap, setGridSize, clearTokens, isReady, getCenterView };
}
