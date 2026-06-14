import { Container, Graphics, Ticker } from 'pixi.js';
import { hexToPixel, getHexCorners } from '../utils/hexMath';
import { PaintType, PAINT_TYPE_COLORS } from '../store/tools';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  baseAlpha: number;
  seed: number;
  color: number;
  type: PaintType;
}

interface WeatherCluster {
  type: PaintType;
  boundingBox: { minX: number, maxX: number, minY: number, maxY: number };
  spawnMinX: number;
  spawnMaxX: number;
  particles: Particle[];
}

const HEX_DIRECTIONS = [
  { dq: 1, dr: 0 }, { dq: 1, dr: -1 }, { dq: 0, dr: -1 },
  { dq: -1, dr: 0 }, { dq: -1, dr: 1 }, { dq: 0, dr: 1 }
];

export class WeatherOverlayLayer extends Container {
  private weatherCells: Record<string, Set<string>> = {};
  private currentGridSize: number = 50;
  
  private maskGraphics: Graphics;
  private particleGraphics: Graphics;
  private clusters: WeatherCluster[] = [];
  private ticker: Ticker;
  private time: number = 0;

  constructor(ticker: Ticker) {
    super();
    this.ticker = ticker;

    this.maskGraphics = new Graphics();
    this.particleGraphics = new Graphics();

    // The particleGraphics will be masked by maskGraphics
    this.addChild(this.maskGraphics);
    this.addChild(this.particleGraphics);
    this.particleGraphics.mask = this.maskGraphics;

    // Start animation loop
    this.ticker.add(this.update, this);
  }

  public setGridSize(size: number) {
    this.currentGridSize = size;
    this.rebuildMaskAndBounds();
  }

  public setWeatherCells(cellsMap: Record<string, Set<string>>) {
    this.weatherCells = cellsMap;
    this.rebuildMaskAndBounds();
  }

  public clearAll() {
    this.weatherCells = {};
    this.rebuildMaskAndBounds();
  }

  private rebuildMaskAndBounds() {
    this.maskGraphics.clear();
    this.clusters = [];

    let hasAnyCells = false;
    for (const type in this.weatherCells) {
      if (this.weatherCells[type].size > 0) hasAnyCells = true;
    }

    if (!hasAnyCells) {
      this.particleGraphics.clear();
      return;
    }

    const size = this.currentGridSize / 2;

    for (const [typeStr, cells] of Object.entries(this.weatherCells)) {
      const type = typeStr as PaintType;
      if (cells.size === 0) continue;

      // 1. Trouver les groupes (clusters) de cases connectées pour ce type
      const unvisited = new Set(cells);
      const cellClusters: Set<string>[] = [];

      while (unvisited.size > 0) {
        const startKey = unvisited.values().next().value;
        if (!startKey) break;
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
        const area = (maxX - minX) * (maxY - minY);
        
        this.generateParticlesForCluster(type, cellCount, area, minX, maxX, minY, maxY);
      }
    }
  }

  private generateParticlesForCluster(type: PaintType, cellCount: number, area: number, minX: number, maxX: number, minY: number, maxY: number) {
    let density = 0.01;
    let spawnMinX = minX;
    let spawnMaxX = maxX;
    let windFactor = 0;
    
    // Déterminer l'intensité en fonction du nombre de cases (pour les effets qui le supportent)
    let intensity = 1.0;
    if (cellCount <= 5) {
      intensity = 0.3; // Léger
    } else if (cellCount <= 15) {
      intensity = 0.3 + ((cellCount - 5) / 10) * 0.7; // Transition vers normal
    } else if (cellCount <= 35) {
      intensity = 1.0 + ((cellCount - 15) / 20) * 0.8; // Normal vers fort
    } else {
      intensity = Math.min(1.8 + ((cellCount - 35) / 30) * 1.2, 3.0); // Fort (max 3.0)
    }

    // Configurer la densité et le vent en fonction du type
    if (type === 'rain') {
      density = 0.015;
      windFactor = 0.15;
      spawnMaxX = maxX + (maxY - minY) * windFactor;
    } else if (type === 'snow') {
      density = 0.01;
      intensity = 1.0; // La neige a une vitesse constante (le vent ne change pas la vitesse de chute de base)
    } else if (type === 'sand') {
      density = 0.02 * intensity; // Tempête de sable très dense si bcp de cases
      windFactor = 1.0; // Totalement horizontal
    } else if (type === 'poison') {
      density = 0.005; // Grosses bulles, donc moins de densité
    } else if (type === 'fire') {
      density = 0.015 * intensity; // Plus il y a de cases, plus il y a de feu
    } else if (type === 'magic') {
      density = 0.008; // Léger
    }

    const dropCount = Math.min(Math.floor(area * density), 2000);
    const colorHex = parseInt(PAINT_TYPE_COLORS[type].replace('#', '0x'), 16);
    const particles: Particle[] = [];

    for (let i = 0; i < dropCount; i++) {
      let vx = 0;
      let vy = 0;
      let size = 0;
      let alpha = 0.5;

      if (type === 'rain') {
        const baseSpeed = 6 + Math.random() * 4;
        vy = baseSpeed * intensity;
        vx = -vy * windFactor;
        size = vy * (1.2 + Math.random() * 0.5);
        alpha = 0.2 + Math.random() * 0.3;
      } else if (type === 'snow') {
        vy = 1 + Math.random() * 2;
        size = 2 + Math.random() * 3;
        alpha = 0.4 + Math.random() * 0.5;
      } else if (type === 'sand') {
        vx = (15 + Math.random() * 15) * intensity;
        vy = 0;
        size = vx * (0.8 + Math.random() * 0.4);
        alpha = 0.1 + Math.random() * 0.3;
      } else if (type === 'poison') {
        vx = -0.5 + Math.random() * 1;
        vy = -0.5 + Math.random() * 1;
        size = 15 + Math.random() * 30;
        alpha = 0.1 + Math.random() * 0.2;
      } else if (type === 'fire') {
        vy = -(3 + Math.random() * 5) * Math.min(intensity, 2.0); // Monte
        vx = -1 + Math.random() * 2;
        size = 3 + Math.random() * 6;
        alpha = 0.4 + Math.random() * 0.6;
      } else if (type === 'magic') {
        vy = -(0.5 + Math.random() * 1.5);
        vx = 0;
        size = 1.5 + Math.random() * 2.5;
        alpha = 0.3 + Math.random() * 0.7;
      }

      particles.push({
        x: spawnMinX + Math.random() * (spawnMaxX - spawnMinX),
        y: minY + Math.random() * (maxY - minY),
        vx, vy, size, alpha, baseAlpha: alpha,
        seed: Math.random() * Math.PI * 2,
        color: colorHex,
        type
      });
    }

    this.clusters.push({
      type,
      boundingBox: { minX, maxX, minY, maxY },
      spawnMinX,
      spawnMaxX,
      particles
    });
  }

