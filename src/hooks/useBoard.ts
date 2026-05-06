import { RefObject, useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { BoardScene } from '../pixi/BoardScene';
import { usePeer } from './usePeer';
import { TokenData } from '../pixi/TokenSprite';
import { usePeersStore } from '../store/peers';

export function useBoard(containerRef: RefObject<HTMLDivElement>, sessionId: string, imageUrl?: string) {
  const boardRef = useRef<BoardScene | null>(null);
  const { onData, broadcast, sendTo, peerId } = usePeer();
  const { isHost } = usePeersStore();
  const cachedMapBuffer = useRef<{ buffer: ArrayBuffer; type: string } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let app: PIXI.Application | null = null;
    let isDestroyed = false;
    let isInitialized = false;

    async function init() {
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
          app.destroy(true);
          return;
        }

        app.canvas.style.position = 'absolute';
        app.canvas.style.inset = '0';
        container!.appendChild(app.canvas);

        const scene = new BoardScene(app);
        boardRef.current = scene;
        app.stage.addChild(scene);

        if (imageUrl) {
          if (isHost) {
            // Le MJ charge l'image directement (pas de restriction CORS dans Electron avec nos réglages)
            await scene.loadMap(imageUrl);
            
            // Le MJ prépare l'image en ArrayBuffer pour l'envoyer aux joueurs plus tard
            try {
              const response = await fetch(imageUrl);
              const blob = await response.blob();
              const buffer = await blob.arrayBuffer();
              cachedMapBuffer.current = { buffer, type: blob.type };
              
              // Prévenir les joueurs déjà connectés que l'image est prête (s'ils attendent)
              broadcast({ type: 'MAP_READY', payload: {} });
            } catch (e) {
              console.error('Erreur MJ lors de la mise en cache de la map:', e);
            }
          } else {
            // Le joueur demande l'image au MJ au lieu de la fetch lui-même
            broadcast({ type: 'REQUEST_MAP_IMAGE', payload: { peerId } });
          }
        }

        // ✅ Gestion des mouvements (Network Broadcast)
        let lastBroadcast = 0;
        scene.onTokenMove = (id, x, y) => {
          const now = Date.now();
          if (now - lastBroadcast > 50) { // Throttle 20fps
            broadcast({ type: 'TOKEN_MOVE', payload: { id, x, y } });
            lastBroadcast = now;
          }
        };

        // Resize handling
        const resizeObserver = new ResizeObserver(() => {
          if (app && !isDestroyed) {
            app.renderer.resize(container!.offsetWidth, container!.offsetHeight);
            scene.x = app.screen.width / 2;
            scene.y = app.screen.height / 2;
          }
        });
        resizeObserver.observe(container!);

        return () => {
          resizeObserver.disconnect();
        };
      } catch (err) {
        console.error('Board Pixi initialization failed', err);
      }
    }

    init();

    return () => {
      isDestroyed = true;
      if (app && isInitialized) {
        app.destroy(true);
        app = null;
      }
      boardRef.current = null;
    };
  }, [containerRef, sessionId, broadcast, imageUrl, isHost, peerId]);

  // Networking logic for tokens & map
  useEffect(() => {
    const unsub = onData((data, fromPeerId) => {
      if (!boardRef.current) return;

      if (data.type === 'TOKEN_ADD') {
        boardRef.current.addToken(data.payload as TokenData);
      } else if (data.type === 'TOKEN_MOVE') {
        const { id, x, y } = data.payload;
        boardRef.current.moveToken(id, x, y);
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

  const addToken = (token: TokenData) => {
    if (boardRef.current) {
      boardRef.current.addToken(token);
      broadcast({ type: 'TOKEN_ADD', payload: token });
    }
  };

  return { addToken };
}
