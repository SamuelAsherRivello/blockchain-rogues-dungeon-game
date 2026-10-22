import { countPerformance, measurePerformance } from "../systems/rendering/performance-system.ts";
import type { Position } from "./types.ts";
import type { Grid } from "../systems/procedural/level-grid-system.ts";
import { createAStarPathfinder, DEFAULT_GRID_OPTIONS, DIRECTIONS_4, GridNode, type IPathfindingMap } from "@esengine/pathfinding";
import { ensureSemanticCells, isWalkable } from "../systems/procedural/level-grid-system.ts";

// Adapted from the MIT-licensed cardinal A* integration in
// https://github.com/SamuelAsherRivello/babylon-lite-ascii-rpg
const cellKey = ({ x, y }: Position) => `${x},${y}`;
const isWalkableTerrain = (floor: Grid, x: number, y: number) => isWalkable(floor, x, y);
const passableEntityKinds = new Set(["potion", "key", "gold", "item", "stairs", "teleport-arrow", "discovery"]);
const GOLD_ROUTE_SAVINGS_THRESHOLD = 5;
const MAX_OBJECT_DETOUR = 5;
type PathEntity = Position & { id?: string; kind?: string; hasMass?: boolean; opened?: boolean };
type PathObjectSet = { kind?: string; barrel?: Position & { hasMass?: boolean }; trigger?: Position; triggers?: Position[]; door?: Position; doors?: Position[]; activated?: boolean; completed?: boolean };
type PathFloor = Grid & { entities?: PathEntity[]; decorations?: (Position & { kind?: string })[]; tiledDecorations?: Position[]; objectSets?: PathObjectSet[] };
export interface CardinalPathOptions { maxNodes?: number; isBlocked?: (position: Position) => boolean; respectObjectSets?: boolean; avoidObjects?: boolean }

const isPassableEntity = (entity: PathEntity, options: CardinalPathOptions) => passableEntityKinds.has(entity.kind ?? "")
  || options.avoidObjects === true && entity.kind === "crate" && entity.opened === true;

function objectCells(floor: PathFloor) {
  const cells = new Set([...(floor.entities ?? []), ...(floor.decorations ?? []), ...(floor.tiledDecorations ?? [])].map(cellKey));
  for (const set of floor.objectSets ?? []) {
    for (const position of [set.barrel, set.trigger, set.door, ...(set.doors ?? []), ...(set.triggers ?? [])]) {
      if (position) cells.add(cellKey(position));
    }
  }
  return cells;
}

function pathToClosestReachableCell(normalizedFloor: Grid & { entities?: (Position & { id?: string; kind?: string })[] }, width: number, height: number, from: Position, to: Position, blocked: ReadonlySet<string>, options: CardinalPathOptions) {
  const fromId = from.y * width + from.x;
  const previous = new Int32Array(width * height); previous.fill(-2); previous[fromId] = -1;
  const queue = new Int32Array(width * height); queue[0] = fromId;
  let length = 1, best = fromId;
  let bestDistance = Math.abs(from.x - to.x) + Math.abs(from.y - to.y);
  const minimumDistance = blocked.has(cellKey(to)) ? 1 : 0;
  search: for (let index = 0; index < length && bestDistance > minimumDistance; index++) {
    const current = queue[index], x = current % width, y = Math.floor(current / width);
    // Preserve E, W, S, N insertion order. BFS reaches equal-distance
    // candidates in shortest-route order, so no predecessor-chain scan is needed.
    for (let direction = 0; direction < 4; direction++) {
      const nx = x + (direction === 0 ? 1 : direction === 1 ? -1 : 0);
      const ny = y + (direction === 2 ? 1 : direction === 3 ? -1 : 0);
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const id = ny * width + nx;
      if (previous[id] !== -2) continue;
      if (!isWalkableTerrain(normalizedFloor, nx, ny) || options.isBlocked?.({ x: nx, y: ny }) || blocked.has(`${nx},${ny}`)) { previous[id] = -3; continue; }
      previous[id] = current; queue[length++] = id;
      const distance = Math.abs(nx - to.x) + Math.abs(ny - to.y);
      if (distance < bestDistance) {
        best = id; bestDistance = distance;
        // Once the globally closest possible cell is reached, BFS insertion
        // order already guarantees the original shortest-route tie-break.
        if (distance <= minimumDistance) break search;
      }
    }
  }
  countPerformance("approach cells visited", length);
  const path: Position[] = [];
  for (let cursor = best; cursor !== -1; cursor = previous[cursor]) path.push(Object.freeze({ x: cursor % width, y: Math.floor(cursor / width) }));
  return Object.freeze(path.reverse());
}

