import { Container, Graphics } from 'pixi.js';
import { hexToPixel, getHexCorners } from '../utils/hexMath';

export interface PaintCell {
  color: string;
}

export class PaintLayer extends Container {
  private paintedCells: Map<string, PaintCell> = new Map();
  private hexGraphics: Graphics;
  private hoverGraphics: Graphics;
  private currentGridSize: number = 50;

  constructor() {
    super();
    this.hexGraphics = new Graphics();
    this.hoverGraphics = new Graphics();
    
    this.addChild(this.hexGraphics);
    this.addChild(this.hoverGraphics);
  }

  public setGridSize(size: number) {
    this.currentGridSize = size;
    this.redrawAll();
  }

  public setPaintedCells(cells: Map<string, PaintCell>) {
    this.paintedCells = cells;
    this.redrawAll();
  }

  public setCell(q: number, r: number, color: string) {
    this.paintedCells.set(`${q},${r}`, { color });
    this.redrawAll();
  }

  public clearCell(q: number, r: number) {
    this.paintedCells.delete(`${q},${r}`);
    this.redrawAll();
  }

  public clearAll() {
    this.paintedCells.clear();
    this.redrawAll();
  }

  public getPaintedCells(): Map<string, PaintCell> {
    return this.paintedCells;
  }

  private redrawAll() {
    this.hexGraphics.clear();
    const size = this.currentGridSize / 2;

    this.paintedCells.forEach((cell, key) => {
      const [qStr, rStr] = key.split(',');
      const q = parseInt(qStr, 10);
      const r = parseInt(rStr, 10);

      const center = hexToPixel(q, r, size);
      const corners = getHexCorners(center.x, center.y, size);

      // Build flat [x, y, x, y, ...] array for poly()
      const pts: number[] = [];
      for (let i = 0; i < 12; i++) pts.push(corners[i]);

      const colorNum = parseInt(cell.color.substring(1), 16);

      // Fill semi-transparent
      this.hexGraphics.poly(pts).fill({ color: colorNum, alpha: 0.55 });
      // Bright stroke outline for visibility on any background
      this.hexGraphics.poly(pts).stroke({ color: colorNum, width: 2, alpha: 0.95 });
    });
  }

  public updateHover(q: number, r: number, radius: number, color: string, isEraser: boolean) {
    this.hoverGraphics.clear();
    const size = this.currentGridSize / 2;
    const colorNum = isEraser ? 0xFF4444 : parseInt(color.substring(1), 16);

    const range = radius - 1;
    for (let dq = -range; dq <= range; dq++) {
      for (let dr = Math.max(-range, -dq - range); dr <= Math.min(range, -dq + range); dr++) {
        const hq = q + dq;
        const hr = r + dr;

        const center = hexToPixel(hq, hr, size);
        const corners = getHexCorners(center.x, center.y, size);

        const pts: number[] = [];
        for (let i = 0; i < 12; i++) pts.push(corners[i]);

        // Fond semi-transparent de la couleur courante
        this.hoverGraphics.poly(pts).fill({ color: isEraser ? 0xFF4444 : 0xFFFFFF, alpha: isEraser ? 0.2 : 0.15 });
        // Contour lumineux
        this.hoverGraphics.poly(pts).stroke({ color: colorNum, width: 3, alpha: 0.9 });
      }
    }
  }

  public hideHover() {
    this.hoverGraphics.clear();
  }
}
