import { Container, Graphics, Text, TextStyle, FederatedPointerEvent, Sprite, Texture, Assets, Application } from 'pixi.js';

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
  private maskGraphics: Graphics;

  private dragging = false;
  private dragOffset = { x: 0, y: 0 };
  private onMoveCallback?: (x: number, y: number) => void;

  // --- Smoothing / Performance ---
  private targetX: number = 0;
  private targetY: number = 0;
  private app: Application;

  constructor(data: TokenData, app: Application, onMove?: (x: number, y: number) => void) {
    super();
    this.app = app;
    
    // Initialisation sécurisée des positions
    const startX = Math.round(data.x || 0);
    const startY = Math.round(data.y || 0);
    this.x = startX;
    this.y = startY;
    this.targetX = startX;
    this.targetY = startY;
    
    this.onMoveCallback = onMove;

    this.eventMode = 'static';
    this.cursor = 'pointer';

    // ✅ Mask (Circular)
    this.maskGraphics = new Graphics();
    this.maskGraphics.circle(0, 0, 18).fill(0xffffff);
    this.addChild(this.maskGraphics);
    this.maskGraphics.visible = false;

    // Background circle
    this.bgGraphics = new Graphics();
    this.drawBg(false);
    this.addChild(this.bgGraphics);

    // Initials (fallback)
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

    // Load Image if available
    if (data.image_url) {
      this.loadImage(data.image_url);
    }

    // Name Label
    this.labelText = new Text({
      text: data.name || 'Inconnu',
      style: new TextStyle({
        fontFamily: 'Cinzel, serif',
        fontSize: 11,
        fill: '#e8d5a0',
        stroke: { color: '#000000', width: 2 }
      })
    });
    this.labelText.anchor.set(0.5, 0);
    this.labelText.y = 25;
    this.addChild(this.labelText);

    this.on('pointerdown', this.onDragStart, this);
    this.on('pointerup', this.onDragEnd, this);
    this.on('pointerupoutside', this.onDragEnd, this);
    this.on('pointermove', this.onDragMove, this);

    this.app.ticker.add(this.update, this);
  }

  private update() {
    if (!this.dragging) {
        const lerpFactor = 0.15; 
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        
        if (Math.abs(dx) > 0.5) this.x += dx * lerpFactor;
        else this.x = this.targetX;
        
        if (Math.abs(dy) > 0.5) this.y += dy * lerpFactor;
        else this.y = this.targetY;
    }
  }

  private async loadImage(url: string) {
    try {
      const cleanUrl = url.trim();
      if (!cleanUrl) return;

      const texture = await Assets.load({
          src: cleanUrl,
          loadStrategy: 'image',
          format: cleanUrl.startsWith('blob:') ? 'png' : undefined
      });

      if (this.sprite) {
        this.sprite.texture = texture;
      } else {
        this.sprite = new Sprite(texture);
        this.sprite.anchor.set(0.5);

        const targetSize = 36;
        const scale = Math.max(targetSize / texture.width, targetSize / texture.height);
        this.sprite.setSize(texture.width * scale, texture.height * scale);

        // ✅ Application du masque
        this.sprite.mask = this.maskGraphics;
        this.addChildAt(this.sprite, 1);
        this.idText.visible = false;
      }
    } catch (e) {
      console.error('[TokenSprite] Image failed:', e);
      this.idText.visible = true;
    }
  }

  private drawBg(selected: boolean) {
    this.bgGraphics.clear();
    this.bgGraphics.circle(0, 0, 20).fill(selected ? 0xF0C040 : 0xD4A017);
    this.bgGraphics.stroke({ color: selected ? 0xFFFFFF : 0xB8860B, width: 2 });
    if (selected) {
        this.bgGraphics.stroke({ color: 0xF0C040, alpha: 0.5, width: 6 });
    }
  }

  private onDragStart(event: FederatedPointerEvent) {
    this.dragging = true;
    this.setSelected(true);
    this.alpha = 0.8;

    if (this.parent) {
      const pos = event.getLocalPosition(this.parent);
      this.dragOffset = {
        x: this.x - pos.x,
        y: this.y - pos.y
      };
    }

    const stage = this.app.stage;
    if (stage) {
        stage.on('pointermove', this.onDragMove, this);
        stage.on('pointerup', this.onDragEnd, this);
        stage.on('pointerupoutside', this.onDragEnd, this);
    }
  }

  private onDragEnd() {
    if (this.dragging) {
      this.dragging = false;
      this.setSelected(false);
      this.alpha = 1;
      this.targetX = this.x;
      this.targetY = this.y;

      const stage = this.app.stage;
      if (stage) {
          stage.off('pointermove', this.onDragMove, this);
          stage.off('pointerup', this.onDragEnd, this);
          stage.off('pointerupoutside', this.onDragEnd, this);
      }

      if (this.onMoveCallback) {
        this.onMoveCallback(Math.round(this.x), Math.round(this.y));
      }
    }
  }

  private onDragMove(event: FederatedPointerEvent) {
    if (this.dragging && this.parent) {
      const newPosition = this.parent.toLocal(event.global);
      this.targetX = Math.round(newPosition.x + this.dragOffset.x);
      this.targetY = Math.round(newPosition.y + this.dragOffset.y);
      this.x = this.targetX;
      this.y = this.targetY;

      if (this.onMoveCallback) {
        this.onMoveCallback(this.targetX, this.targetY);
      }
    }
  }

  moveTo(x: number, y: number) {
    this.targetX = x;
    this.targetY = y;
  }

  setSelected(bool: boolean) {
    this.drawBg(bool);
  }

  override destroy(options?: any) {
    this.app.ticker.remove(this.update, this);
    super.destroy(options);
  }
}