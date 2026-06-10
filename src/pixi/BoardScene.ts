import { Application, Container, Graphics, Text, Ticker } from 'pixi.js';
import { buildHighQualityFilters, PaletteAnalysis } from './qualityFilters';
import { MapLayer } from './MapLayer';
import { FogOfWar } from './FogOfWar';
import { TokenSprite, TokenData } from './TokenSprite';
import { pixelToHex, hexRound, hexToPixel } from '../utils/hexMath';
import { throttle } from '../utils/throttle';
import { useCombatStore } from '../store/combat';
import { useSettingsStore } from '../store/settings';
import { useToolsStore } from '../store/tools';

export class BoardScene extends Container {
  private unsubCombat?: () => void;
  private app: Application;
  public mapLayer: MapLayer;
  private fow: FogOfWar;
  private tokenLayer: Container;
  private tokens: Map<string, TokenSprite> = new Map();
  public onTokenMove?: (id: string, x: number, y: number) => void;
  public onTokenRightClick?: (id: string, x: number, y: number) => void;
  private selectedTokenId: string | null = null;

  private dragging = false;
  private dragStart = { x: 0, y: 0 };
  private initialScenePos = { x: 0, y: 0 };

  public onPing?: (x: number, y: number) => void;
  private currentTool: string = 'cursor';
  private currentGridSize: number = 50;
  private rulerGraphics: Graphics;
  private rulerText: Text;
  private rulerStartPos: { x: number, y: number } | null = null;
  public onRulerUpdate: ((start: { x: number, y: number } | null, end: { x: number, y: number } | null) => void) | null = null;
  private remoteRulers: Map<string, { graphics: Graphics, text: Text }> = new Map();
  private environmentContainer: Container;

  constructor(app: Application) {
    super();
    this.app = app;

    this.mapLayer = new MapLayer();

    this.fow = new FogOfWar();
    this.tokenLayer = new Container();
    this.tokenLayer.sortableChildren = true;

    this.environmentContainer = new Container();
    this.environmentContainer.sortableChildren = true;
    this.environmentContainer.addChild(this.mapLayer);
    this.environmentContainer.addChild(this.tokenLayer);

    this.rulerGraphics = new Graphics();
    this.rulerGraphics.zIndex = 200;

    this.rulerText = new Text({ text: '', style: { fill: 0xffffff, fontSize: 16, stroke: { color: 0x000000, width: 4 } } });
    this.rulerText.zIndex = 201;
    this.rulerText.visible = false;
    this.rulerText.anchor.set(0.5);

    this.addChild(this.environmentContainer);
    this.addChild(this.rulerGraphics);
    this.addChild(this.rulerText);
    this.addChild(this.fow);
    this.sortableChildren = true;
    this.x = app.screen.width / 2;
    this.y = app.screen.height / 2;

    this.setupInteractivity();

    // ====== SHADERS HAUTE QUALITÉ ======
    // Les filtres adaptatifs sont appliqués après loadMap() via applyQualityFilters()
    // car on a besoin de l'image pour analyser la palette.
    // =====================================

    // Abonnement au store de combat pour les halos visuels
    this.unsubCombat = useCombatStore.subscribe((state) => {
      this.tokens.forEach((token, id) => {
        // Gérer les cas où l'ID de combat est soit characterId soit mapId_characterId
        const isActive = state.isActive && state.activeActorId &&
          (id === state.activeActorId || id.endsWith(`_${state.activeActorId}`) || state.activeActorId.endsWith(`_${id}`));
        token.setActiveTurnEffect(!!isActive);
      });
    });
  }

  private setupInteractivity() {
    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = this.app.screen;

    // Zoom
    this.app.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const scaleFactor = e.deltaY < 0 ? 1.1 : 0.9;

      const rect = this.app.canvas.getBoundingClientRect();
      const worldPos = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };

      const before = this.toLocal(worldPos);
      this.scale.x *= scaleFactor;
      this.scale.y *= scaleFactor;

      // Limit scale (min: 0.1, max: 5)
      if (this.scale.x < 0.1) this.scale.set(0.1);
      if (this.scale.x > 5) this.scale.set(5);

      const after = this.toLocal(worldPos);
      this.x += (after.x - before.x) * this.scale.x;
      this.y += (after.y - before.y) * this.scale.y;

