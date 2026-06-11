import { Container, Graphics, Ticker } from 'pixi.js';
import { hexToPixel, getHexCorners } from '../utils/hexMath';

interface Raindrop {
  x: number;
  y: number;
  length: number;
  speed: number;
  alpha: number;
}

interface RainCluster {
  boundingBox: { minX: number, maxX: number, minY: number, maxY: number };
  spawnMinX: number;
  spawnMaxX: number;
  drops: Raindrop[];
}

const HEX_DIRECTIONS = [
  { dq: 1, dr: 0 }, { dq: 1, dr: -1 }, { dq: 0, dr: -1 },
  { dq: -1, dr: 0 }, { dq: -1, dr: 1 }, { dq: 0, dr: 1 }
];

export class RainOverlayLayer extends Container {
  private rainCells: Set<string> = new Set();
  private currentGridSize: number = 50;
  
  private maskGraphics: Graphics;
  private rainGraphics: Graphics;
  private clusters: RainCluster[] = [];
  private ticker: Ticker;

  constructor(ticker: Ticker) {
    super();
    this.ticker = ticker;

    this.maskGraphics = new Graphics();
    this.rainGraphics = new Graphics();

    // The rainGraphics will be masked by maskGraphics
    this.addChild(this.maskGraphics);
    this.addChild(this.rainGraphics);
    this.rainGraphics.mask = this.maskGraphics;

    // Start animation loop
    this.ticker.add(this.update, this);
  }

  public setGridSize(size: number) {
    this.currentGridSize = size;
    this.rebuildMaskAndBounds();
  }

  public setRainCells(cells: Set<string>) {
    this.rainCells = cells;
    this.rebuildMaskAndBounds();
  }

  public clearAll() {
    this.rainCells.clear();
    this.rebuildMaskAndBounds();
  }

  private rebuildMaskAndBounds() {
    this.maskGraphics.clear();
    this.clusters = [];

    if (this.rainCells.size === 0) {
      this.rainGraphics.clear();
      return;
    }

    const size = this.currentGridSize / 2;

    // 1. Trouver les groupes (clusters) de cases connectées
    const unvisited = new Set(this.rainCells);
    const cellClusters: Set<string>[] = [];

    while (unvisited.size > 0) {
      const startKey = unvisited.values().next().value;
      unvisited.delete(startKey);

      const cluster = new Set<string>();
      cluster.add(startKey);
      const queue = [startKey];

      while (queue.length > 0) {
        const current = queue.shift()!;
        const [qStr, rStr] = current.split(',');
        const q = parseInt(qStr, 10);
        const r = parseInt(rStr, 10);

        for (const dir of HEX_DIRECTIONS) {
          const nKey = `${q + dir.dq},${r + dir.dr}`;
          if (unvisited.has(nKey)) {
            unvisited.delete(nKey);
            cluster.add(nKey);
            queue.push(nKey);
          }
        }
      }
      cellClusters.push(cluster);
    }

    // 2. Traiter chaque cluster
    for (const clusterCells of cellClusters) {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

      clusterCells.forEach(key => {
        const [qStr, rStr] = key.split(',');
        const q = parseInt(qStr, 10);
        const r = parseInt(rStr, 10);

        const center = hexToPixel(q, r, size);
        const corners = getHexCorners(center.x, center.y, size);

        const pts: number[] = [];
        for (let i = 0; i < 12; i++) pts.push(corners[i]);

        // Dessiner dans le masque global
        this.maskGraphics.poly(pts).fill({ color: 0xFFFFFF, alpha: 1 });

        // Calculer les limites du cluster
        for (let i = 0; i < 12; i += 2) {
          if (corners[i] < minX) minX = corners[i];
          if (corners[i] > maxX) maxX = corners[i];
          if (corners[i+1] < minY) minY = corners[i+1];
          if (corners[i+1] > maxY) maxY = corners[i+1];
        }
      });

      const cellCount = clusterCells.size;
      const density = 0.015;
      const area = (maxX - minX) * (maxY - minY);
      const dropCount = Math.min(Math.floor(area * density), 1000); // 1000 max par cluster

      // Dérive du vent
      const windFactor = 0.15;
      const drift = (maxY - minY) * windFactor;
      const spawnMinX = minX;
      const spawnMaxX = maxX + drift;

      // Calcul de la vitesse basé sur la taille du cluster
      let intensity = 1.0;
      if (cellCount <= 5) {
        intensity = 0.3; // Bruine très lente
      } else if (cellCount <= 15) {
        intensity = 0.3 + ((cellCount - 5) / 10) * 0.7; // Transition (0.3 à 1.0)
      } else if (cellCount <= 35) {
        intensity = 1.0 + ((cellCount - 15) / 20) * 0.8; // Classique vers rapide (1.0 à 1.8)
      } else {
        intensity = Math.min(1.8 + ((cellCount - 35) / 30) * 1.2, 3.0); // Tempête (max 3.0)
      }

      const clusterDrops: Raindrop[] = [];
      for (let i = 0; i < dropCount; i++) {
        // Vitesse de base ralentie considérablement (ex: 8px/frame * intensity)
        const baseSpeed = 6 + Math.random() * 4; // 6 à 10
        const speed = baseSpeed * intensity;

        clusterDrops.push({
          x: spawnMinX + Math.random() * (spawnMaxX - spawnMinX),
          y: minY + Math.random() * (maxY - minY),
          length: speed * (1.2 + Math.random() * 0.5), // Longueur de goutte
          speed: speed,
          alpha: 0.2 + Math.random() * 0.3
        });
      }

      this.clusters.push({
        boundingBox: { minX, maxX, minY, maxY },
        spawnMinX,
        spawnMaxX,
        drops: clusterDrops
      });
    }
  }

  private update = () => {
    if (this.clusters.length === 0) return;

    const windFactor = 0.15;
    this.rainGraphics.clear();

    for (const cluster of this.clusters) {
      // Move drops
      for (const drop of cluster.drops) {
        drop.y += drop.speed;
        drop.x -= drop.speed * windFactor;
        
        if (drop.y > cluster.boundingBox.maxY) {
          drop.y = cluster.boundingBox.minY - drop.length;
          drop.x = cluster.spawnMinX + Math.random() * (cluster.spawnMaxX - cluster.spawnMinX);
        }

        // Draw
        this.rainGraphics.moveTo(drop.x, drop.y);
        this.rainGraphics.lineTo(drop.x - drop.length * windFactor, drop.y + drop.length);
        this.rainGraphics.stroke({ color: 0x93C5FD, alpha: drop.alpha, width: 1.5 });
      }
    }
  };

  public destroy(options?: any) {
    this.ticker.remove(this.update, this);
    super.destroy(options);
  }
}
