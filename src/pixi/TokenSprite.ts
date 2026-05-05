import { Container, Graphics, Text, TextStyle, FederatedPointerEvent } from 'pixi.js';

export interface TokenData {
  id: string;
  name: string;
  x: number;
  y: number;
  color?: string;
}

export class TokenSprite extends Container {
  private bgGraphics: Graphics;
  private labelText: Text;
  private idText: Text;
  
  private dragging = false;
  private onMoveCallback?: (x: number, y: number) => void;
  
  constructor(data: TokenData, onMove?: (x: number, y: number) => void) {
    super();
    this.x = data.x;
    this.y = data.y;
    this.onMoveCallback = onMove;

    this.interactive = true;
    this.cursor = 'pointer';

    this.bgGraphics = new Graphics();
    this.drawBg(false);
    this.addChild(this.bgGraphics);

    const initials = data.name.substring(0, 2).toUpperCase();
    this.idText = new Text({
      text: initials,
      style: new TextStyle({
        fontFamily: 'sans-serif',
        fontSize: 16,
        fill: '#0D0D0F',
        fontWeight: 'bold'
      })
    });
    this.idText.anchor.set(0.5);
    this.addChild(this.idText);

    this.labelText = new Text({
      text: data.name,
      style: new TextStyle({
        fontFamily: 'sans-serif',
        fontSize: 12,
        fill: '#e8d5a0'
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

  private drawBg(selected: boolean) {
    this.bgGraphics.clear();
    this.bgGraphics.circle(0, 0, 20);
    this.bgGraphics.fill(selected ? '#F0C040' : '#D4A017');
    
    // Ajout d'un petit contour
    this.bgGraphics.stroke({ color: selected ? '#FFFFFF' : '#B8860B', width: 2 });
  }

  private onDragStart() {
    this.dragging = true;
    this.setSelected(true);
    this.alpha = 0.8;
  }

  private onDragEnd() {
    if (this.dragging) {
      this.dragging = false;
      this.setSelected(false);
      this.alpha = 1;
    }
  }

  private onDragMove(event: FederatedPointerEvent) {
    if (this.dragging && this.parent) {
      const newPosition = event.getLocalPosition(this.parent);
      this.moveTo(newPosition.x, newPosition.y);
      if (this.onMoveCallback) {
        this.onMoveCallback(newPosition.x, newPosition.y);
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