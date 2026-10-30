import type { Position, TerrainCell } from "../../game/types.ts";
import { createLevelContext, createSemanticCells, runLevelPasses, TERRAIN_ROLES } from "./level-grid-system.ts";

export interface OverworldGenerationOptions {
  width?: number;
  height?: number;
  seed: number;
  mountainDensity?: number;
  scale?: number;
  start?: Position;
  exit?: Position;
  landmarks?: readonly Position[];
  protectedCells?: readonly Position[];
  reserved?: readonly { x: number; y: number; width: number; height: number }[];
}

export interface GeneratedOverworld {
  family: "overworld";
  width: number;
  height: number;
  seed: number;
  mountainDensity: number;
  scale: number;
  start: Position;
  exit: Position;
  cells: TerrainCell[][];
  protectedCells: Position[];
  passes: { id: string; diagnostics: number }[];
  repairedCells: Position[];
  reservedAreas: { x: number; y: number; width: number; height: number }[];
}

export interface OverworldPassScope { x: number; y: number; width: number; height: number }
export interface OverworldScopedPass {
  id: string;
  scope: OverworldPassScope;
  run(context: { readCell(x: number, y: number): Readonly<TerrainCell> | null; writeCell(x: number, y: number, patch: Partial<TerrainCell>): boolean }): void;
}

function hash(seed: number, x: number, y: number) {
  let value = (seed ^ Math.imul(x, 0x9e3779b1) ^ Math.imul(y, 0x85ebca77)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
  return ((value ^ (value >>> 16)) >>> 0) / 0x1_0000_0000;
}

function smooth(value: number) { return value * value * (3 - 2 * value); }

function valueNoise(seed: number, x: number, y: number, scale: number) {
  const gx = x / scale;
  const gy = y / scale;
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const tx = smooth(gx - x0);
  const ty = smooth(gy - y0);
  const top = hash(seed, x0, y0) * (1 - tx) + hash(seed, x0 + 1, y0) * tx;
  const bottom = hash(seed, x0, y0 + 1) * (1 - tx) + hash(seed, x0 + 1, y0 + 1) * tx;
  return top * (1 - ty) + bottom * ty;
}

export function generateOverworld(options: OverworldGenerationOptions): GeneratedOverworld {
  const width = Math.max(3, Math.floor(options.width ?? 100));
  const height = Math.max(3, Math.floor(options.height ?? 100));
  const seed = options.seed >>> 0;
  const mountainDensity = Math.max(0, Math.min(0.65, options.mountainDensity ?? 0.2));
  const scale = Math.max(2, Math.floor(options.scale ?? 18));
  const start = options.start ?? { x: 1, y: 1 };
  const exit = options.exit ?? { x: width - 2, y: height - 2 };
  const landmarks = [...(options.landmarks ?? [])];
  const required = [start, exit, ...landmarks];
  const protectedCells = [...(options.protectedCells ?? []), ...required];
  const repairedCells: Position[] = [];
  const cells = createSemanticCells(width, height, true, TERRAIN_ROLES.GROUND);
  const context = createLevelContext({ worldId: "One", realmId: "Overworld", levelId: 0, seed, width, height, cells, start, exit });
  protectedCells.forEach((cell) => context.reserveCell(cell.x, cell.y));
  const reservedAreas = (options.reserved ?? []).map((area) => ({ ...area }));
  runLevelPasses(context, [{ id: "organic-overworld-mountains", run(generation) {
    const fields = new Float64Array(width * height);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const broad = valueNoise(seed, x, y, scale);
      const detail = valueNoise(seed ^ 0xa511e9b3, x, y, Math.max(2, Math.floor(scale / 3)));
      fields[y * width + x] = broad * 0.72 + detail * 0.28;
    }
    const ordered = [...fields].sort((left, right) => left - right);
    const threshold = ordered[Math.min(ordered.length - 1, Math.floor((1 - mountainDensity) * ordered.length))] ?? 1;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      if (reservedAreas.some((area) => x >= area.x && y >= area.y && x < area.x + area.width && y < area.y + area.height)) continue;
      const field = fields[y * width + x]!;
      if (field >= threshold) generation.writeCell(x, y, { walkable: false, role: TERRAIN_ROLES.MOUNTAIN });
    }
  } }, { id: "repair-required-routes", run(generation) {
    for (let index = 1; index < required.length; index++) {
      const from = required[index - 1]!;
      const to = required[index]!;
      const path = leastCostPath(context.cells, from, to, width, height);
      for (const cell of path) {
        if (!context.cells[cell.y]?.[cell.x]?.walkable) {
          generation.writeCell(cell.x, cell.y, { walkable: true, role: TERRAIN_ROLES.GROUND });
          repairedCells.push(cell);
        }
      }
    }
  } }]);
  return { family: "overworld", width, height, seed, mountainDensity, scale, start, exit, cells: context.cells, protectedCells: context.protectedCells, passes: context.passes, repairedCells, reservedAreas };
}

export function applyOverworldScopedPass(world: GeneratedOverworld, pass: OverworldScopedPass) {
  const { scope } = pass;
  const writeCell = (x: number, y: number, patch: Partial<TerrainCell>) => {
    if (x < scope.x || y < scope.y || x >= scope.x + scope.width || y >= scope.y + scope.height) return false;
    if (world.protectedCells.some((cell) => cell.x === x && cell.y === y)) return false;
    const cell = world.cells[y]?.[x];
    if (!cell) return false;
    Object.assign(cell, patch);
    return true;
  };
  const readCell = (x: number, y: number) => {
    const cell = world.cells[y]?.[x];
    return cell ? { ...cell } : null;
  };
  pass.run({ readCell, writeCell });
  world.passes.push({ id: pass.id, diagnostics: 0 });
  return world;
}

function leastCostPath(cells: TerrainCell[][], start: Position, goal: Position, width: number, height: number) {
  const key = (position: Position) => position.y * width + position.x;
  const startKey = key(start);
  const goalKey = key(goal);
  const count = width * height;
  const costs = new Float64Array(count).fill(Number.POSITIVE_INFINITY);
  const parents = new Int32Array(count).fill(-1);
  const settled = new Uint8Array(count);
  costs[startKey] = 0;
  for (let step = 0; step < count; step++) {
    let current = -1;
    let currentCost = Number.POSITIVE_INFINITY;
    for (let index = 0; index < count; index++) if (!settled[index] && costs[index]! < currentCost) { current = index; currentCost = costs[index]!; }
    if (current < 0 || current === goalKey) break;
    settled[current] = 1;
    const x = current % width;
    const y = Math.floor(current / width);
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const next = ny * width + nx;
      if (settled[next]) continue;
      const stepCost = cells[ny]?.[nx]?.walkable ? 1 : 4;
      const candidate = currentCost + stepCost;
      if (candidate < costs[next]!) { costs[next] = candidate; parents[next] = current; }
    }
  }
  if (!Number.isFinite(costs[goalKey]!)) return [];
  const path: Position[] = [];
  for (let current = goalKey; current >= 0; current = parents[current]!) {
    path.push({ x: current % width, y: Math.floor(current / width) });
    if (current === startKey) break;
  }
  return path.reverse();
}

