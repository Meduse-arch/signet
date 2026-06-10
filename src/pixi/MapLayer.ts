import { Container, Sprite, Texture, Graphics } from 'pixi.js';
import { pixelToHex, hexToPixel, getHexCorners } from '../utils/hexMath';

export class MapLayer extends Container {
  private mapSprite: Sprite | null = null;
  private gridGraphics: Graphics;
  private chunksContainer: Container;
  private chunkSprites: Map<string, Sprite> = new Map();
  private mapWidth: number = 0;
  private mapHeight: number = 0;
  private currentGridSize: number = 50;

  constructor() {
    super();
    this.chunksContainer = new Container();
    this.addChild(this.chunksContainer);
    
    // Conteneur pour la grille (au-dessus de la map)
    this.gridGraphics = new Graphics();
    this.addChild(this.gridGraphics);
  }

  private drawDynamicGrid(step: number = 50) {
    this.gridGraphics.clear();
    
    let imgWidth = this.mapWidth;
    let imgHeight = this.mapHeight;

    if (this.mapSprite) {
      imgWidth = this.mapSprite.width;
      imgHeight = this.mapSprite.height;
    }

    if (imgWidth === 0 || imgHeight === 0) {
      return;
    }

    // --- GRILLE HEXAGONALE (5% plus grand que l'image) ---
    const gridPaddingX = imgWidth * 0.05;
    const gridPaddingY = imgHeight * 0.05;
    const gridTotalWidth = imgWidth + gridPaddingX;
    const gridTotalHeight = imgHeight + gridPaddingY;

    const minX = -gridTotalWidth / 2;
    const maxX = gridTotalWidth / 2;
    const minY = -gridTotalHeight / 2;
    const maxY = gridTotalHeight / 2;

    // La taille du pas "step" (ex: 50) représente la hauteur totale voulue de l'hexagone.
    // Le rayon "size" de l'hexagone est donc step / 2.
    const size = step / 2;

    const topLeft = pixelToHex(minX, minY, size);
    const bottomRight = pixelToHex(maxX, maxY, size);
    const topRight = pixelToHex(maxX, minY, size);
    const bottomLeft = pixelToHex(minX, maxY, size);

    const minQ = Math.floor(Math.min(topLeft.q, bottomRight.q, topRight.q, bottomLeft.q)) - 1;
    const maxQ = Math.ceil(Math.max(topLeft.q, bottomRight.q, topRight.q, bottomLeft.q)) + 1;
    const minR = Math.floor(Math.min(topLeft.r, bottomRight.r, topRight.r, bottomLeft.r)) - 1;
    const maxR = Math.ceil(Math.max(topLeft.r, bottomRight.r, topRight.r, bottomLeft.r)) + 1;

    // Pixi v8 style
    this.gridGraphics.alpha = 0.15;
    this.gridGraphics.setStrokeStyle({ color: 0xFFFFFF, alpha: 1, width: 1 });

    // Tracer uniquement 3 bords par hexagone (en bas à droite, en bas, en bas à gauche)
    // pour éviter que les lignes se superposent et doublent d'opacité, sauf aux bordures.
    // Pour simplifier on trace tout, l'alpha global du gridGraphics gère l'opacité.
    for (let q = minQ; q <= maxQ; q++) {
      for (let r = minR; r <= maxR; r++) {
        const center = hexToPixel(q, r, size);
        
        // Culling
        if (center.x + size < minX || center.x - size > maxX || center.y + size < minY || center.y - size > maxY) {
          continue;
        }

        const corners = getHexCorners(center.x, center.y, size);
        this.gridGraphics.moveTo(corners[0], corners[1]);
        for (let i = 2; i < 12; i += 2) {
          this.gridGraphics.lineTo(corners[i], corners[i + 1]);
        }
        this.gridGraphics.lineTo(corners[0], corners[1]);
      }
    }
    this.gridGraphics.stroke();
  }