  private update = () => {
    if (this.clusters.length === 0) return;

    this.time += 0.05;
    this.particleGraphics.clear();

    for (const cluster of this.clusters) {
      for (const p of cluster.particles) {
        
        // --- PHYSIQUE ---
        if (cluster.type === 'rain') {
          p.x += p.vx;
          p.y += p.vy;
        } else if (cluster.type === 'snow') {
          p.y += p.vy;
          p.x += Math.sin(this.time + p.seed) * 0.5;
        } else if (cluster.type === 'sand') {
          p.x += p.vx;
        } else if (cluster.type === 'poison') {
          p.x += p.vx;
          p.y += p.vy;
          p.alpha = p.baseAlpha + Math.sin(this.time * 0.5 + p.seed) * 0.1;
        } else if (cluster.type === 'fire') {
          p.y += p.vy;
          p.x += Math.sin(this.time * 2 + p.seed) * 1.5;
          p.size *= 0.98; // Rétrécit en montant
        } else if (cluster.type === 'magic') {
          p.y += p.vy;
          p.x += Math.sin(this.time * 0.5 + p.seed) * 0.8;
          p.alpha = p.baseAlpha + Math.sin(this.time * 2 + p.seed) * 0.3;
        }

        // --- WRAP AROUND ---
        if (cluster.type === 'rain' || cluster.type === 'snow') {
          if (p.y > cluster.boundingBox.maxY) {
            p.y = cluster.boundingBox.minY - p.size;
            p.x = cluster.spawnMinX + Math.random() * (cluster.spawnMaxX - cluster.spawnMinX);
          }
        } else if (cluster.type === 'sand') {
          if (p.x > cluster.boundingBox.maxX) {
            p.x = cluster.boundingBox.minX - p.size;
            p.y = cluster.boundingBox.minY + Math.random() * (cluster.boundingBox.maxY - cluster.boundingBox.minY);
          }
        } else if (cluster.type === 'poison') {
          if (p.y < cluster.boundingBox.minY) p.y = cluster.boundingBox.maxY + p.size;
          if (p.y > cluster.boundingBox.maxY) p.y = cluster.boundingBox.minY - p.size;
          if (p.x < cluster.boundingBox.minX) p.x = cluster.boundingBox.maxX + p.size;
          if (p.x > cluster.boundingBox.maxX) p.x = cluster.boundingBox.minX - p.size;
        } else if (cluster.type === 'fire') {
          if (p.y < cluster.boundingBox.minY || p.size < 0.5) {
            p.y = cluster.boundingBox.maxY;
            p.x = cluster.spawnMinX + Math.random() * (cluster.spawnMaxX - cluster.spawnMinX);
            p.size = 3 + Math.random() * 6; // reset size
          }
        } else if (cluster.type === 'magic') {
          if (p.y < cluster.boundingBox.minY) {
            p.y = cluster.boundingBox.maxY;
            p.x = cluster.spawnMinX + Math.random() * (cluster.spawnMaxX - cluster.spawnMinX);
          }
        }

        // --- DESSIN ---
        if (cluster.type === 'rain') {
          this.particleGraphics.moveTo(p.x, p.y);
          this.particleGraphics.lineTo(p.x + p.vx * 0.5, p.y + p.size);
          this.particleGraphics.stroke({ color: p.color, alpha: Math.max(0, p.alpha), width: 1.5 });
        } else if (cluster.type === 'sand') {
          this.particleGraphics.moveTo(p.x, p.y);
          this.particleGraphics.lineTo(p.x + p.size, p.y);
          this.particleGraphics.stroke({ color: p.color, alpha: Math.max(0, p.alpha), width: 2 });
        } else {
          // poison, snow, fire, magic
          this.particleGraphics.circle(p.x, p.y, p.size);
          this.particleGraphics.fill({ color: p.color, alpha: Math.max(0, p.alpha) });
        }
      }
    }
  };

  public destroy(options?: any) {
    this.ticker.remove(this.update, this);
    super.destroy(options);
  }
}
