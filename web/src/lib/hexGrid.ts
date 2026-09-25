// Pointy-top hexagons, offset coordinates, staggeraxis=y, staggerindex=odd
// (matches the original Tiled map convention: odd rows shifted right by half a hex width)

export const HEX_SIZE = 40; // center to corner radius

export function hexWidth(): number {
  return Math.sqrt(3) * HEX_SIZE;
}

export function hexHeight(): number {
  return HEX_SIZE * 2;
}

export function hexToPixel(x: number, y: number): { px: number; py: number } {
  const w = hexWidth();
  const h = hexHeight();
  const vertStep = h * 0.75;
  const px = x * w + (Math.abs(y % 2) === 1 ? w / 2 : 0) + w / 2;
  const py = y * vertStep + h / 2;
  return { px, py };
}

export function pixelToHex(px: number, py: number): { x: number; y: number } {
  const w = hexWidth();
  const h = hexHeight();
  const vertStep = h * 0.75;
  const guessY = Math.round((py - h / 2) / vertStep);
  const guessX = Math.round((px - w / 2 - (Math.abs(guessY % 2) === 1 ? w / 2 : 0)) / w);

  let best = { x: guessX, y: guessY };
  let bestDist = Infinity;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cx = guessX + dx;
      const cy = guessY + dy;
      const { px: cpx, py: cpy } = hexToPixel(cx, cy);
      const dist = (cpx - px) ** 2 + (cpy - py) ** 2;
      if (dist < bestDist) {
        bestDist = dist;
        best = { x: cx, y: cy };
      }
    }
  }
  return best;
}

// Corner points for a pointy-top hex centered at (cx, cy)
// Starts at the top vertex (matches the game engine's HEXAGON_CORNERS convention
// in src/scenario_generate_preview.py) so edge/river indices line up with the
// compiled scenario data.
export function hexCorners(cx: number, cy: number): [number, number][] {
  const corners: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const angleDeg = 60 * i - 90;
    const angleRad = (Math.PI / 180) * angleDeg;
    corners.push([cx + HEX_SIZE * Math.cos(angleRad), cy + HEX_SIZE * Math.sin(angleRad)]);
  }
  return corners;
}

// Edge index 0..5 connects corners[i] -> corners[(i+1)%6]
export function hexEdgeMidpoint(cx: number, cy: number, edge: number): [number, number] {
  const corners = hexCorners(cx, cy);
  const a = corners[edge];
  const b = corners[(edge + 1) % 6];
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

// Edge index -> direction: 0=NE, 1=E, 2=SE, 3=SW, 4=W, 5=NW
// (matches hexCorners' angle-based winding: corners[i]->corners[i+1])
const EVEN_ROW_OFFSETS: [number, number][] = [
  [0, -1], // NE
  [1, 0], // E
  [0, 1], // SE
  [-1, 1], // SW
  [-1, 0], // W
  [-1, -1], // NW
];
const ODD_ROW_OFFSETS: [number, number][] = [
  [1, -1], // NE
  [1, 0], // E
  [1, 1], // SE
  [0, 1], // SW
  [-1, 0], // W
  [0, -1], // NW
];

export function neighborOffset(x: number, y: number, edge: number): { x: number; y: number } {
  const offsets = Math.abs(y % 2) === 1 ? ODD_ROW_OFFSETS : EVEN_ROW_OFFSETS;
  const [dx, dy] = offsets[edge];
  return { x: x + dx, y: y + dy };
}

export function oppositeEdge(edge: number): number {
  return (edge + 3) % 6;
}

export function closestEdge(cx: number, cy: number, px: number, py: number): number {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < 6; i++) {
    const [mx, my] = hexEdgeMidpoint(cx, cy, i);
    const dist = (mx - px) ** 2 + (my - py) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}
