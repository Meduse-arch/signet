import { Container, Sprite, Assets, Graphics } from 'pixi.js';

export class MapLayer extends Container {
  private mapSprite: Sprite | null = null;
  private gridGraphics: Graphics;

  constructor() {
    super();
    this.gridGraphics = new Graphics();
    this.addChild(this.gridGraphics);
    this.drawGrid();
  }

  private drawGrid() {
    this.gridGraphics.clear();
    const size = 2000; // Grand assez pour le zoom/pan
    const step = 50;
    
    this.gridGraphics.setStrokeStyle({ color: 0xFFFFFF, alpha: 0.05, width: 1 });

    for (let i = -size; i <= size; i += step) {
      this.gridGraphics.moveTo(i, -size);
      this.gridGraphics.lineTo(i, size);
      this.gridGraphics.moveTo(-size, i);
      this.gridGraphics.lineTo(size, i);
    }
    this.gridGraphics.stroke();
  }

  async loadMap(url: string): Promise<void> {
    try {
      const texture = await Assets.load(url);
      this.clear();
      this.mapSprite = new Sprite(texture);
      this.mapSprite.anchor.set(0.5);
      this.addChildAt(this.mapSprite, 0); // Sous la grille
    } catch (e) {
      console.error('Failed to load map texture:', e);
    }
  }

  clear() {
    if (this.mapSprite) {
      this.removeChild(this.mapSprite);
      this.mapSprite.destroy();
      this.mapSprite = null;
    }
  }
}