function closedObjectSetCells(floor: PathFloor, from: Position) {
  const entities = floor.entities ?? [];
  const hasMassAt = (position: Position, object: Position & { hasMass?: boolean }, defaultHasMass = false) =>
    (object.hasMass ?? defaultHasMass) === true && object.x === position.x && object.y === position.y;
  const objectSetCells = new Set<string>();
  for (const set of floor.objectSets ?? []) {
    if (set.kind === "encounter-lockdown") {
      if (set.activated && !set.completed) for (const door of set.doors ?? []) objectSetCells.add(cellKey(door));
      continue;
    }
    const { trigger, door, barrel } = set;
    if (!trigger || !door || !barrel) continue;
    const open = hasMassAt(trigger, from)
      || hasMassAt(trigger, barrel, true)
      || entities.some((entity) => hasMassAt(trigger, entity));
    if (!open) {
      objectSetCells.add(cellKey(door));
    }
  }
  return objectSetCells;
}

function pathWithBlockedCells(normalizedFloor: Grid & { entities?: PathEntity[] }, width: number, height: number, from: Position, to: Position, blocked: ReadonlySet<string>, options: CardinalPathOptions) {
  const fromKey = cellKey(from);
  // A nearby pursuit must not allocate and test every cell in the whole floor.
  // Keep GridMap's node IDs, neighbor order, costs and heuristic, but materialize
  // only nodes A* requests. Each query owns its blockers and nodes, so moving
  // actors, traps and doors cannot leave stale walkability in a shared cache.
  const nodes = new Map<number, GridNode>();
  const nodeAt = (x: number, y: number): GridNode | null => {
    if (x < 0 || y < 0 || x >= width || y >= height) return null;
    const id = y * width + x;
    let node = nodes.get(id);
    if (!node) {
      const position = { x, y }, key = cellKey(position);
      node = new GridNode(x, y, width, isWalkableTerrain(normalizedFloor, x, y) && !options.isBlocked?.(position) && (!blocked.has(key) || key === fromKey));
      nodes.set(id, node); countPerformance("navigation cells tested");
    }
    return node;
  };
  const grid: IPathfindingMap = {
    width, height, getNodeAt: nodeAt,
    isWalkable: (x, y) => nodeAt(x, y)?.walkable === true,
    getNeighbors(node) {
      const neighbors: GridNode[] = [];
      for (const { dx, dy } of DIRECTIONS_4) {
        const next = nodeAt(node.position.x + dx, node.position.y + dy);
        if (next?.walkable) neighbors.push(next);
      }
      return neighbors;
    },
    heuristic: DEFAULT_GRID_OPTIONS.heuristic,
    getMovementCost: (_from, target) => target.cost,
  };
  const result = options.maxNodes === undefined
    ? createAStarPathfinder(grid).findPath(from.x, from.y, to.x, to.y)
    : createAStarPathfinder(grid).findPath(from.x, from.y, to.x, to.y, { maxNodes: options.maxNodes });
  if (!result.found || !result.path.length) return null;
  return Object.freeze(result.path.map((cell) => Object.freeze({ x: cell.x, y: cell.y })));
}

