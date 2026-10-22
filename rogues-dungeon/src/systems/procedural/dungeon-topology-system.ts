import type { Position, Room } from '../../game/types.ts';

export const DUNGEON_TOPOLOGY_VERSION = 'dungeon-graph-1';
export type DungeonRoomRole = 'start' | 'arena' | 'treasure' | 'hub' | 'dead-end';
export interface DungeonRoomNode extends Room { id: number; center: Position; roles: DungeonRoomRole[] }
export interface DungeonRoomEdge {
  id: string; from: number; to: number; kind: 'tree' | 'loop';
  fromSocket: Position; toSocket: Position; bend: Position; width: number;
}
export interface DungeonTopology {
  version: typeof DUNGEON_TOPOLOGY_VERSION; seed: number; rooms: DungeonRoomNode[];
  edges: DungeonRoomEdge[]; startRoomId: number; exitRoomId: number; route: number[];
}
export interface DungeonTopologyOptions { corridorWidth?: number; extraLinks?: number; maxDegree?: number; exitRoomId?: number }

function mix(seed: number, from: number, to: number) {
  let value = (seed ^ Math.imul(from + 1, 0x9e3779b1) ^ Math.imul(to + 1, 0x85ebca6b)) >>> 0;
  value = Math.imul(value ^ value >>> 16, 0x7feb352d);
  value = Math.imul(value ^ value >>> 15, 0x846ca68b);
  return (value ^ value >>> 16) >>> 0;
}
export function dungeonRoomCenter(room: Room): Position {
  return { x: room.x + Math.floor(room.w / 2), y: room.y + Math.floor(room.h / 2) };
}
export function corridorOffsets(width: number) {
  if (!Number.isInteger(width) || width < 1) throw new Error('Corridor width must be a positive integer.');
  const low = -Math.floor((width - 1) / 2);
  return Array.from({ length: width }, (_, index) => low + index);
}
/** Socket cross-sections fit within the room, including even corridor widths. */
export function dungeonRoomSocket(room: Room, target: Position, width = 1): Position {
  const offsets = corridorOffsets(width), low = -offsets[0]!, high = offsets.at(-1)!;
  if (width > Math.min(room.w, room.h)) throw new Error('Corridor cross-section does not fit its room.');
  const center = dungeonRoomCenter(room), dx = target.x - center.x, dy = target.y - center.y;
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
  if (Math.abs(dx) >= Math.abs(dy)) return { x: dx < 0 ? room.x : room.x + room.w - 1,
    y: clamp(center.y, room.y + low, room.y + room.h - 1 - high) };
  return { x: clamp(center.x, room.x + low, room.x + room.w - 1 - high), y: dy < 0 ? room.y : room.y + room.h - 1 };
}

/** Width expands perpendicular to each segment. The bend receives both footprints. */
export function dungeonCorridorCells(edge: Pick<DungeonRoomEdge, 'fromSocket' | 'toSocket' | 'bend' | 'width'>): Position[] {
  const cells = new Map<string, Position>(), offsets = corridorOffsets(edge.width);
  for (const [from, to] of [[edge.fromSocket, edge.bend], [edge.bend, edge.toSocket]] as const) {
    if (from.x !== to.x && from.y !== to.y) throw new Error('Corridor segments must be cardinal.');
    if (from.x === to.x && from.y === to.y) continue;
    const horizontal = from.y === to.y, length = Math.abs(to.x - from.x) + Math.abs(to.y - from.y);
    const dx = Math.sign(to.x - from.x), dy = Math.sign(to.y - from.y);
    for (let step = 0; step <= length; step++) for (const offset of offsets) {
      const position = { x: from.x + step * dx + (horizontal ? 0 : offset),
        y: from.y + step * dy + (horizontal ? offset : 0) };
      cells.set(`${position.x},${position.y}`, position);
    }
  }
  return [...cells.values()];
}

export function dungeonGraphRoute(roomCount: number, edges: readonly Pick<DungeonRoomEdge, 'from' | 'to'>[], from: number, to: number) {
  const adjacent = Array.from({ length: roomCount }, () => [] as number[]);
  for (const edge of edges) { adjacent[edge.from]?.push(edge.to); adjacent[edge.to]?.push(edge.from); }
  adjacent.forEach(neighbors => neighbors.sort((a, b) => a - b));
  const previous = new Map<number, number | null>([[from, null]]), queue = [from];
  for (let index = 0; index < queue.length && !previous.has(to); index++) for (const next of adjacent[queue[index]!] ?? []) {
    if (previous.has(next)) continue;
    previous.set(next, queue[index]!); queue.push(next);
  }
  if (!previous.has(to)) return [];
  const route: number[] = [];
  for (let cursor: number | null = to; cursor !== null; cursor = previous.get(cursor) ?? null) route.push(cursor);
  return route.reverse();
}

