import type { Position } from "./types.ts";
import type { Grid } from "../systems/procedural/level-grid-system.ts";
import { createAStarPathfinder, createGridMap } from "@esengine/pathfinding";
import { ensureSemanticCells, isWalkable } from "../systems/procedural/level-grid-system.ts";

// Adapted from the MIT-licensed cardinal A* integration in
// https://github.com/SamuelAsherRivello/babylon-lite-ascii-rpg
const cellKey = ({ x, y }: Position) => `${x},${y}`;
const isWalkableTerrain = (floor: Grid, x: number, y: number) => isWalkable(floor, x, y);
const passableEntityKinds = new Set(["potion", "key", "gold", "item", "stairs", "teleport-arrow", "discovery"]);
type PathEntity = Position & { id?: string; kind?: string; hasMass?: boolean };
type PathFloor = Grid & { entities?: PathEntity[]; decorations?: (Position & { kind?: string })[]; objectSets?: { kind?: string; barrel: Position & { hasMass?: boolean }; trigger: Position; door: Position }[] };
export interface CardinalPathOptions { maxNodes?: number; isBlocked?: (position: Position) => boolean; respectObjectSets?: boolean }

const cardinalNeighbors = (position: Position) => [
  { x: position.x + 1, y: position.y }, { x: position.x - 1, y: position.y },
  { x: position.x, y: position.y + 1 }, { x: position.x, y: position.y - 1 },
];

function pathToClosestReachableCell(normalizedFloor: Grid & { entities?: (Position & { id?: string; kind?: string })[] }, width: number, height: number, from: Position, to: Position, blocked: ReadonlySet<string>, options: CardinalPathOptions) {
  const fromKey = cellKey(from);
  const previous = new Map<string, string | null>([[fromKey, null]]);
  const positions = new Map<string, Position>([[fromKey, from]]);
  const queue = [from];
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    for (const next of cardinalNeighbors(current)) {
      const key = cellKey(next);
      if (next.x < 0 || next.y < 0 || next.x >= width || next.y >= height || previous.has(key) || !isWalkableTerrain(normalizedFloor, next.x, next.y) || options.isBlocked?.(next) || (blocked.has(key) && key !== fromKey)) continue;
      previous.set(key, cellKey(current)); positions.set(key, next); queue.push(next);
    }
  }
  let best = from;
  let bestDistance = Math.abs(from.x - to.x) + Math.abs(from.y - to.y);
  let bestPathLength = 0;
  for (const [key, position] of positions) {
    const distance = Math.abs(position.x - to.x) + Math.abs(position.y - to.y);
    let pathLength = 0; let cursor: string | null = key;
    while (cursor && cursor !== fromKey) { pathLength += 1; cursor = previous.get(cursor) ?? null; }
    if (distance < bestDistance || distance === bestDistance && pathLength < bestPathLength) { best = position; bestDistance = distance; bestPathLength = pathLength; }
  }
  const path: Position[] = []; let cursor: string | null = cellKey(best);
  while (cursor) { path.unshift(positions.get(cursor)!); cursor = previous.get(cursor) ?? null; }
  return Object.freeze(path.map((position) => Object.freeze(position)));
}

function closedObjectSetCells(floor: PathFloor, from: Position) {
  const entities = floor.entities ?? [];
  const hasMassAt = (position: Position, object: Position & { hasMass?: boolean }, defaultHasMass = false) =>
    (object.hasMass ?? defaultHasMass) === true && object.x === position.x && object.y === position.y;
  const objectSetCells = new Set<string>();
  for (const set of floor.objectSets ?? []) {
    const open = hasMassAt(set.trigger, from)
      || hasMassAt(set.trigger, set.barrel, true)
      || entities.some((entity) => hasMassAt(set.trigger, entity));
    if (!open) {
      objectSetCells.add(cellKey(set.door));
    }
  }
  return objectSetCells;
}

function pathWithBlockedCells(normalizedFloor: Grid & { entities?: PathEntity[] }, width: number, height: number, from: Position, to: Position, blocked: ReadonlySet<string>, options: CardinalPathOptions) {
  const grid = createGridMap(width, height, { allowDiagonal: false });
  const fromKey = cellKey(from);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const position = { x, y };
    grid.setWalkable(x, y, isWalkableTerrain(normalizedFloor, x, y) && !options.isBlocked?.(position) && (!blocked.has(cellKey(position)) || cellKey(position) === fromKey));
  }
  const result = options.maxNodes === undefined
    ? createAStarPathfinder(grid).findPath(from.x, from.y, to.x, to.y)
    : createAStarPathfinder(grid).findPath(from.x, from.y, to.x, to.y, { maxNodes: options.maxNodes });
  if (!result.found || !result.path.length) return null;
  return Object.freeze(result.path.map((cell) => Object.freeze({ x: cell.x, y: cell.y })));
}

