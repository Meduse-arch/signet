import { Container, Graphics } from 'pixi.js';

export class FogOfWar extends Container {
  private overlay: Graphics;

  constructor() {
    super();
    this.overlay = new Graphics();
    this.reset();
    this.addChild(this.overlay);
    this.visible = false; // Désactivé par défaut
  }

  reveal(_x: number, _y: number, _radius: number) {
    // In a real app we'd use a RenderTexture or a mask with blend modes.
    // For simplicity, we just redraw the overlay and "cut out" the holes
    // using holes in Graphics or erase blend mode.
  }

  reset() {
    this.overlay.clear();
    this.overlay.rect(-5000, -5000, 10000, 10000);
    this.overlay.fill({ color: 0x000000, alpha: 0.8 });
  }

  setOpacity(value: number) {
    this.overlay.alpha = value;
  }
}