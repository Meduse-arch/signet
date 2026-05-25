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
    
    if (!this.mapSprite) return;

    const imgWidth = this.mapSprite.width;
    const imgHeight = this.mapSprite.height;

    // --- GRILLE (5% plus grand que l'image) ---
    const gridPaddingX = imgWidth * 0.05;
    const gridPaddingY = imgHeight * 0.05;
    const gridTotalWidth = imgWidth + gridPaddingX;
    const gridTotalHeight = imgHeight + gridPaddingY;

    // Pour que la grille soit centrée avec l'image, on calcule les limites
    const minX = Math.floor((-gridTotalWidth / 2) / step) * step;
    const maxX = Math.ceil((gridTotalWidth / 2) / step) * step;
    const minY = Math.floor((-gridTotalHeight / 2) / step) * step;
    const maxY = Math.ceil((gridTotalHeight / 2) / step) * step;

    this.gridGraphics.setStrokeStyle({ color: 0xFFFFFF, alpha: 0.15, width: 1 });

    // Lignes verticales
    for (let x = minX; x <= maxX; x += step) {
      this.gridGraphics.moveTo(x, minY);
      this.gridGraphics.lineTo(x, maxY);
    }
    // Lignes horizontales
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
      // Pour les Blob URLs (P2P), PixiJS v8 a besoin d'un indice sur le format car l'URL n'a pas d'extension
      const loadOptions = (url.startsWith('blob:') || format) 
        ? { src: url, format: format || 'png', parser: 'loadTextures' } 
        : url;

      const texture = await Assets.load(loadOptions);
      this.clear();
      this.mapSprite = new Sprite(texture);
      this.mapSprite.anchor.set(0.5);
      
      this.addChildAt(this.mapSprite, 0); 
      
      this.drawDynamicGrid(gridSize);
    } catch (e) {
      console.error('Failed to load map texture:', e);
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
      // Les limites de navigation (pan) avec 10% de marge invisible
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