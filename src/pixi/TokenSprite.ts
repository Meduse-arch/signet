import { Container, Graphics, Text, TextStyle, FederatedPointerEvent, Sprite, Texture, Assets } from 'pixi.js';

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
  
  constructor(data: TokenData, onMove?: (x: number, y: number) => void) {
    super();
    this.x = data.x;
    this.y = data.y;
    this.onMoveCallback = onMove;

    this.eventMode = 'static';
    this.cursor = 'pointer';

    // Mask for the sprite (circular) - We don't add it as a child if we only use it as a mask
    this.maskGraphics = new Graphics();
    this.maskGraphics.circle(0, 0, 18).fill(0xffffff);
    // Don't addChild(this.maskGraphics) to avoid seeing the white circle

    // Background circle
    this.bgGraphics = new Graphics();
    this.drawBg(false);
    this.addChild(this.bgGraphics);

    // Initials (fallback)
    const initials = data.name.substring(0, 2).toUpperCase();
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
      text: data.name,
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

    // Setup interactions
    this.on('pointerdown', this.onDragStart, this);
    this.on('pointerup', this.onDragEnd, this);
    this.on('pointerupoutside', this.onDragEnd, this);
    this.on('pointermove', this.onDragMove, this);
  }

  private async loadImage(url: string) {
    try {
      console.log('[TokenSprite] Loading image:', url);
      const texture = await Assets.load(url);
      if (this.sprite) {
        this.sprite.texture = texture;
      } else {
        this.sprite = new Sprite(texture);
        this.sprite.anchor.set(0.5);
        this.sprite.width = 36;
        this.sprite.height = 36;
        this.sprite.mask = this.maskGraphics;
        this.addChild(this.maskGraphics); // Must be a child to work as a mask in some Pixi versions/setups
        this.maskGraphics.visible = false; // But we keep it invisible
        this.addChildAt(this.sprite, 1); // Above bg
        
        // Hide initials if image loaded
        this.idText.visible = false;
      }
    } catch (e) {
      console.error('[TokenSprite] Failed to load token image:', e);
    }
  }

  private drawBg(selected: boolean) {
    this.bgGraphics.clear();
    this.bgGraphics.circle(0, 0, 20).fill(selected ? 0xF0C040 : 0xD4A017);
    
    // Gold border
    this.bgGraphics.stroke({ color: selected ? 0xFFFFFF : 0xB8860B, width: 2 });
    
    // Outer glow effect (simplified)
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
  }

  private onDragEnd() {
    if (this.dragging) {
      this.dragging = false;
      this.setSelected(false);
      this.alpha = 1;
      // You could dispatch a final move event here to save to DB
      if (this.onMoveCallback) {
        this.onMoveCallback(this.x, this.y);
      }
    }
  }

  private onDragMove(event: FederatedPointerEvent) {
    if (this.dragging && this.parent) {
      const newPosition = event.getLocalPosition(this.parent);
      this.moveTo(newPosition.x + this.dragOffset.x, newPosition.y + this.dragOffset.y);
      // Real-time update for others
      if (this.onMoveCallback) {
        this.onMoveCallback(this.x, this.y);
      }
    }
  }

  moveTo(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  setSelected(bool: boolean) {
    this.drawBg(bool);
  }
}