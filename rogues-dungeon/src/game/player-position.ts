import type { Campaign, Position } from "./types.ts";

export const GRID_SIZE = 32;
export function cellCenter(cell: Position): Position { return { x: cell.x * GRID_SIZE + 16, y: cell.y * GRID_SIZE + 16 }; }
export function occupiedCell(pixel: Position): Position { return { x: Math.floor(pixel.x / GRID_SIZE), y: Math.floor(pixel.y / GRID_SIZE) }; }
export function normalizePlayerPosition(player: Campaign["player"]) {
  const pixel = player.pixel;
  if (!pixel || !Number.isSafeInteger(pixel.x) || !Number.isSafeInteger(pixel.y) || occupiedCell(pixel).x !== player.x || occupiedCell(pixel).y !== player.y) player.pixel = cellCenter(player);
  return player;
}
export function precisePlayerPosition(player: Campaign["player"]): Position {
  const pixel = normalizePlayerPosition(player).pixel!;
  return { x: pixel.x / GRID_SIZE - .5, y: pixel.y / GRID_SIZE - .5 };
}
/** Half-open departure, inclusive arrival: resuming on a line never repeats it. */
export function centerCrossings(from: Position, to: Position) {
  const crossings: { axis: "x" | "y"; fraction: number }[] = [];
  for (const axis of ["x", "y"] as const) {
    const delta = to[axis] - from[axis];
    if (!delta) continue;
    const low = Math.min(from[axis], to[axis]); const high = Math.max(from[axis], to[axis]);
    for (let n = Math.ceil((low - 16) / GRID_SIZE); n <= Math.floor((high - 16) / GRID_SIZE); n++) {
      const fraction = (GRID_SIZE * n + 16 - from[axis]) / delta;
      if (fraction > 0 && fraction <= 1) crossings.push({ axis, fraction });
    }
  }
  return crossings.sort((a, b) => a.fraction - b.fraction || (a.axis === "x" ? -1 : 1));
}

/** Retain sub-pixel distance, but publish only whole world pixels. */
export class PixelMovementIntegrator {
  private remainder = { x: 0, y: 0 };
  private direction = "";
  reset() { this.remainder = { x: 0, y: 0 }; this.direction = ""; }
  advance(from: Position, vector: Position, elapsedMs: number, speed: number, destination: Position | null = null): Position {
    const length = Math.hypot(vector.x, vector.y);
    if (!length) { this.reset(); return from; }
    const direction = `${vector.x / length},${vector.y / length}`;
    if (direction !== this.direction) { this.reset(); this.direction = direction; }
    const distance = Math.max(0, elapsedMs) * speed / 1000;
    if (destination && distance >= length) { this.reset(); return destination; }
    this.remainder.x += vector.x / length * distance;
    this.remainder.y += vector.y / length * distance;
    const dx = Math.trunc(this.remainder.x + Math.sign(this.remainder.x) * 1e-10);
    const dy = Math.trunc(this.remainder.y + Math.sign(this.remainder.y) * 1e-10);
    this.remainder.x -= dx; this.remainder.y -= dy;
    return { x: from.x + dx, y: from.y + dy };
  }
}
