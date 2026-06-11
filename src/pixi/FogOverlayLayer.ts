import { Container, Graphics } from 'pixi.js';
import { hexToPixel, getHexCorners } from '../utils/hexMath';

/**
 * FogOverlayLayer — Affiché aux JOUEURS uniquement.
 * Reçoit un Set de clés "q,r" correspondant aux cases Brouillard peintes par le MJ
 * et les rend comme un brouillard opaque sombre qui cache le terrain en-dessous.
 */
export class FogOverlayLayer extends Container {
  private fogGraphics: Graphics;
  private wallGraphics: Graphics;
  private fogCells: Set<string> = new Set();
  private wallCells: Set<string> = new Set();
  private currentGridSize: number = 50;

  constructor() {
    super();
    this.fogGraphics = new Graphics();
    this.wallGraphics = new Graphics();
    this.addChild(this.fogGraphics);
    this.addChild(this.wallGraphics);
  }

  public setGridSize(size: number) {
    this.currentGridSize = size;
    this.redraw();
  }

  public setFogCells(cells: Set<string>) {
    this.fogCells = cells;
    this.redraw();
  }

  public setWallCells(cells: Set<string>) {
    this.wallCells = cells;
    this.redraw();
  }

  public clearAll() {
    this.fogCells.clear();
    this.wallCells.clear();
    this.redraw();
  }

  private redraw() {
    this.fogGraphics.clear();
    this.wallGraphics.clear();
    
    const size = this.currentGridSize / 2;

    if (this.fogCells.size > 0) {
      this.fogCells.forEach(key => {
        const [qStr, rStr] = key.split(',');
        const q = parseInt(qStr, 10);
        const r = parseInt(rStr, 10);

        const center = hexToPixel(q, r, size);
        const corners = getHexCorners(center.x, center.y, size);

        const pts: number[] = [];
        for (let i = 0; i < 12; i++) pts.push(corners[i]);

        // Hexagone de brouillard : bleu-nuit dense pour les joueurs
        this.fogGraphics.poly(pts).fill({ color: 0x0B0D1F, alpha: 0.82 });
        // Liseré violet/indigo pour que les contours soient lisibles
        this.fogGraphics.poly(pts).stroke({ color: 0x6366F1, width: 1.5, alpha: 0.35 });
      });
    }

    if (this.wallCells.size > 0) {
      this.wallCells.forEach(key => {
        const [qStr, rStr] = key.split(',');
        const q = parseInt(qStr, 10);
        const r = parseInt(rStr, 10);

        const center = hexToPixel(q, r, size);
        const corners = getHexCorners(center.x, center.y, size);

        const pts: number[] = [];
        for (let i = 0; i < 12; i++) pts.push(corners[i]);

        // Légère indication visuelle des murs invisibles (contours fins noirs)
        this.wallGraphics.poly(pts).stroke({ color: 0x000000, width: 2, alpha: 0.5 });
      });
    }
  }
}