/** Player object avoidance allows at most five extra moves; enemy pickup policy is unchanged. */
export function findCardinalPath(floor: PathFloor, from: Position, to: Position, options: CardinalPathOptions = {}) {
  return measurePerformance("navigation (inclusive)", () => findCardinalPathCore(floor, from, to, options));
}
function findCardinalPathCore(floor: PathFloor, from: Position, to: Position, options: CardinalPathOptions) {
  const normalizedFloor = ensureSemanticCells(floor);
  const height = normalizedFloor?.height ?? normalizedFloor?.cells?.length ?? 0;
  const width = normalizedFloor?.width ?? normalizedFloor?.cells?.[0]?.length ?? 0;
  if (!width || !height || !Number.isInteger(from?.x) || !Number.isInteger(from?.y) || !Number.isInteger(to?.x) || !Number.isInteger(to?.y)
    || !isWalkableTerrain(normalizedFloor, from.x, from.y) || !isWalkableTerrain(normalizedFloor, to.x, to.y)) return null;

  const hardBlocked = new Set((normalizedFloor.entities ?? [])
    .filter((entity) => !isPassableEntity(entity, options) && !(entity.kind !== "enemy" && entity.x === to.x && entity.y === to.y))
    .map(cellKey));
  if (options.respectObjectSets) for (const key of closedObjectSetCells(normalizedFloor, from)) hardBlocked.add(key);
  if (options.respectObjectSets) for (const set of normalizedFloor.objectSets ?? []) if (set.barrel) hardBlocked.add(cellKey(set.barrel));
  if (options.respectObjectSets) for (const entity of normalizedFloor.entities ?? []) if (entity.kind === "campfire") hardBlocked.add(cellKey(entity));
  const pickupBlocked = new Set((normalizedFloor.entities ?? [])
    .filter((entity) => passableEntityKinds.has(entity.kind ?? ""))
    .map(cellKey));
  return findPreparedCardinalPath(normalizedFloor, width, height, from, to, hardBlocked, pickupBlocked, options);
}

function findPreparedCardinalPath(normalizedFloor: PathFloor, width: number, height: number, from: Position, to: Position, hardBlocked: ReadonlySet<string>, pickups: ReadonlySet<string>, options: CardinalPathOptions, canReach?: (blocked: ReadonlySet<string>, stage: string) => boolean) {
  if (options.avoidObjects) {
    const shortest = pathWithBlockedCells(normalizedFloor, width, height, from, to, hardBlocked, options);
    if (!shortest) return null;
    const objects = objectCells(normalizedFloor);
    objects.delete(cellKey(from)); objects.delete(cellKey(to));
    if (!shortest.some(cell => objects.has(cellKey(cell)))) return shortest;
    const blocked = new Set([...hardBlocked, ...objects]);
    const clearRoute = pathWithBlockedCells(normalizedFloor, width, height, from, to, blocked, options);
    return clearRoute && clearRoute.length - shortest.length <= MAX_OBJECT_DETOUR ? clearRoute : shortest;
  }
  const pickupBlocked = new Set(pickups);
  const emptyRouteBlocked = new Set(hardBlocked);
  if (pickupBlocked.has(cellKey(to))) pickupBlocked.delete(cellKey(to));
  pickupBlocked.forEach((key) => emptyRouteBlocked.add(key));
  const emptyRoute = canReach && !canReach(emptyRouteBlocked, "empty") ? null : pathWithBlockedCells(normalizedFloor, width, height, from, to, emptyRouteBlocked, options);
  if (!emptyRoute) {
    if (emptyRouteBlocked.size === hardBlocked.size) return null;
    return canReach && !canReach(hardBlocked, "hard") ? null : pathWithBlockedCells(normalizedFloor, width, height, from, to, hardBlocked, options);
  }

  const goldRouteBlocked = new Set(emptyRouteBlocked);
  for (const entity of normalizedFloor.entities ?? []) if (entity.kind === "gold") goldRouteBlocked.delete(cellKey(entity));
  // An identical query cannot produce a shorter route.
  if (goldRouteBlocked.size === emptyRouteBlocked.size) return emptyRoute;
  const goldRoute = pathWithBlockedCells(normalizedFloor, width, height, from, to, goldRouteBlocked, options);
  if (goldRoute && emptyRoute.length - goldRoute.length >= GOLD_ROUTE_SAVINGS_THRESHOLD) return goldRoute;
  return emptyRoute;
}

