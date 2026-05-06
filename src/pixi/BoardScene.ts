import { Application, Container } from 'pixi.js';
import { MapLayer } from './MapLayer';
import { FogOfWar } from './FogOfWar';
import { TokenSprite, TokenData } from './TokenSprite';

export class BoardScene extends Container {
  private app: Application;
  public mapLayer: MapLayer;
  private fow: FogOfWar;
  private tokens: Map<string, TokenSprite> = new Map();
  public onTokenMove?: (id: string, x: number, y: number) => void;

  private dragging = false;
  private dragStart = { x: 0, y: 0 };
  private initialScenePos = { x: 0, y: 0 };

  constructor(app: Application) {
    super();
    this.app = app;

    this.mapLayer = new MapLayer();
    this.addChild(this.mapLayer);

    this.fow = new FogOfWar();
    this.addChild(this.fow);

    // Center the board by default
    this.x = app.screen.width / 2;
    this.y = app.screen.height / 2;

    this.setupInteractivity();
  }

  private setupInteractivity() {
    this.app.stage.eventMode = 'static';
    // We use a large hitArea so the stage catches events everywhere
    this.app.stage.hitArea = { contains: () => true } as any;

    // Zoom
    this.app.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const scaleFactor = e.deltaY < 0 ? 1.1 : 0.9;
      
      const rect = this.app.canvas.getBoundingClientRect();
      const worldPos = { 
        x: e.clientX - rect.left, 
        y: e.clientY - rect.top 
      };
      
      const before = this.toLocal(worldPos);
      this.scale.x *= scaleFactor;
      this.scale.y *= scaleFactor;
      
      // Limit scale (min: 0.1, max: 5)
      if (this.scale.x < 0.1) this.scale.set(0.1);
      if (this.scale.x > 5) this.scale.set(5);
      
      const after = this.toLocal(worldPos);
      this.x += (after.x - before.x) * this.scale.x;
      this.y += (after.y - before.y) * this.scale.y;

      this.constrainPan();
    });

    // Pan
    this.app.stage.on('pointerdown', (e) => {
      if (e.target !== this.app.stage && e.target !== this.mapLayer) {
        // If clicking on a token or something else, don't pan
        return;
      }
      this.dragging = true;
      this.dragStart = { x: e.global.x, y: e.global.y };
      this.initialScenePos = { x: this.x, y: this.y };
    });

    this.app.stage.on('pointermove', (e) => {
      if (!this.dragging) return;
      const dx = e.global.x - this.dragStart.x;
      const dy = e.global.y - this.dragStart.y;
      this.x = this.initialScenePos.x + dx;
      this.y = this.initialScenePos.y + dy;
      
      this.constrainPan();
    });

    this.app.stage.on('pointerup', () => this.dragging = false);
    this.app.stage.on('pointerupoutside', () => this.dragging = false);
  }

  private constrainPan() {
    const bounds = this.mapLayer.getMapBounds();
    if (bounds.width === 0 || bounds.height === 0) return;

    const scaledWidth = bounds.width * this.scale.x;
    const scaledHeight = bounds.height * this.scale.y;

    const screenW = this.app.screen.width;
    const screenH = this.app.screen.height;

    // Contrainte Horizontale
    if (scaledWidth > screenW) {
      const minX = screenW - scaledWidth / 2;
      const maxX = scaledWidth / 2;
      this.x = Math.max(minX, Math.min(maxX, this.x));
    } else {
      const minX = scaledWidth / 2;
      const maxX = screenW - scaledWidth / 2;
      this.x = Math.max(minX, Math.min(maxX, this.x));
    }

    // Contrainte Verticale
    if (scaledHeight > screenH) {
      const minY = screenH - scaledHeight / 2;
      const maxY = scaledHeight / 2;
      this.y = Math.max(minY, Math.min(maxY, this.y));
    } else {
      const minY = scaledHeight / 2;
      const maxY = screenH - scaledHeight / 2;
      this.y = Math.max(minY, Math.min(maxY, this.y));
    }
  }

  async loadMap(url: string, format?: string) {
    await this.mapLayer.loadMap(url, format);
    
    // Auto-fit or center
    const imgBounds = this.mapLayer.getImageBounds();
    if (imgBounds.width > 0 && imgBounds.height > 0) {
      const scaleX = this.app.screen.width / imgBounds.width;
      const scaleY = this.app.screen.height / imgBounds.height;
      // On calcule l'échelle pour que l'image occupe 85% de l'écran (sans la déformer)
      const scale = Math.min(scaleX, scaleY) * 0.85;
      this.scale.set(scale);
      this.x = this.app.screen.width / 2;
      this.y = this.app.screen.height / 2;
      
      // On s'assure d'appliquer les contraintes dès le départ
      this.constrainPan();
    }
  }

  init() {
    // Basic setup, maybe load a default map
  }

  addToken(data: TokenData) {
    if (this.tokens.has(data.id)) return;
    const token = new TokenSprite(data, (x, y) => {
      if (this.onTokenMove) this.onTokenMove(data.id, x, y);
    });
    this.tokens.set(data.id, token);
    this.addChild(token);
  }

  removeToken(id: string) {
    const token = this.tokens.get(id);
    if (token) {
      this.removeChild(token);
      token.destroy();
      this.tokens.delete(id);
    }
  }

  moveToken(id: string, x: number, y: number) {
    const token = this.tokens.get(id);
    if (token) {
      token.moveTo(x, y);
    }
  }

  override destroy(options?: any) {
    super.destroy(options);
  }
}
