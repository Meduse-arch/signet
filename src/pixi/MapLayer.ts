import { Container, Sprite, Texture, Graphics } from 'pixi.js';

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

    // --- GRILLE (5% plus grand que l'image) ---
    const gridPaddingX = imgWidth * 0.05;
    const gridPaddingY = imgHeight * 0.05;
    const gridTotalWidth = imgWidth + gridPaddingX;
    const gridTotalHeight = imgHeight + gridPaddingY;

    const minX = Math.floor((-gridTotalWidth / 2) / step) * step;
    const maxX = Math.ceil((gridTotalWidth / 2) / step) * step;
    const minY = Math.floor((-gridTotalHeight / 2) / step) * step;
    const maxY = Math.ceil((gridTotalHeight / 2) / step) * step;

    // Pixi v8 style
    this.gridGraphics
      .setStrokeStyle({ color: 0xFFFFFF, alpha: 0.15, width: 1 });

    for (let x = minX; x <= maxX; x += step) {
      this.gridGraphics.moveTo(x, minY);
      this.gridGraphics.lineTo(x, maxY);
    }
    for (let y = minY; y <= maxY; y += step) {
      this.gridGraphics.moveTo(minX, y);
      this.gridGraphics.lineTo(maxX, y);
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