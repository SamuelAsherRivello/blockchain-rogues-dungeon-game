import type { Position, Room, TerrainCell } from '../../game/types.ts';
import { dungeonCorridorCells, dungeonRoomCenter, type DungeonRoomEdge } from './dungeon-topology-system.ts';

export interface DungeonQualityIssue { code: string; message: string; position?: Position; id?: string }
export interface DungeonQualityInput {
  width: number; height: number; cells: readonly (readonly TerrainCell[])[]; start: Position; exit: Position;
  rooms?: readonly Room[]; corridors?: readonly DungeonRoomEdge[]; protectedCells?: readonly Position[];
  entities?: readonly (Position & { id: string; sharedCell?: boolean })[];
  minimumRoomWidth?: number; minimumRoomHeight?: number; minimumRouteLength?: number; maximumRouteLength?: number;
}
export interface DungeonQualityResult { valid: boolean; issues: DungeonQualityIssue[]; routeLength: number; reachableCells: number }
const key = (position: Position) => `${position.x},${position.y}`;

/** Checks semantic terrain before activation. Puzzle doors are intentionally not terrain blockers. */
export function validateDungeonQuality(input: DungeonQualityInput): DungeonQualityResult {
  const issues: DungeonQualityIssue[] = [];
  const issue = (code: string, message: string, position?: Position, id?: string) => issues.push({ code, message, ...(position ? { position } : {}), ...(id ? { id } : {}) });
  const { width, height, cells, start, exit } = input;
  const inBounds = (position: Position) => Number.isInteger(position.x) && Number.isInteger(position.y) && position.x >= 0 && position.y >= 0 && position.x < width && position.y < height;
  const walkable = (position: Position) => inBounds(position) && cells[position.y]?.[position.x]?.walkable === true;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || cells.length !== height || cells.some(row => row.length !== width)) {
    issue('grid-dimensions', 'The semantic grid must match its positive integer dimensions.');
    return { valid: false, issues, routeLength: -1, reachableCells: 0 };
  }
  const blockedRoles = new Set(['wall', 'mountain', 'water']);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const cell = cells[y]![x];
    if (!cell || typeof cell.walkable !== 'boolean' || (cell.walkable ? cell.role !== 'ground' : !blockedRoles.has(cell.role))) {
      issue('terrain-role', 'Terrain role and walkability disagree.', { x, y });
    }
  }
  if (!walkable(start)) issue('start-blocked', 'The level start must be a walkable grid cell.', start);
  if (!walkable(exit)) issue('exit-blocked', 'The level exit must be a walkable grid cell.', exit);
  for (const position of input.protectedCells ?? []) if (!walkable(position)) issue('protected-blocked', 'A protected gameplay cell is blocked or out of bounds.', position);
  const occupied = new Map<string, string>();
  for (const entity of input.entities ?? []) {
    if (!walkable(entity)) issue('entity-cell', 'Generated entities require walkable cells inside the level.', entity, entity.id);
    const previous = occupied.get(key(entity));
    if (previous && !entity.sharedCell) issue('entity-overlap', `Generated entity overlaps ${previous}.`, entity, entity.id);
    if (!entity.sharedCell) occupied.set(key(entity), entity.id);
  }
  for (const [index, room] of (input.rooms ?? []).entries()) {
    if (![room.x, room.y, room.w, room.h].every(Number.isInteger) || room.w < (input.minimumRoomWidth ?? 3) || room.h < (input.minimumRoomHeight ?? 3)
      || !inBounds(room) || !inBounds({ x: room.x + room.w - 1, y: room.y + room.h - 1 })) {
      issue('room-dimensions', 'A generated room violates its minimum dimensions or level bounds.', room, `room-${index}`);
    }
    for (let other = 0; other < index; other++) {
      const previous = input.rooms![other]!;
      if (room.x < previous.x + previous.w && room.x + room.w > previous.x && room.y < previous.y + previous.h && room.y + room.h > previous.y) {
        issue('room-overlap', `Generated room overlaps room-${other}.`, room, `room-${index}`);
      }
    }
  }
  for (const corridor of input.corridors ?? []) {
    try {
      const blocked = dungeonCorridorCells(corridor).find(position => !walkable(position));
      if (blocked) issue('corridor-width', 'A corridor cross-section is blocked or outside the level.', blocked, corridor.id);
    } catch {
      issue('corridor-shape', 'Corridor segments and width are invalid.', undefined, corridor.id);
    }
  }
  const distance = new Map<string, number>(), queue: Position[] = [];
  if (walkable(start)) { distance.set(key(start), 0); queue.push(start); }
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index]!, nextDistance = distance.get(key(current))! + 1;
    for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]] as const) {
      const next = { x: current.x + dx, y: current.y + dy }, nextKey = key(next);
      if (!walkable(next) || distance.has(nextKey)) continue;
      distance.set(nextKey, nextDistance); queue.push(next);
    }
  }
  const routeLength = distance.get(key(exit)) ?? -1;
  if (routeLength < 0) issue('exit-unreachable', 'The exit has no cardinal terrain route from the start.', exit);
  else if (routeLength < (input.minimumRouteLength ?? 0) || routeLength > (input.maximumRouteLength ?? Infinity)) {
    issue('route-pacing', 'The start-to-exit route violates the configured distance limits.', exit);
  }
  for (const [index, room] of (input.rooms ?? []).entries()) {
    const center = dungeonRoomCenter(room);
    if (!distance.has(key(center))) issue('room-unreachable', 'The generated room is not connected to the start.', center, `room-${index}`);
  }
  return { valid: issues.length === 0, issues, routeLength, reachableCells: distance.size };
}

/** One bounded repair pass. It never overwrites a protected cell or changes input buffers. */
export function repairDungeonRoutes(cells: readonly (readonly TerrainCell[])[], start: Position, targets: readonly Position[], protectedCells: readonly Position[] = []) {
  const result = cells.map(row => row.map(cell => ({ ...cell }))), protectedKeys = new Set(protectedCells.map(key));
  const changed: Position[] = [];
  const inBounds = (position: Position) => Number.isInteger(position.x) && Number.isInteger(position.y) && Boolean(result[position.y]?.[position.x]);
  if (!inBounds(start)) return { cells: result, changed, passes: 0 };
  const route = (target: Position, horizontalFirst: boolean) => {
    const positions: Position[] = [], cursor = { ...start };
    const step = (axis: 'x' | 'y') => { while (cursor[axis] !== target[axis]) { cursor[axis] += Math.sign(target[axis] - cursor[axis]); positions.push({ ...cursor }); } };
    step(horizontalFirst ? 'x' : 'y'); step(horizontalFirst ? 'y' : 'x');
    return positions;
  };
  for (const target of targets) {
    if (!inBounds(target)) continue;
    const choices = [route(target, true), route(target, false)].filter(path => path.every(position => result[position.y]?.[position.x] && (!protectedKeys.has(key(position)) || result[position.y]![position.x]!.walkable)));
    choices.sort((a, b) => a.filter(position => !result[position.y]![position.x]!.walkable).length - b.filter(position => !result[position.y]![position.x]!.walkable).length);
    for (const position of choices[0] ?? []) {
      const cell = result[position.y]![position.x]!;
      if (cell.walkable || protectedKeys.has(key(position))) continue;
      result[position.y]![position.x] = { ...cell, walkable: true, role: 'ground' }; changed.push(position);
    }
  }
  return { cells: result, changed, passes: changed.length ? 1 : 0 };
}
