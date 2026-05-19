import { RefObject, useEffect, useRef, useCallback, useState } from 'react';
import * as PIXI from 'pixi.js';
import { BoardScene } from '../pixi/BoardScene';
import { usePeer } from './usePeer';
import { TokenData } from '../pixi/TokenSprite';
import { usePeersStore } from '../store/peers';

export function useBoard(containerRef: RefObject<HTMLDivElement>, sessionId: string, currentMapId?: string, imageUrl?: string) {
  const boardRef = useRef<BoardScene | null>(null);
  const { onData, broadcast, sendTo, peerId } = usePeer();
  const { isHost } = usePeersStore();
  const cachedMapBuffer = useRef<{ buffer: ArrayBuffer; type: string } | null>(null);
  const [isReady, setIsReady] = useState(false);

  const loadMap = useCallback(async (url: string, format?: string) => {
    if (!boardRef.current) {
      console.warn('[useBoard] Attempted to load map before board is ready');
      return;
    }
    
    console.log('[useBoard] Loading map:', url);
    await boardRef.current.loadMap(url, format);

    if (isHost && !url.startsWith('blob:')) {
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const buffer = await blob.arrayBuffer();
        cachedMapBuffer.current = { buffer, type: blob.type };
        broadcast({ type: 'MAP_READY', payload: {} });
      } catch (e) {
        console.error('Erreur MJ lors de la mise en cache de la map:', e);
      }
    }
  }, [isHost, broadcast]);

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
  const currentMapIdRef = useRef(currentMapId);
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
    if (!isReady) return;

    if (imageUrl) {
      if (isHost) {
        loadMap(imageUrl);
      } else {
        // Le joueur demande l'image au MJ
        broadcast({ type: 'REQUEST_MAP_IMAGE', payload: { peerId } });
      }
    }
  }, [isReady, imageUrl, isHost, loadMap, broadcast, peerId]);

  // Networking logic for tokens & map
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
      } else if (data.type === 'REQUEST_MAP_IMAGE' && isHost) {
        // Le MJ reçoit une demande d'image d'un joueur
        if (cachedMapBuffer.current) {
          console.log(`[Host] Envoi de la map à ${fromPeerId}`);
          sendTo(fromPeerId, { type: 'MAP_IMAGE_DATA', payload: cachedMapBuffer.current });
        }
      } else if (data.type === 'MAP_READY' && !isHost) {
        // Le MJ signale qu'il vient de finir de charger l'image
        broadcast({ type: 'REQUEST_MAP_IMAGE', payload: { peerId } });
      } else if (data.type === 'MAP_IMAGE_DATA' && !isHost) {
        // Le joueur reçoit les données binaires de l'image
        console.log('[Player] Map reçue en P2P, chargement...');
        const { buffer, type } = data.payload;
        const format = type?.split('/')[1] || 'png';
        
        const blob = new Blob([buffer], { type });
        const objectUrl = URL.createObjectURL(blob);
        
        boardRef.current.loadMap(objectUrl, format).then(() => {
          URL.revokeObjectURL(objectUrl);
        }).catch(err => {
          console.error('[Player] Error loading P2P map:', err);
          URL.revokeObjectURL(objectUrl);
        });
      }
    });

    return () => unsub();
  }, [onData, isHost, broadcast, sendTo, peerId]);

  const addToken = useCallback((token: TokenData) => {
    if (boardRef.current) {
      boardRef.current.addToken(token);
      broadcast({ type: 'TOKEN_ADD', payload: token });
    }
  }, [broadcast]);

  const removeToken = useCallback((id: string) => {
    if (boardRef.current) {
      boardRef.current.removeToken(id);
      broadcast({ type: 'TOKEN_REMOVE', payload: { id } });
    }
  }, [broadcast]);

  const clearTokens = useCallback(() => {
    if (boardRef.current) {
      boardRef.current.clearTokens();
    }
  }, []);

  const getCenterView = useCallback(() => {
    if (!boardRef.current || !containerRef.current) return { x: 0, y: 0 };
    
    // On calcule le centre du container en coordonnée "monde" Pixi
    const container = containerRef.current;
    const centerX = container.offsetWidth / 2;
    const centerY = container.offsetHeight / 2;
    
    // On convertit ce point local au container vers le repère local de la scène
    return boardRef.current.toLocal({ x: centerX, y: centerY });
  }, [containerRef]);

  return { addToken, removeToken, loadMap, clearTokens, isReady, getCenterView };
}