/** One immutable planning snapshot, discarded before any enemy moves. */
export function createCardinalPathBatch(floor: PathFloor, to: Position) {
  const normalized = ensureSemanticCells(floor);
  const width = normalized.width ?? normalized.cells[0]?.length ?? 0, height = normalized.height ?? normalized.cells.length;
  const hardBlocked = new Set((normalized.entities ?? [])
    .filter(entity => !passableEntityKinds.has(entity.kind ?? "") && !(entity.kind !== "enemy" && entity.x === to.x && entity.y === to.y)).map(cellKey));
  const pickups = new Set((normalized.entities ?? []).filter(entity => passableEntityKinds.has(entity.kind ?? "")).map(cellKey));
  const groups = new Map<string, (from: Position) => boolean>();
  countPerformance("enemy navigation batches");
  return (from: Position, options: Pick<CardinalPathOptions, "maxNodes" | "isBlocked">, blockerGroup: string) => measurePerformance("navigation (inclusive)", () => {
    if (!width || !height || !Number.isInteger(from.x) || !Number.isInteger(from.y) || !Number.isInteger(to.x) || !Number.isInteger(to.y)
      || !isWalkableTerrain(normalized, from.x, from.y) || !isWalkableTerrain(normalized, to.x, to.y)) return null;
    const reachable = (blocked: ReadonlySet<string>, stage: string) => {
      // With no intermediate pickups both route policies have identical blockers.
      const group = `${pickups.size === 0 || pickups.size === 1 && pickups.has(cellKey(to)) ? "hard" : stage}:${blockerGroup}`;
      let canReach = groups.get(group);
      if (!canReach) {
        const blockedIds = new Set([...blocked].map(key => { const [x, y] = key.split(",").map(Number); return y * width + x; }));
        // Expand backwards from the common target only as far as requests need.
        // Occupied enemy origins are allowed only as the final reverse edge.
        // This rejects impossible routes without replacing A* tie-breaking.
        const seen = new Uint8Array(width * height), queue = new Int32Array(width * height);
        let length = 0, cursor = 0;
        const visit = (x: number, y: number) => {
          if (x < 0 || y < 0 || x >= width || y >= height) return;
          const id = y * width + x;
          if (seen[id]) return;
          seen[id] = 1;
          if (!isWalkableTerrain(normalized, x, y) || blockedIds.has(id) || options.isBlocked?.({ x, y })) return;
          seen[id] = 2; queue[length++] = id;
        };
        visit(to.x, to.y);
        canReach = origin => {
          if (options.isBlocked?.(origin)) return false;
          const originId = origin.y * width + origin.x;
          const adjacent = () => origin.x > 0 && seen[originId - 1] === 2 || origin.x + 1 < width && seen[originId + 1] === 2
            || origin.y > 0 && seen[originId - width] === 2 || origin.y + 1 < height && seen[originId + width] === 2;
          if (adjacent()) return true;
          const before = cursor;
          while (cursor < length) {
            const id = queue[cursor++], x = id % width, y = Math.floor(id / width);
            visit(x + 1, y); visit(x - 1, y); visit(x, y + 1); visit(x, y - 1);
            if (adjacent()) { countPerformance("enemy reachability cells", cursor - before); return true; }
          }
          countPerformance("enemy reachability cells", cursor - before);
          return false;
        };
        groups.set(group, canReach);
      }
      if ((from.x !== to.x || from.y !== to.y) && !canReach(from)) { countPerformance("enemy route searches rejected"); return false; }
      countPerformance("enemy path searches");
      return true;
    };
    const path = findPreparedCardinalPath(normalized, width, height, from, to, hardBlocked, pickups, options, reachable);
    if (!path) countPerformance("enemy paths rejected");
    return path;
  });
}

