import { RefObject, useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { BoardScene } from '../pixi/BoardScene';
import { usePeer } from './usePeer';
import { TokenData } from '../pixi/TokenSprite';

export function useBoard(containerRef: RefObject<HTMLDivElement>, sessionId: string, imageUrl?: string) {
  const boardRef = useRef<BoardScene | null>(null);
  const { onData, broadcast } = usePeer();

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
          await scene.loadMap(imageUrl);
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
  }, [containerRef, sessionId, broadcast, imageUrl]);

  // Networking logic for tokens
  useEffect(() => {
    const unsub = onData((data) => {
      if (!boardRef.current) return;

      if (data.type === 'TOKEN_ADD') {
        boardRef.current.addToken(data.payload as TokenData);
      } else if (data.type === 'TOKEN_MOVE') {
        const { id, x, y } = data.payload;
        boardRef.current.moveToken(id, x, y);
      }
    });

    return () => unsub();
  }, [onData]);

  const addToken = (token: TokenData) => {
    if (boardRef.current) {
      boardRef.current.addToken(token);
      broadcast({ type: 'TOKEN_ADD', payload: token });
    }
  };

  return { addToken };
}
