import { Container, Graphics, Text, TextStyle, FederatedPointerEvent, Sprite, Texture, Application } from 'pixi.js';

export interface TokenData {
  id: string;
  name: string;
  x: number;
  y: number;
  image_url?: string;
  color?: string;
}

export class TokenSprite extends Container {
  private bgGraphics: Graphics;
  private labelText: Text;
  private idText: Text;
  private sprite: Sprite | null = null;
  private app: Application;

  constructor(data: TokenData, app: Application, onMove?: (x: number, y: number) => void) {
    super();
    this.app = app;

    console.log(`[TokenSprite] Constructor for: ${data.name} (ID: ${data.id}) at ${data.x},${data.y}`);

    // positionnement initial
    this.x = typeof data.x === 'number' && !isNaN(data.x) ? Math.round(data.x) : 0;
    this.y = typeof data.y === 'number' && !isNaN(data.y) ? Math.round(data.y) : 0;

    this.eventMode = 'static';
    this.cursor = 'pointer';

    // 1. Fond (Toujours visible en premier)
    this.bgGraphics = new Graphics();
    this.drawBg(false);
    this.addChild(this.bgGraphics);

    // 2. Initiales (Base de visibilité)
    const initials = (data.name || '??').substring(0, 2).toUpperCase();
    this.idText = new Text({
      text: initials,
      style: new TextStyle({
        fontFamily: 'Cinzel, serif',
        fontSize: 14,
        fill: '#000000',
        fontWeight: 'bold'
      })
    });
    this.idText.anchor.set(0.5);
    this.addChild(this.idText);

    // 3. Label de Nom
    this.labelText = new Text({
      text: data.name || 'Inconnu',
      style: new TextStyle({
        fontFamily: 'Cinzel, serif',
        fontSize: 11,
        fill: '#ffffff',
        stroke: { color: '#000000', width: 3 }
      })
    });
    this.labelText.anchor.set(0.5, 0);
    this.labelText.y = 22;
    this.addChild(this.labelText);

    // 4. Événements de drag
    this.on('pointerdown', (e) => this.onDragStart(e));

    // 5. Chargement de l'image
    if (data.image_url) {
      this.loadImage(data.image_url);
    }
  }

  private async loadImage(url: string) {
    try {
      const cleanUrl = url.trim();
      if (!cleanUrl) return;

      console.log(`[TokenSprite] Tentative image: ${this.labelText.text}`);

      let finalUrl = cleanUrl;

      // Bypass CORS via proxy Electron
      if (!cleanUrl.startsWith('blob:') && !cleanUrl.startsWith('data:') && window.electronAPI?.fetchImage) {
        const base64 = await window.electronAPI.fetchImage(cleanUrl);
        if (base64) finalUrl = base64;
      }

      // Texture.from est synchrone pour la création de l'objet, asynchrone pour le chargement
      const texture = Texture.from(finalUrl);
      
      // On attend que la texture soit vraiment prête
      if (texture.source.ready) {
          this.applyTexture(texture);
      } else {
          texture.on('update', () => this.applyTexture(texture));
          texture.on('error', (e) => console.warn('[TokenSprite] Texture error:', e));
      }
    } catch (e) {
      console.warn('[TokenSprite] Image failed:', e);
    }
  }

  private applyTexture(texture: Texture) {
    if (this.sprite) return; // Déjà fait

    console.log(`[TokenSprite] Application texture pour ${this.labelText.text}`);
    this.sprite = new Sprite(texture);
    this.sprite.anchor.set(0.5);
    
    const targetSize = 36;
    const scale = Math.max(targetSize / texture.width, targetSize / texture.height);
    this.sprite.scale.set(scale);

    // Masque circulaire
    const mask = new Graphics();
    mask.circle(0, 0, 18).fill(0xffffff);
    this.addChild(mask);
    this.sprite.mask = mask;

    this.addChildAt(this.sprite, 1);
    this.idText.visible = false;
  }

  private drawBg(selected: boolean) {
    this.bgGraphics.clear();
    this.bgGraphics
      .circle(0, 0, 20)
      .fill(selected ? 0xF0C040 : 0xD4A017)
      .stroke({ color: selected ? 0xFFFFFF : 0xB8860B, width: 2 });
  }

  private dragging = false;
  private dragOffset = { x: 0, y: 0 };
  private onMoveCallback?: (x: number, y: number) => void;

  private onDragStart(event: FederatedPointerEvent) {
    this.dragging = true;
    this.setSelected(true);
    this.alpha = 0.8;
    const pos = event.getLocalPosition(this.parent);
    this.dragOffset = { x: this.x - pos.x, y: this.y - pos.y };

    const stage = this.app.stage;
    stage.on('pointermove', this.onDragMove, this);
    stage.on('pointerup', this.onDragEnd, this);
    stage.on('pointerupoutside', this.onDragEnd, this);
  }

  private onDragMove(event: FederatedPointerEvent) {
    if (this.dragging && this.parent) {
      const newPosition = this.parent.toLocal(event.global);
      this.x = Math.round(newPosition.x + this.dragOffset.x);
      this.y = Math.round(newPosition.y + this.dragOffset.y);
    }
  }

  private onDragEnd() {
    if (this.dragging) {
      this.dragging = false;
      this.setSelected(false);
      this.alpha = 1;
      
      const stage = this.app.stage;
      if (stage) {
          stage.off('pointermove', this.onDragMove);
          stage.off('pointerup', this.onDragEnd);
          stage.off('pointerupoutside', this.onDragEnd);
      }

      if (this.onMoveCallback) {
        this.onMoveCallback(Math.round(this.x), Math.round(this.y));
      }
    }
  }

  moveTo(x: number, y: number) {
    this.x = isNaN(x) ? this.x : Math.round(x);
    this.y = isNaN(y) ? this.y : Math.round(y);
  }

  setSelected(bool: boolean) {
    this.drawBg(bool);
  }
}