/** Return the best reachable approach when the requested destination is blocked. */
export function findCardinalApproachPath(floor: PathFloor, from: Position, to: Position, options: CardinalPathOptions = {}) {
  return measurePerformance("approach route (inclusive)", () => findCardinalApproachPathCore(floor, from, to, options));
}
function findCardinalApproachPathCore(floor: PathFloor, from: Position, to: Position, options: CardinalPathOptions) {
  const normalizedFloor = ensureSemanticCells(floor);
  const height = normalizedFloor?.height ?? normalizedFloor?.cells?.length ?? 0;
  const width = normalizedFloor?.width ?? normalizedFloor?.cells?.[0]?.length ?? 0;
  if (!width || !height || !Number.isInteger(from?.x) || !Number.isInteger(from?.y) || !Number.isInteger(to?.x) || !Number.isInteger(to?.y) || !isWalkableTerrain(normalizedFloor, from.x, from.y)) return null;
  const hardBlocked = new Set((normalizedFloor.entities ?? [])
    .filter((entity) => !isPassableEntity(entity, options) && !(entity.kind !== "enemy" && entity.x === to.x && entity.y === to.y))
    .map(cellKey));
  if (options.respectObjectSets) for (const key of closedObjectSetCells(normalizedFloor, from)) hardBlocked.add(key);
  if (options.respectObjectSets) for (const set of normalizedFloor.objectSets ?? []) if (set.barrel) hardBlocked.add(cellKey(set.barrel));
  if (options.respectObjectSets) for (const entity of normalizedFloor.entities ?? []) if (entity.kind === "campfire") hardBlocked.add(cellKey(entity));
  const pickupBlocked = new Set((normalizedFloor.entities ?? [])
    .filter((entity) => passableEntityKinds.has(entity.kind ?? ""))
    .map(cellKey));
  pickupBlocked.delete(cellKey(to));
  const emptyRouteBlocked = new Set(hardBlocked); pickupBlocked.forEach((key) => emptyRouteBlocked.add(key));
  if (options.respectObjectSets) {
    const approachBlockers = closedObjectSetCells(normalizedFloor, from);
    const routePastBlockers = new Set(emptyRouteBlocked);
    const hardRoutePastBlockers = new Set(hardBlocked);
    approachBlockers.forEach((key) => routePastBlockers.delete(key));
    approachBlockers.forEach((key) => hardRoutePastBlockers.delete(key));
    const route = options.avoidObjects
      ? findPreparedCardinalPath(normalizedFloor, width, height, from, to, hardRoutePastBlockers, pickupBlocked, options)
      : pathWithBlockedCells(normalizedFloor, width, height, from, to, routePastBlockers, options)
      ?? pathWithBlockedCells(normalizedFloor, width, height, from, to, hardRoutePastBlockers, options);
    const firstBlockedIndex = route?.findIndex((cell) => hardBlocked.has(cellKey(cell)) || options.isBlocked?.(cell)) ?? -1;
    if (route && firstBlockedIndex > 0) return Object.freeze(route.slice(0, firstBlockedIndex).map((cell) => Object.freeze({ ...cell })));
  }
  if (options.avoidObjects) {
    const approach = pathToClosestReachableCell(normalizedFloor, width, height, from, to, hardBlocked, options);
    return findPreparedCardinalPath(normalizedFloor, width, height, from, approach.at(-1)!, hardBlocked, pickupBlocked, options) ?? approach;
  }
  const emptyApproach = pathToClosestReachableCell(normalizedFloor, width, height, from, to, emptyRouteBlocked, options);
  if (emptyApproach.length > 1) return emptyApproach;
  return pathToClosestReachableCell(normalizedFloor, width, height, from, to, hardBlocked, options);
}
