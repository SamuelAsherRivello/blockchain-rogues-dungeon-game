import type { Position, Room, TerrainCell } from '../../game/types.ts';
import { worldRandom } from './world-attributes.ts';
import { corridorOffsets, dungeonCorridorCells, dungeonRoomCenter, dungeonRoomSocket, planDungeonTopology, type DungeonRoomEdge, type DungeonTopology } from './dungeon-topology-system.ts';

export interface DungeonLayoutReservation extends Room { id: string }
export interface DungeonGraphLayoutOptions {
  width: number; height: number; seed: number;
  /** Total room count, including the start room. */
  roomCount: number; startRoom?: Room; corridorWidth?: number; extraLinks?: number;
  roomClearance?: number; levelOneChamber?: boolean; levelOneLockdownFixture?: boolean;
  /** The caller stamps the authored home after layout and opens this south entrance. */
  homeFootprint?: Room;
  reservations?: readonly DungeonLayoutReservation[];
}
export interface DungeonLayoutCorridor {
  edgeId: string; path: Position[]; cells: Position[]; segments: DungeonRoomEdge[];
}
export interface DungeonRoutedRoomEdge extends Omit<DungeonRoomEdge, 'bend'> {
  /** Actual routed geometry. A reservation detour can contain several bends. */
  path: Position[]; segments: DungeonRoomEdge[];
}
export interface DungeonLayoutTopology extends Omit<DungeonTopology, 'edges'> { edges: DungeonRoutedRoomEdge[] }
export interface DungeonGraphLayout {
  width: number; height: number; cells: TerrainCell[][]; map: number[][];
  start: Position; startRoom: Room; rooms: Room[]; topology: DungeonLayoutTopology;
  corridors: DungeonLayoutCorridor[]; reservations: DungeonLayoutReservation[];
  chamber?: { bounds: Room; door: Position; goal: Position };
  lockdownFixture?: { bounds: Room; room: Room; door: Position; trigger: Position };
  homeEntrance?: Position;
}

const key = (position: Position) => `${position.x},${position.y}`;
const inside = (position: Position, room: Room) => position.x >= room.x && position.x < room.x + room.w && position.y >= room.y && position.y < room.y + room.h;
const overlap = (a: Room, b: Room, clearance = 0) => a.x < b.x + b.w + clearance && a.x + a.w + clearance > b.x && a.y < b.y + b.h + clearance && a.y + a.h + clearance > b.y;
const validRoom = (room: Room) => [room.x, room.y, room.w, room.h].every(Number.isInteger) && room.w > 0 && room.h > 0;

function pathSegments(path: readonly Position[], width: number, edge: DungeonRoomEdge): DungeonRoomEdge[] {
  if (path.length < 2) return [];
  const points = [path[0]!];
  for (let index = 1; index < path.length - 1; index++) {
    const previous = path[index - 1]!, current = path[index]!, next = path[index + 1]!;
    if (current.x - previous.x !== next.x - current.x || current.y - previous.y !== next.y - current.y) points.push(current);
  }
  points.push(path.at(-1)!);
  return points.slice(1).map((toSocket, index) => ({ ...edge, id: `${edge.id}-segment-${index}`, fromSocket: { ...points[index]! }, bend: { ...toSocket }, toSocket: { ...toSocket }, width }));
}

/** Routes full-width footprints. It returns no path when reservations cannot be bypassed. */
export function routeDungeonCorridor(from: Position, to: Position, width: number, bounds: { width: number; height: number }, blocked: (position: Position) => boolean, horizontalFirst = true): Position[] {
  const offsets = corridorOffsets(width);
  if (![bounds.width, bounds.height].every(Number.isSafeInteger) || bounds.width < 3 || bounds.height < 3) return [];
  const legalCell = (position: Position) => position.x > 0 && position.y > 0 && position.x < bounds.width - 1 && position.y < bounds.height - 1 && !blocked(position);
  if (![from.x, from.y, to.x, to.y].every(Number.isSafeInteger) || !legalCell(from) || !legalCell(to)) return [];
  const legalStep = (a: Position, b: Position) => {
    const horizontal = a.y === b.y;
    return [a, b].every(point => offsets.every(offset => legalCell({ x: point.x + (horizontal ? 0 : offset), y: point.y + (horizontal ? offset : 0) })));
  };
  const direct = (first: boolean) => {
    const path = [{ ...from }], cursor = { ...from };
    for (const axis of first ? ['x', 'y'] as const : ['y', 'x'] as const) while (cursor[axis] !== to[axis]) {
      const next = { ...cursor, [axis]: cursor[axis] + Math.sign(to[axis] - cursor[axis]) };
      if (!legalStep(cursor, next)) return [];
      Object.assign(cursor, next); path.push({ ...cursor });
    }
    return path;
  };
  const straight = direct(horizontalFirst);
  if (straight.length) return straight;
  const alternate = direct(!horizontalFirst);
  if (alternate.length) return alternate;
  const directions = horizontalFirst ? [[1, 0], [-1, 0], [0, 1], [0, -1]] as const : [[0, 1], [0, -1], [1, 0], [-1, 0]] as const;
  const queue = [{ ...from }], previous = new Map<string, Position | null>([[key(from), null]]);
  for (let index = 0; index < queue.length && !previous.has(key(to)); index++) {
    const current = queue[index]!;
    for (const [dx, dy] of directions) {
      const next = { x: current.x + dx, y: current.y + dy };
      if (previous.has(key(next)) || !legalStep(current, next)) continue;
      previous.set(key(next), current); queue.push(next);
    }
  }
  if (!previous.has(key(to))) return [];
  const result: Position[] = [];
  for (let cursor: Position | null = to; cursor !== null; cursor = previous.get(key(cursor)) ?? null) result.push({ ...cursor });
  return result.reverse();
}

