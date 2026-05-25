import { Container, Sprite, Assets, Graphics } from 'pixi.js';

export class MapLayer extends Container {
  private mapSprite: Sprite | null = null;
  private gridGraphics: Graphics;

  constructor() {
    super();
    // Conteneur pour la grille (au-dessus de la map)
    this.gridGraphics = new Graphics();
    this.addChild(this.gridGraphics);
  }

  private drawDynamicGrid(step: number = 50) {
    this.gridGraphics.clear();
    
    if (!this.mapSprite) {
        console.warn('[MapLayer] Missing mapSprite for grid drawing');
        return;
    }

    const imgWidth = this.mapSprite.width;
    const imgHeight = this.mapSprite.height;

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
    this.drawDynamicGrid(size);
  }

  async loadMap(url: string, format?: string, gridSize: number = 50): Promise<void> {
    try {
      const cleanUrl = url.trim();
      if (!cleanUrl) return;

      console.log(`[MapLayer] Loading map: ${cleanUrl.substring(0, 50)}...`);

      let finalUrl = cleanUrl;

      // Proxy Electron pour CORS
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

      // Pixi v8 Load
      const texture = await Assets.load({
          src: finalUrl,
          format: format || 'png',
          loadStrategy: 'image',
          parser: 'loadTextures' // INDISPENSABLE pour les blobs et dataURIs sans extension
      });

      if (texture) {
          console.log(`[MapLayer] Texture success: ${texture.width}x${texture.height}`);
          this.clear();
          this.mapSprite = new Sprite(texture);
          this.mapSprite.anchor.set(0.5);
          this.addChildAt(this.mapSprite, 0); 
          this.drawDynamicGrid(gridSize);
      } else {
          console.error('[MapLayer] Assets.load returned null texture');
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
      this.gridGraphics.clear();
    }
  }

  getMapBounds() {
    if (this.mapSprite) {
      const paddingX = this.mapSprite.width * 0.10;
      const paddingY = this.mapSprite.height * 0.10;
      return { 
        width: this.mapSprite.width + paddingX, 
        height: this.mapSprite.height + paddingY 
      };
    }
    return { width: 0, height: 0 };
  }

  getImageBounds() {
    if (this.mapSprite) {
      return { width: this.mapSprite.width, height: this.mapSprite.height };
    }
    return { width: 0, height: 0 };
  }
}