/** Seeded bounded-degree spanning tree, followed by distinct optional loop edges. */
export function planDungeonTopology(input: readonly Room[], seed: number, options: DungeonTopologyOptions = {}): DungeonTopology {
  if (!input.length) throw new Error('A dungeon graph requires its start room.');
  for (const room of input) if (![room.x, room.y, room.w, room.h].every(Number.isInteger) || room.w < 1 || room.h < 1) {
    throw new Error('Dungeon graph rooms require integer coordinates and positive dimensions.');
  }
  const width = options.corridorWidth ?? 1;
  corridorOffsets(width);
  if (options.maxDegree !== undefined && !Number.isFinite(options.maxDegree) || options.extraLinks !== undefined && !Number.isFinite(options.extraLinks)) {
    throw new Error('Dungeon graph controls must be finite.');
  }
  const maxDegree = Math.max(2, Math.min(6, Math.floor(options.maxDegree ?? 4)));
  const rooms: DungeonRoomNode[] = input.map((room, id) => ({ ...room, id, center: dungeonRoomCenter(room), roles: [] }));
  const candidates: { from: number; to: number; distance: number; order: number }[] = [];
  for (let from = 0; from < rooms.length; from++) for (let to = from + 1; to < rooms.length; to++) {
    candidates.push({ from, to, distance: Math.abs(rooms[from]!.center.x - rooms[to]!.center.x) + Math.abs(rooms[from]!.center.y - rooms[to]!.center.y), order: mix(seed, from, to) });
  }
  candidates.sort((a, b) => a.distance - b.distance || a.order - b.order || a.from - b.from || a.to - b.to);
  const parent = rooms.map(room => room.id), degree = rooms.map(() => 0), edges: DungeonRoomEdge[] = [];
  const root = (id: number): number => parent[id] === id ? id : parent[id] = root(parent[id]!);
  const add = (candidate: typeof candidates[number], kind: DungeonRoomEdge['kind']) => {
    const { from, to } = candidate;
    const fromSocket = dungeonRoomSocket(rooms[from]!, rooms[to]!.center, width);
    const toSocket = dungeonRoomSocket(rooms[to]!, rooms[from]!.center, width);
    const bend = mix(seed ^ 0xa511e9b3, from, to) & 1 ? { x: toSocket.x, y: fromSocket.y } : { x: fromSocket.x, y: toSocket.y };
    edges.push({ id: `room-link-${from}-${to}`, from, to, kind, fromSocket, toSocket, bend, width });
    degree[from]!++; degree[to]!++;
  };
  for (const candidate of candidates) {
    const fromRoot = root(candidate.from), toRoot = root(candidate.to);
    if (fromRoot === toRoot || degree[candidate.from]! >= maxDegree || degree[candidate.to]! >= maxDegree) continue;
    parent[fromRoot] = toRoot; add(candidate, 'tree');
  }
  if (edges.length !== rooms.length - 1) throw new Error('Dungeon graph could not connect every room.');
  const chosen = new Set(edges.map(edge => edge.id));
  const maximumLoops = Math.max(0, Math.min(rooms.length, Math.floor(options.extraLinks ?? 0)));
  let loops = 0;
  for (const candidate of [...candidates].sort((a, b) => a.order - b.order || a.from - b.from || a.to - b.to)) {
    if (loops >= maximumLoops) break;
    if (chosen.has(`room-link-${candidate.from}-${candidate.to}`) || degree[candidate.from]! >= maxDegree || degree[candidate.to]! >= maxDegree) continue;
    add(candidate, 'loop'); loops++;
  }
  const routes = rooms.map(room => dungeonGraphRoute(rooms.length, edges, 0, room.id));
  const farthest = rooms.slice(1).sort((a, b) => routes[b.id]!.length - routes[a.id]!.length || mix(seed, 0, a.id) - mix(seed, 0, b.id));
  const exitRoomId = options.exitRoomId ?? farthest[0]?.id ?? 0;
  if (!rooms[exitRoomId]) throw new Error('Dungeon graph exit room is missing.');
  const arena = rooms.slice(1).sort((a, b) => b.w * b.h - a.w * a.h || a.id - b.id)[0];
  const treasure = farthest.find(room => degree[room.id] === 1) ?? farthest[0];
  for (const room of rooms) {
    if (room.id === 0) room.roles.push('start');
    if (degree[room.id]! >= 3) room.roles.push('hub');
    if (room.id !== 0) {
      if (room.id === arena?.id) room.roles.push('arena');
      if (degree[room.id] === 1) room.roles.push('dead-end');
      if (room.id === treasure?.id) room.roles.push('treasure');
    }
  }
  return { version: DUNGEON_TOPOLOGY_VERSION, seed: seed >>> 0, rooms, edges, startRoomId: 0, exitRoomId,
    route: dungeonGraphRoute(rooms.length, edges, 0, exitRoomId) };
}