/** Pure new-version layout. Historical generation never calls this helper. */
export function generateDungeonGraphLayout(options: DungeonGraphLayoutOptions): DungeonGraphLayout {
  const { width, height, seed } = options, corridorWidth = options.corridorWidth ?? 1;
  const clearance = options.roomClearance ?? 2;
  if (![width, height, options.roomCount, clearance, seed].every(Number.isSafeInteger) || width < 20 || height < 20 || options.roomCount < 2 || clearance < 1) throw new Error('Dungeon layout requires integer dimensions, seed, room count and positive clearance.');
  if (options.roomCount > width * height / 20) throw new Error(`Dungeon layout cannot place ${options.roomCount} rooms within its dimensions.`);
  corridorOffsets(corridorWidth);
  if (corridorWidth > 5) throw new Error('Dungeon layout corridor width must not exceed five cells.');
  const startRoom = { ...(options.startRoom ?? { x: Math.floor(width / 2) - 3, y: Math.floor(height / 2) - 3, w: 7, h: 7 }) };
  const inBounds = (room: Room) => validRoom(room) && room.x >= 2 && room.y >= 2 && room.x + room.w <= width - 2 && room.y + room.h <= height - 2;
  if (!inBounds(startRoom) || Math.min(startRoom.w, startRoom.h) < corridorWidth) throw new Error('Dungeon start room does not fit the layout.');
  const start = dungeonRoomCenter(startRoom), reservations = (options.reservations ?? []).map(region => ({ ...region }));
  const chamber = options.levelOneChamber ? { bounds: { x: start.x + 4, y: start.y - 2, w: 5, h: 5 }, door: { x: start.x + 4, y: start.y }, goal: { x: start.x + 6, y: start.y } } : undefined;
  const lockdownFixture = options.levelOneLockdownFixture ? {
    bounds: { x: start.x - 3, y: start.y - 9, w: 7, h: 6 },
    room: { x: start.x - 2, y: start.y - 8, w: 5, h: 4 },
    door: { x: start.x, y: start.y - 4 }, trigger: { x: start.x, y: start.y - 5 },
  } : undefined;
  if (chamber) reservations.push({ id: 'level-one-chamber', ...chamber.bounds });
  if (lockdownFixture) reservations.push({ id: 'level-one-lockdown-fixture', ...lockdownFixture.bounds });
  const home = options.homeFootprint ? { ...options.homeFootprint } : undefined;
  const homeEntrance = home ? { x: home.x + Math.floor(home.w / 2), y: home.y + home.h - 1 } : undefined;
  if (home) reservations.push({ id: 'player-home-footprint', ...home });
  if (reservations.some(region => !inBounds(region))) throw new Error('Dungeon reservation does not fit the layout.');
  if (reservations.some(region => region.id !== 'player-home-footprint' && overlap(region, startRoom))) throw new Error('Dungeon reservation overlaps the start room.');
  if (home && (!inside(start, home) || home.w < corridorWidth || home.h < corridorWidth)) throw new Error('The home footprint must contain the start and fit its corridor.');
  const rooms: Room[] = [startRoom], random = worldRandom(seed, 'dungeon-graph-rooms');
  const canPlace = (room: Room) => inBounds(room) && !rooms.some(other => overlap(room, other, clearance)) && !reservations.some(region => overlap(room, region, clearance));
  const attempts = options.roomCount * 80;
  for (let attempt = 0; attempt < attempts && rooms.length < options.roomCount; attempt++) {
    const room = { x: 0, y: 0, w: 5 + Math.floor(random() * 5), h: Math.max(corridorWidth, 4 + Math.floor(random() * 4)) };
    room.x = 2 + Math.floor(random() * (width - room.w - 3)); room.y = 2 + Math.floor(random() * (height - room.h - 3));
    if (canPlace(room)) rooms.push(room);
  }
  // Stable scan completes cramped fixtures without an unbounded random retry.
  for (let y = 2; y < height - 6 && rooms.length < options.roomCount; y++) for (let x = 2; x < width - 7 && rooms.length < options.roomCount; x++) {
    const room = { x, y, w: 5, h: Math.max(4, corridorWidth) };
    if (canPlace(room)) rooms.push(room);
  }
  if (rooms.length !== options.roomCount) throw new Error(`Dungeon layout cannot place ${options.roomCount} rooms with its reservations and clearance.`);
  const topology = planDungeonTopology(rooms, seed, { corridorWidth, extraLinks: options.extraLinks });
  const cells: TerrainCell[][] = Array.from({ length: height }, () => Array.from({ length: width }, () => ({ walkable: false, role: 'wall' })));
  const carve = (position: Position) => { cells[position.y]![position.x] = { walkable: true, role: 'ground' }; };
  for (const room of rooms) for (let y = room.y; y < room.y + room.h; y++) for (let x = room.x; x < room.x + room.w; x++) carve({ x, y });
  const corridors: DungeonLayoutCorridor[] = [];
  const homeOffsets = new Set(corridorOffsets(corridorWidth).map(offset => (homeEntrance?.x ?? 0) + offset));
  for (const edge of topology.edges) {
    const fromRoom = rooms[edge.from]!, toRoom = rooms[edge.to]!;
    const blocked = (position: Position) => reservations.some(region => inside(position, region) && !(region.id === 'player-home-footprint' && homeEntrance && position.y === homeEntrance.y && homeOffsets.has(position.x)))
      || rooms.some((room, index) => index !== edge.from && index !== edge.to && inside(position, room));
    const socketChoices = (room: Room, target: Position, id: number) => {
      if (id === 0 && homeEntrance) return [{ ...homeEntrance }];
      const targets = [target, { x: -width, y: room.y }, { x: width * 2, y: room.y }, { x: room.x, y: -height }, { x: room.x, y: height * 2 }];
      const unique = new Map(targets.map(position => { const socket = dungeonRoomSocket(room, position, corridorWidth); return [key(socket), socket]; }));
      return [...unique.values()];
    };
    let path: Position[] = [];
    for (const from of socketChoices(fromRoom, dungeonRoomCenter(toRoom), edge.from)) {
      for (const to of socketChoices(toRoom, dungeonRoomCenter(fromRoom), edge.to)) {
        path = routeDungeonCorridor(from, to, corridorWidth, { width, height }, blocked, (seed + edge.from + edge.to) % 2 === 0);
        if (path.length) break;
      }
      if (path.length) break;
    }
    if (!path.length) throw new Error(`Dungeon corridor ${edge.id} cannot bypass its reservations.`);
    const segments = pathSegments(path, corridorWidth, edge), footprint = new Map<string, Position>();
    for (const segment of segments) for (const position of dungeonCorridorCells(segment)) { footprint.set(key(position), position); carve(position); }
    corridors.push({ edgeId: edge.id, path, segments, cells: [...footprint.values()] });
  }
  if (chamber) {
    for (let y = chamber.bounds.y; y < chamber.bounds.y + chamber.bounds.h; y++) for (let x = chamber.bounds.x; x < chamber.bounds.x + chamber.bounds.w; x++) {
      const interior = x > chamber.bounds.x && x < chamber.bounds.x + chamber.bounds.w - 1 && y > chamber.bounds.y && y < chamber.bounds.y + chamber.bounds.h - 1;
      cells[y]![x] = { walkable: interior, role: interior ? 'ground' : 'wall' };
    }
    carve(chamber.door);
  }
  if (lockdownFixture) {
    for (let y = lockdownFixture.bounds.y; y < lockdownFixture.bounds.y + lockdownFixture.bounds.h; y++) for (let x = lockdownFixture.bounds.x; x < lockdownFixture.bounds.x + lockdownFixture.bounds.w; x++) {
      cells[y]![x] = { walkable: false, role: 'wall' };
    }
    for (let y = lockdownFixture.room.y; y < lockdownFixture.room.y + lockdownFixture.room.h; y++) for (let x = lockdownFixture.room.x; x < lockdownFixture.room.x + lockdownFixture.room.w; x++) carve({ x, y });
    carve(lockdownFixture.door);
  }
  const routedTopology: DungeonLayoutTopology = { ...topology, edges: topology.edges.map((edge, index) => {
    const { bend: _plannedBend, ...metadata } = edge, corridor = corridors[index]!;
    return { ...metadata, fromSocket: { ...corridor.path[0]! }, toSocket: { ...corridor.path.at(-1)! }, path: corridor.path, segments: corridor.segments };
  }) };
  return { width, height, cells, map: cells.map(row => row.map(cell => cell.walkable ? 0 : 1)), start, startRoom, rooms, topology: routedTopology, corridors, reservations, ...(chamber ? { chamber } : {}), ...(lockdownFixture ? { lockdownFixture } : {}), ...(homeEntrance ? { homeEntrance } : {}) };
}