  setGridSize(size: number) {
    this.currentGridSize = size;
    this.drawDynamicGrid(size);
  }

  getGridSize(): number {
    return this.currentGridSize;
  }

  public setMapDimensions(width: number, height: number, gridSize: number = 50) {
    this.mapWidth = width;
    this.mapHeight = height;
    
    // Center the chunks container
    this.chunksContainer.x = -width / 2;
    this.chunksContainer.y = -height / 2;
    
    this.drawDynamicGrid(gridSize);
  }

  public async paintChunk(chunkId: string, x: number, y: number, data: ArrayBuffer) {
    if (this.chunkSprites.has(chunkId)) return;

    try {
      const blob = new Blob([data], { type: 'image/webp' });
      const imgBitmap = await createImageBitmap(blob);
      const texture = Texture.from(imgBitmap);
      const sprite = new Sprite(texture);
      
      sprite.x = x * 512;
      sprite.y = y * 512;
      
      this.chunkSprites.set(chunkId, sprite);
      this.chunksContainer.addChild(sprite);
    } catch (e) {
      console.error(`[MapLayer] Error painting chunk ${chunkId}:`, e);
    }
  }

  async loadMap(url: string, format?: string, gridSize: number = 50): Promise<void> {
    try {
      const cleanUrl = url.trim();
      if (!cleanUrl) return;

      console.log(`[MapLayer] Loading map: ${cleanUrl.substring(0, 50)}...`);

      let finalUrl = cleanUrl;

      // 1. Proxy Electron pour CORS
      if (!cleanUrl.startsWith('blob:') && !cleanUrl.startsWith('data:') && window.electronAPI && window.electronAPI.fetchImage) {
        try {
            const base64 = await window.electronAPI.fetchImage(cleanUrl);
            if (base64) {
                finalUrl = base64;
                console.log('[MapLayer] Proxy success');
            }
        } catch (e) {
            console.warn('[MapLayer] Proxy fail:', e);
        }
      }

      // 2. Bypass total des Pixi Workers pour les images (évite loadImageBitmap crash)
      const img = new Image();
      
      // ✅ Sécurité : crossOrigin uniquement pour les URLs distantes
      if (!finalUrl.startsWith('blob:') && !finalUrl.startsWith('data:')) {
          img.crossOrigin = "anonymous";
      }
      
      await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = () => reject(new Error("Map DOM Image load failed"));
          img.src = finalUrl;
      });

      // 3. Création de texture DIRECTE
      const texture = Texture.from(img);

      if (texture) {
          console.log(`[MapLayer] Texture success: ${texture.width}x${texture.height}`);
          this.clear();
          this.mapSprite = new Sprite(texture);
          this.mapSprite.anchor.set(0.5);
          this.addChildAt(this.mapSprite, 0); 
          this.drawDynamicGrid(gridSize);
      }
    } catch (e) {
      console.error('[MapLayer] Critical load error:', e);
    }
  }

  clear() {
    if (this.mapSprite) {
      this.removeChild(this.mapSprite);
      this.mapSprite.destroy();
      this.mapSprite = null;
    }
    
    this.chunkSprites.forEach(sprite => sprite.destroy());
    this.chunkSprites.clear();
    this.chunksContainer.removeChildren();
    
    this.mapWidth = 0;
    this.mapHeight = 0;
    this.gridGraphics.clear();
  }

  getMapBounds() {
    let w = this.mapWidth;
    let h = this.mapHeight;
    
    if (this.mapSprite) {
      w = this.mapSprite.width;
      h = this.mapSprite.height;
    }

    if (w > 0 && h > 0) {
      const paddingX = w * 0.10;
      const paddingY = h * 0.10;
      return { width: w + paddingX, height: h + paddingY };
    }
    
    return { width: 0, height: 0 };
  }

  getImageBounds() {
    if (this.mapSprite) {
      return { width: this.mapSprite.width, height: this.mapSprite.height };
    }
    return { width: this.mapWidth, height: this.mapHeight };
  }
}