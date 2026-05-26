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
  private onMoveCallback?: (x: number, y: number) => void;

  constructor(data: TokenData, app: Application, onMove?: (x: number, y: number) => void) {
    super();
    this.app = app;
    this.onMoveCallback = onMove;

    console.log(`[TokenSprite] Init: ${data.name} (ID: ${data.id}) at ${data.x},${data.y}`);

    this.x = Number(data.x) || 0;
    this.y = Number(data.y) || 0;

    this.eventMode = 'static';
    this.cursor = 'pointer';

    // 1. Fond doré (Immédiat)
    this.bgGraphics = new Graphics();
    this.drawBg(false);
    this.addChild(this.bgGraphics);

    // 2. Initiales (Immédiat)
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

    this.on('pointerdown', (e) => this.onDragStart(e));

    if (data.image_url) {
      this.loadImage(data.image_url);
    }
  }

  private async loadImage(url: string) {
    try {
      const cleanUrl = url.trim();
      if (!cleanUrl) return;

      let finalUrl = cleanUrl;
      if (!cleanUrl.startsWith('blob:') && !cleanUrl.startsWith('data:') && window.electronAPI?.fetchImage) {
        const base64 = await window.electronAPI.fetchImage(cleanUrl);
        if (base64) finalUrl = base64;
      }

      // Bypass total des Pixi Workers pour éviter les erreurs CORS WebGL/Bitmap
      const img = new Image();
      
      // ✅ Sécurité : crossOrigin uniquement pour les URLs distantes réelles
      if (!finalUrl.startsWith('blob:') && !finalUrl.startsWith('data:')) {
          img.crossOrigin = "anonymous";
      }
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = (e) => reject(new Error(`DOM Image load failed for ${finalUrl.substring(0, 30)}...`));
        img.src = finalUrl;
      });

      if (this.destroyed) return;

      // Création de texture DIRECTE (plus sûr que Assets.load pour les URLs dynamiques)
      const texture = Texture.from(img);
      
      this.sprite = new Sprite(texture);
      this.sprite.anchor.set(0.5);
      
      const targetSize = 36;
      const scale = Math.max(targetSize / texture.width, targetSize / texture.height);
      this.sprite.scale.set(scale);

      const mask = new Graphics();
      mask.circle(0, 0, 18).fill(0xffffff);
      this.addChild(mask);
      this.sprite.mask = mask;

      this.addChildAt(this.sprite, 1);
      this.idText.visible = false;

    } catch (e) {
      console.warn(`[TokenSprite] Image failed for ${this.labelText.text}:`, e);
      this.idText.visible = true;
    }
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

  private onDragStart(event: FederatedPointerEvent) {
    this.dragging = true;
    this.setSelected(true);
    this.alpha = 0.8;
    if (!this.parent) return;
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
      if (this.onMoveCallback) {
          this.onMoveCallback(this.x, this.y);
      }
    }
  }

  private onDragEnd() {
    if (this.dragging) {
      this.dragging = false;
      this.setSelected(false);
      this.alpha = 1;
      this.app.stage.off('pointermove', this.onDragMove, this);
      this.app.stage.off('pointerup', this.onDragEnd, this);
      this.app.stage.off('pointerupoutside', this.onDragEnd, this);
    }
  }

  updateData(data: Partial<TokenData>) {
    if (data.image_url && data.image_url !== (this as any)._lastImageUrl) {
        (this as any)._lastImageUrl = data.image_url;
        this.loadImage(data.image_url);
    }
    if (data.name) {
        this.labelText.text = data.name;
        const initials = data.name.substring(0, 2).toUpperCase();
        this.idText.text = initials;
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