      this.constrainPan();
    });

    // Pan and Tools
    this.app.stage.on('pointerdown', (e) => {
      if (e.target !== this.app.stage && e.target !== this.mapLayer) {
        return;
      }

      if (this.currentTool === 'cursor') {
        this.dragging = true;
        this.dragStart = { x: e.global.x, y: e.global.y };
        this.initialScenePos = { x: this.x, y: this.y };
      } else if (this.currentTool === 'ruler') {
        const pos = this.toLocal(e.global);
        this.rulerStartPos = { x: pos.x, y: pos.y };
        this.rulerGraphics.clear();
        this.rulerText.visible = false;
      } else if (this.currentTool === 'ping') {
        const pos = this.toLocal(e.global);
        const radius = useToolsStore.getState().pingRadius;
        this.triggerPing(pos.x, pos.y, radius, 0x4FA4B8);
        if (this.onPing) this.onPing(pos.x, pos.y);
      }
    });

    this.app.stage.on('pointermove', (e) => {
      if (this.currentTool === 'cursor') {
        if (!this.dragging) return;
        const dx = e.global.x - this.dragStart.x;
        const dy = e.global.y - this.dragStart.y;
        this.x = this.initialScenePos.x + dx;
        this.y = this.initialScenePos.y + dy;
        this.constrainPan();
      } else if (this.currentTool === 'ruler') {
        if (!this.rulerStartPos) return;
        const pos = this.toLocal(e.global);

        this.rulerGraphics.clear();
        this.rulerGraphics.moveTo(this.rulerStartPos.x, this.rulerStartPos.y);
        this.rulerGraphics.lineTo(pos.x, pos.y);
        this.rulerGraphics.stroke({ color: 0x4FA4B8, width: 4, alpha: 0.8 });

        this.rulerGraphics.circle(this.rulerStartPos.x, this.rulerStartPos.y, 6).fill(0x4FA4B8);
        this.rulerGraphics.circle(pos.x, pos.y, 6).fill(0x4FA4B8);

        const hexSize = this.currentGridSize / 2;
        const startPosHex = pixelToHex(this.rulerStartPos.x, this.rulerStartPos.y, hexSize);
        const endPosHex = pixelToHex(pos.x, pos.y, hexSize);
        const startHex = hexRound(startPosHex.q, startPosHex.r);
        const endHex = hexRound(endPosHex.q, endPosHex.r);
        const distanceCases = Math.max(
          Math.abs(startHex.q - endHex.q),
          Math.abs(startHex.r - endHex.r),
          Math.abs((startHex.s || (-startHex.q - startHex.r)) - (endHex.s || (-endHex.q - endHex.r)))
        );

        this.rulerText.text = `${distanceCases} cases`;
        this.rulerText.x = (this.rulerStartPos.x + pos.x) / 2;
        this.rulerText.y = (this.rulerStartPos.y + pos.y) / 2 - 15;
        this.rulerText.visible = true;

        if (this.onRulerUpdate) {
          this.onRulerUpdate(this.rulerStartPos, pos);
        }
      }
    });

    const onPointerUp = () => {
      this.dragging = false;
      if (this.currentTool === 'ruler') {
        this.rulerStartPos = null;
        // On ne clear pas la règle pour qu'elle reste affichée jusqu'à nouvel ordre !
      }
    };

    this.app.stage.on('pointerup', onPointerUp);
    this.app.stage.on('pointerupoutside', onPointerUp);

    // Keyboard (ZQSD)
    window.addEventListener('keydown', this.handleKeyDown);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this.selectedTokenId) return;
    const token = this.tokens.get(this.selectedTokenId);
    // On ne bouge que si on a la permission
    if (!token || (!token.isOwned && !token.isMJ)) return;

    // Éviter de capturer si l'utilisateur tape dans un input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

    let dx = 0;
    let dy = 0;
    const grid = token.gridSize || 50;
    const hexSize = grid / 2;

    const key = e.key.toLowerCase();
    const { keybindings } = useSettingsStore.getState();

    if (keybindings.moveUp.includes(key)) dy = -hexSize * 1.5;
    else if (keybindings.moveDown.includes(key)) dy = hexSize * 1.5;
    else if (keybindings.moveLeft.includes(key)) dx = -hexSize * Math.sqrt(3);
    else if (keybindings.moveRight.includes(key)) dx = hexSize * Math.sqrt(3);
    else return;

    if (dx !== 0 || dy !== 0) {
      e.preventDefault();
      let targetX = token.x + dx;
      let targetY = token.y + dy;

      if (!e.shiftKey && grid > 0) {
        const hex = pixelToHex(targetX, targetY, hexSize);
        const rounded = hexRound(hex.q, hex.r);
        const center = hexToPixel(rounded.q, rounded.r, hexSize);
        targetX = center.x;
        targetY = center.y;
      }

      token.moveTo(targetX, targetY, true); // Immediate
      if (this.onTokenMove) {
        this.onTokenMove(token.id, targetX, targetY);
      }
    }
  };

  private constrainPan() {
    const bounds = this.mapLayer.getMapBounds();
    if (bounds.width === 0 || bounds.height === 0) return;

    const scaledWidth = bounds.width * this.scale.x;
    const scaledHeight = bounds.height * this.scale.y;

    const screenW = this.app.screen.width;
    const screenH = this.app.screen.height;

    // Contrainte Horizontale
    if (scaledWidth > screenW) {
      const minX = screenW - scaledWidth / 2;
      const maxX = scaledWidth / 2;
      this.x = Math.max(minX, Math.min(maxX, this.x));
    } else {
      const minX = scaledWidth / 2;
      const maxX = screenW - scaledWidth / 2;
      this.x = Math.max(minX, Math.min(maxX, this.x));
    }

    // Contrainte Verticale
    if (scaledHeight > screenH) {
      const minY = screenH - scaledHeight / 2;
      const maxY = scaledHeight / 2;
      this.y = Math.max(minY, Math.min(maxY, this.y));
    } else {
      const minY = scaledHeight / 2;
      const maxY = screenH - scaledHeight / 2;
      this.y = Math.max(minY, Math.min(maxY, this.y));
    }
  }

  public setGridSize(size: number) {
    this.currentGridSize = size;
    this.mapLayer.setGridSize(size);
    this.tokens.forEach(t => t.gridSize = size);
  }

  /**
   * Applique les filtres haute qualité adaptatifs sur la scène.
   * Passe l'image source à l'analyseur de palette si disponible.
   */
  public async applyQualityFilters(img: HTMLImageElement | null = null, overridePalette?: PaletteAnalysis, intensity: 'off' | 'soft' | 'normal' = 'normal'): Promise<void> {
    
    // Nettoyer les anciens filtres pour éviter les fuites de VRAM
    if (this.environmentContainer.filters) {
      if (Array.isArray(this.environmentContainer.filters)) {
        this.environmentContainer.filters.forEach(f => f.destroy());
      } else {
        (this.environmentContainer.filters as any).destroy();
      }
    }
    
    if (intensity === 'off') {
      this.environmentContainer.filters = [];
      return;
    }

    const filters = await buildHighQualityFilters(img, overridePalette, intensity);
    if (filters) {
      this.environmentContainer.filters = filters;
    }
  }

  async loadMap(url: string, format?: string, gridSize: number = 50) {
    // Charger l'image pour l'analyse de palette AVANT de passer à MapLayer
    let imgForAnalysis: HTMLImageElement | null = null;
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve(); // on continue même si ça échoue
        img.src = url;
      });
      if (img.naturalWidth > 0) imgForAnalysis = img;
    } catch {
      // pas bloquant
    }

    await this.mapLayer.loadMap(url, format, gridSize);

    // Appliquer les filtres adaptatifs maintenant qu'on a l'image
    await this.applyQualityFilters(imgForAnalysis);

    // Auto-fit or center
    const imgBounds = this.mapLayer.getImageBounds();
    if (imgBounds.width > 0 && imgBounds.height > 0) {
      const scaleX = this.app.screen.width / imgBounds.width;
      const scaleY = this.app.screen.height / imgBounds.height;
      // On calcule l'échelle pour que l'image couvre tout l'écran (façon object-cover du hub)
      const scale = Math.max(scaleX, scaleY);
      this.scale.set(scale);
      this.x = this.app.screen.width / 2;
      this.y = this.app.screen.height / 2;

      // On s'assure d'appliquer les contraintes dès le départ
      this.constrainPan();
    }
  }

  loadManifest(width: number, height: number, gridSize: number = 50) {
    console.log(`[BoardScene] Loading manifest: ${width}x${height}, grid: ${gridSize}`);
    this.mapLayer.clear();
    this.mapLayer.setMapDimensions(width, height, gridSize);

    // Auto-fit or center
    const screenW = this.app.screen.width;
    const screenH = this.app.screen.height;

    if (width > 0 && height > 0 && screenW > 0) {
      const scaleX = screenW / width;
      const scaleY = screenH / height;

      // On calcule l'échelle pour que l'image s'adapte à l'écran (zoom arrière max)
      // Math.min pour tout voir, Math.max pour couvrir. On prend Math.min par défaut pour le confort.
      const scale = Math.min(scaleX, scaleY, 1.0);
      this.scale.set(scale);

      // On centre la scène (le 0,0 de BoardScene sera au centre de l'écran)
      // Comme MapLayer centre son contenu sur 0,0, ça centre la map.
      this.x = screenW / 2;
      this.y = screenH / 2;

      console.log(`[BoardScene] Scaled to ${scale.toFixed(4)} and centered at ${this.x},${this.y}`);

      // On réinitialise la position initiale pour le drag
      this.initialScenePos = { x: this.x, y: this.y };

      // On s'assure de rester dans les clous
      this.constrainPan();
    }

  }

  async paintChunk(chunkId: string, x: number, y: number, data: ArrayBuffer) {
    await this.mapLayer.paintChunk(chunkId, x, y, data);
  }

  init() {
    // Basic setup, maybe load a default map
  }

  addToken(data: TokenData) {
    const existing = this.tokens.get(data.id);
    if (existing) {
      console.log('[BoardScene] Updating existing token:', data.name);
      existing.updateData(data); // Met à jour l'image si elle vient d'arriver
      if (!isNaN(data.x) && !isNaN(data.y)) {
        existing.moveTo(data.x, data.y);
      }
      return;
    }

    console.log('[BoardScene] Adding token:', data.name, 'at', data.x, data.y);

    // ✅ Optimisation : Throttle des mouvements pour éviter de saturer le réseau
    const throttledMove = throttle((x: number, y: number) => {
      if (this.onTokenMove) this.onTokenMove(data.id, x, y);
    }, 33);

    const token = new TokenSprite(data, this.app, throttledMove);
    token.gridSize = this.mapLayer.getGridSize();

    // Sélection pour clavier
    token.on('pointerdown', () => {
      this.selectedTokenId = data.id;
    });

    token.onRightClickCallback = (x: number, y: number) => {
      console.log('[BoardScene] onRightClickCallback déclenché pour', data.id, 'onTokenRightClick présent ?', !!this.onTokenRightClick);
      if (this.onTokenRightClick) this.onTokenRightClick(data.id, x, y);
    };

    this.tokens.set(data.id, token);
    this.tokenLayer.addChild(token);
  }

  removeToken(id: string) {
    const token = this.tokens.get(id);
    if (token) {
      this.tokenLayer.removeChild(token);
      token.destroy();
      this.tokens.delete(id);
    }
  }

  clearTokens() {
    console.log('[BoardScene] Clearing all tokens');
    this.tokens.forEach(token => {
      this.tokenLayer.removeChild(token);
      token.destroy();
    });
    this.tokens.clear();
  }

  moveToken(id: string, x: number, y: number) {
    const token = this.tokens.get(id);
    if (token) {
      token.moveTo(x, y);
    }
  }

  setTokenVisibility(id: string, is_hidden: boolean, isMJ: boolean) {
    const token = this.tokens.get(id);
    if (token) {
      token.is_hidden = is_hidden;
      if (is_hidden) {
        token.alpha = 0.4;
        token.visible = isMJ;
      } else {
        token.alpha = 1;
        token.visible = true;
      }
    }
  }

  public getTokenVisibility(id: string) {
    const token = this.tokens.get(id);
    return token ? token.is_hidden : false;
  }

  setControlledToken(id: string | null) {
    this.tokens.forEach((token, tokenId) => {
      token.zIndex = (tokenId === id) ? 100 : 1;
    });
  }

  public setTool(tool: string) {
    if (this.currentTool === tool) return;
    this.currentTool = tool;

    // Clear the ruler when switching tools
    if (tool !== 'ruler') {
      this.rulerGraphics.clear();
      this.rulerText.visible = false;
      if (this.onRulerUpdate) {
        this.onRulerUpdate(null, null);
      }
    }
  }

  public triggerPing(x: number, y: number, targetRadiusCases: number = 1, color: number = 0x4FA4B8) {
    const pingGfx = new Graphics();
    pingGfx.x = x;
    pingGfx.y = y;
    pingGfx.zIndex = 200;
    this.addChild(pingGfx);

    const targetRadiusPx = targetRadiusCases * this.currentGridSize;
    let radius = 0;
    let alpha = 1;

    const tickerFn = (ticker: Ticker) => {
      // Vitesse d'expansion proportionnelle à la taille finale pour garder une animation nerveuse
      const speed = Math.max(200, targetRadiusPx * 2);
      radius += speed * ticker.deltaTime * 0.01;
      alpha -= 0.02 * ticker.deltaTime;

      if (alpha <= 0) {
        this.app.ticker.remove(tickerFn);
        pingGfx.destroy();
        return;
      }

      const safeAlpha = Math.max(0, alpha);
      const currentRadius = Math.min(radius, targetRadiusPx * 1.5); // Limite visuelle avant fade out

      pingGfx.clear();

      // Hexagon Draw
      const sides = 6;
      const coords = [];
      for (let i = 0; i < sides; i++) {
        const angle = (i * Math.PI) / 3;
        // Rotation offset de PI/6 pour avoir l'hexagone pointant vers le haut
        const rotatedAngle = angle + Math.PI / 6;
        coords.push(currentRadius * Math.cos(rotatedAngle), currentRadius * Math.sin(rotatedAngle));
      }

      if (coords.length > 0) {
        pingGfx.poly(coords).stroke({ color: color, width: 4, alpha: safeAlpha });
        // Remplissage léger
        pingGfx.poly(coords).fill({ color: color, alpha: safeAlpha * 0.1 });
      }

      // Inner center
      pingGfx.circle(0, 0, 6).fill({ color: color, alpha: safeAlpha });
    };

    this.app.ticker.add(tickerFn);
  }

  public updateRemoteRuler(peerId: string, start: { x: number, y: number } | null, end: { x: number, y: number } | null, color: number = 0xD2D7DF) {
    let ruler = this.remoteRulers.get(peerId);

    if (!start || !end) {
      if (ruler) {
        ruler.graphics.destroy();
        ruler.text.destroy();
        this.remoteRulers.delete(peerId);
      }
      return;
    }

    if (!ruler) {
      const graphics = new Graphics();
      graphics.zIndex = 199; // Juste sous la règle locale
      const text = new Text({ text: '', style: { fill: color, fontSize: 14, stroke: { color: 0x000000, width: 3 } } });
      text.zIndex = 199;
      text.anchor.set(0.5);

      this.addChild(graphics);
      this.addChild(text);
      ruler = { graphics, text };
      this.remoteRulers.set(peerId, ruler);
    }

    ruler.graphics.clear();
    ruler.graphics.moveTo(start.x, start.y);
    ruler.graphics.lineTo(end.x, end.y);
    ruler.graphics.stroke({ color: color, width: 3, alpha: 0.6 });

    ruler.graphics.circle(start.x, start.y, 5).fill(color);
    ruler.graphics.circle(end.x, end.y, 5).fill(color);

    const hexSize = this.currentGridSize / 2;
    const startPosHex = pixelToHex(start.x, start.y, hexSize);
    const endPosHex = pixelToHex(end.x, end.y, hexSize);
    const startHex = hexRound(startPosHex.q, startPosHex.r);
    const endHex = hexRound(endPosHex.q, endPosHex.r);
    const distanceCases = Math.max(
      Math.abs(startHex.q - endHex.q),
      Math.abs(startHex.r - endHex.r),
      Math.abs((startHex.s || (-startHex.q - startHex.r)) - (endHex.s || (-endHex.q - endHex.r)))
    );

    ruler.text.text = `${distanceCases} cases`;
    ruler.text.x = (start.x + end.x) / 2;
    ruler.text.y = (start.y + end.y) / 2 - 15;
    ruler.text.visible = true;
  }

  zoomToToken(id: string) {
    const token = this.tokens.get(id);
    if (!token) return;

    const scale = 1.5;
    this.scale.set(scale);

    const screenW = this.app.screen.width;
    const screenH = this.app.screen.height;

    this.x = screenW / 2 - (token.x * scale);
    this.y = screenH / 2 - (token.y * scale);

    this.constrainPan();
  }

  override destroy(options?: any) {
    if (this.unsubCombat) this.unsubCombat();
    window.removeEventListener('keydown', this.handleKeyDown);
    super.destroy(options);
  }
}