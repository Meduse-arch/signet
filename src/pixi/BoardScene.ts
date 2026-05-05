import { Application, Container } from 'pixi.js';
import { MapLayer } from './MapLayer';
import { FogOfWar } from './FogOfWar';
import { TokenSprite, TokenData } from './TokenSprite';

export class BoardScene extends Container {
  private app: Application;
  private mapLayer: MapLayer;
  private fow: FogOfWar;
  private tokens: Map<string, TokenSprite> = new Map();
  public onTokenMove?: (id: string, x: number, y: number) => void;

  constructor(app: Application) {
    super();
    this.app = app;

    this.mapLayer = new MapLayer();
    this.addChild(this.mapLayer);

    this.fow = new FogOfWar();
    this.addChild(this.fow);

    // Center the board
    this.x = app.screen.width / 2;
    this.y = app.screen.height / 2;
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