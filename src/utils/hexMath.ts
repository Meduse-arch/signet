export interface HexCoord {
  q: number; // Column
  r: number; // Row
  s?: number; // Cube constraint: q + r + s = 0
}

export interface PixelCoord {
  x: number;
  y: number;
}

/**
 * Convert pixel coordinates to fractional axial coordinates (pointy-top).
 * @param x Pixel X
 * @param y Pixel Y
 * @param size Radius of the hexagon (distance from center to corner)
 */
export function pixelToHex(x: number, y: number, size: number): HexCoord {
  const q = (Math.sqrt(3) / 3 * x - 1 / 3 * y) / size;
  const r = (2 / 3 * y) / size;
  return { q, r };
}

/**
 * Round fractional axial coordinates to nearest hex.
 */
export function hexRound(q: number, r: number): HexCoord {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  let rs = Math.round(s);

  const qDiff = Math.abs(rq - q);
  const rDiff = Math.abs(rr - r);
  const sDiff = Math.abs(rs - s);

  if (qDiff > rDiff && qDiff > sDiff) {
    rq = -rr - rs;
  } else if (rDiff > sDiff) {
    rr = -rq - rs;
  } else {
    rs = -rq - rr;
  }

  return { q: rq, r: rr, s: rs };
}

/**
 * Convert axial coordinates to center pixel coordinates (pointy-top).
 * @param q Axial Q (Column)
 * @param r Axial R (Row)
 * @param size Radius of the hexagon
 */
export function hexToPixel(q: number, r: number, size: number): PixelCoord {
  const x = size * Math.sqrt(3) * (q + r / 2);
  const y = size * 3 / 2 * r;
  return { x, y };
}

/**
 * Get the 6 corners of a pointy-top hexagon.
 * @param cx Center X
 * @param cy Center Y
 * @param size Radius of the hexagon
 */
export function getHexCorners(cx: number, cy: number, size: number): number[] {
  const corners: number[] = [];
  for (let i = 0; i < 6; i++) {
    // Pointy-top hex angle: 30, 90, 150, 210, 270, 330 degrees
    const angle_rad = (Math.PI / 3) * i + (Math.PI / 6);
    corners.push(cx + size * Math.cos(angle_rad));
    corners.push(cy + size * Math.sin(angle_rad));
  }
  return corners;
}
