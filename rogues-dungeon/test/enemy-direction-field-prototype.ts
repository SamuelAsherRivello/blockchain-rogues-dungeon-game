import type { Floor, Position } from "../src/game/types.ts";

/** Test-only shared direction field. Never imported by the running game. */
export function createEnemyDirectionField(floor: Floor, target: Position, blocked: (position: Position) => boolean) {
  const { width, height } = floor;
  const distances = new Int32Array(width * height).fill(-1);
  const tested = new Uint8Array(width * height), queue = new Int32Array(width * height);
  let cursor = 0, length = 0, expanded = 0;
  const visit = (x: number, y: number, distance: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const id = y * width + x;
    if (tested[id]) return;
    tested[id] = 1;
    if (!floor.cells[y][x].walkable || blocked({ x, y })) return;
    distances[id] = distance; queue[length++] = id;
  };
  visit(target.x, target.y, 0);
  return {
    get expanded() { return expanded; },
    nextStep(origin: Position): Position | null {
      // The enemy's own occupied cell need not be in the field.
      const neighbors = [{ x: origin.x, y: origin.y - 1 }, { x: origin.x + 1, y: origin.y }, { x: origin.x, y: origin.y + 1 }, { x: origin.x - 1, y: origin.y }]
        .filter(p => p.x >= 0 && p.y >= 0 && p.x < width && p.y < height);
      const distance = (p: Position) => distances[p.y * width + p.x];
      let best = () => neighbors.filter(p => distance(p) >= 0).sort((a, b) => distance(a) - distance(b))[0] ?? null;
      let step = best();
      while (cursor < length && (!step || distances[queue[cursor]] < distance(step))) {
        const id = queue[cursor++], x = id % width, y = Math.floor(id / width), next = distances[id] + 1;
        expanded++;
        visit(x + 1, y, next); visit(x - 1, y, next); visit(x, y + 1, next); visit(x, y - 1, next);
        step = best();
      }
      return step;
    },
  };
}