/** Find a cardinal route, preferring empty cells before routes through pickups. */
export function findCardinalPath(floor: PathFloor, from: Position, to: Position, options: CardinalPathOptions = {}) {
  const normalizedFloor = ensureSemanticCells(floor);
  const height = normalizedFloor?.height ?? normalizedFloor?.cells?.length ?? 0;
  const width = normalizedFloor?.width ?? normalizedFloor?.cells?.[0]?.length ?? 0;
  if (!width || !height || !Number.isInteger(from?.x) || !Number.isInteger(from?.y) || !Number.isInteger(to?.x) || !Number.isInteger(to?.y)
    || !isWalkableTerrain(normalizedFloor, from.x, from.y) || !isWalkableTerrain(normalizedFloor, to.x, to.y)) return null;

  const hardBlocked = new Set((normalizedFloor.entities ?? [])
    .filter((entity) => !passableEntityKinds.has(entity.kind ?? "") && !(entity.kind !== "enemy" && entity.x === to.x && entity.y === to.y))
    .map(cellKey));
  if (options.respectObjectSets) for (const key of closedObjectSetCells(normalizedFloor, from)) hardBlocked.add(key);
  if (options.respectObjectSets) for (const set of normalizedFloor.objectSets ?? []) hardBlocked.add(cellKey(set.barrel));
  if (options.respectObjectSets) for (const entity of normalizedFloor.entities ?? []) if (entity.kind === "campfire") hardBlocked.add(cellKey(entity));
  const pickupBlocked = new Set((normalizedFloor.entities ?? [])
    .filter((entity) => passableEntityKinds.has(entity.kind ?? ""))
    .map(cellKey));
  const fromKey = cellKey(from);
  const emptyRouteBlocked = new Set(hardBlocked);
  if (pickupBlocked.has(cellKey(to))) pickupBlocked.delete(cellKey(to));
  pickupBlocked.forEach((key) => emptyRouteBlocked.add(key));
  return pathWithBlockedCells(normalizedFloor, width, height, from, to, emptyRouteBlocked, options)
    ?? pathWithBlockedCells(normalizedFloor, width, height, from, to, hardBlocked, options);
}

/** Return the best reachable approach when the requested destination is blocked. */
export function findCardinalApproachPath(floor: PathFloor, from: Position, to: Position, options: CardinalPathOptions = {}) {
  const normalizedFloor = ensureSemanticCells(floor);
  const height = normalizedFloor?.height ?? normalizedFloor?.cells?.length ?? 0;
  const width = normalizedFloor?.width ?? normalizedFloor?.cells?.[0]?.length ?? 0;
  if (!width || !height || !Number.isInteger(from?.x) || !Number.isInteger(from?.y) || !Number.isInteger(to?.x) || !Number.isInteger(to?.y) || !isWalkableTerrain(normalizedFloor, from.x, from.y)) return null;
  const hardBlocked = new Set((normalizedFloor.entities ?? [])
    .filter((entity) => !passableEntityKinds.has(entity.kind ?? "") && !(entity.kind !== "enemy" && entity.x === to.x && entity.y === to.y))
    .map(cellKey));
  if (options.respectObjectSets) for (const key of closedObjectSetCells(normalizedFloor, from)) hardBlocked.add(key);
  if (options.respectObjectSets) for (const set of normalizedFloor.objectSets ?? []) hardBlocked.add(cellKey(set.barrel));
  if (options.respectObjectSets) for (const entity of normalizedFloor.entities ?? []) if (entity.kind === "campfire") hardBlocked.add(cellKey(entity));
  const pickupBlocked = new Set((normalizedFloor.entities ?? [])
    .filter((entity) => passableEntityKinds.has(entity.kind ?? ""))
    .map(cellKey));
  pickupBlocked.delete(cellKey(to));
  const emptyRouteBlocked = new Set(hardBlocked); pickupBlocked.forEach((key) => emptyRouteBlocked.add(key));
  if (options.respectObjectSets) {
    const approachBlockers = closedObjectSetCells(normalizedFloor, from);
    const routePastBlockers = new Set(emptyRouteBlocked);
    approachBlockers.forEach((key) => routePastBlockers.delete(key));
    const route = pathWithBlockedCells(normalizedFloor, width, height, from, to, routePastBlockers, options)
      ?? pathWithBlockedCells(normalizedFloor, width, height, from, to, (() => { const blocked = new Set(hardBlocked); approachBlockers.forEach((key) => blocked.delete(key)); return blocked; })(), options);
    const firstBlockedIndex = route?.findIndex((cell) => hardBlocked.has(cellKey(cell)) || options.isBlocked?.(cell)) ?? -1;
    if (route && firstBlockedIndex > 0) return Object.freeze(route.slice(0, firstBlockedIndex).map((cell) => Object.freeze({ ...cell })));
  }
  const emptyApproach = pathToClosestReachableCell(normalizedFloor, width, height, from, to, emptyRouteBlocked, options);
  if (emptyApproach.length > 1) return emptyApproach;
  return pathToClosestReachableCell(normalizedFloor, width, height, from, to, hardBlocked, options);
}
