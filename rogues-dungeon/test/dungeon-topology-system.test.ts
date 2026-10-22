import assert from 'node:assert/strict';
import test from 'node:test';
import type { Room } from '../src/game/types.ts';
import { dungeonCorridorCells, dungeonGraphRoute, dungeonRoomSocket, planDungeonTopology } from '../src/systems/procedural/dungeon-topology-system.ts';

const rooms: Room[] = [
  { x: 20, y: 20, w: 7, h: 7 }, { x: 20, y: 4, w: 9, h: 8 },
  { x: 37, y: 20, w: 7, h: 7 }, { x: 20, y: 37, w: 7, h: 7 },
  { x: 4, y: 20, w: 7, h: 7 }, { x: 39, y: 39, w: 7, h: 7 },
];

test('seeded room graphs connect every room with distinct bounded branches and loops', () => {
  const original = structuredClone(rooms);
  const first = planDungeonTopology(rooms, 17, { extraLinks: 2, corridorWidth: 3 });
  assert.deepEqual(planDungeonTopology(rooms, 17, { extraLinks: 2, corridorWidth: 3 }), first);
  assert.deepEqual(rooms, original);
  assert.equal(first.edges.filter(edge => edge.kind === 'tree').length, rooms.length - 1);
  assert.equal(first.edges.filter(edge => edge.kind === 'loop').length, 2);
  assert.equal(new Set(first.edges.map(edge => edge.id)).size, first.edges.length);
  for (const edge of first.edges) assert.notEqual(edge.from, edge.to);
  for (const room of first.rooms) {
    const route = dungeonGraphRoute(first.rooms.length, first.edges, 0, room.id);
    assert.equal(route[0], 0); assert.equal(route.at(-1), room.id);
    assert.ok(first.edges.filter(edge => edge.from === room.id || edge.to === room.id).length <= 4);
  }
  assert.equal(first.route.at(-1), first.exitRoomId);
});

test('graph roles identify start, arena, treasure, hubs and dead ends', () => {
  const graph = planDungeonTopology(rooms.slice(0, 5), 1);
  const roles = new Set(graph.rooms.flatMap(room => room.roles));
  for (const role of ['start', 'arena', 'treasure', 'hub', 'dead-end'] as const) assert.ok(roles.has(role), role);
  const lone = planDungeonTopology([rooms[0]!], 1);
  assert.deepEqual(lone.route, [0]); assert.deepEqual(lone.edges, []);
  assert.throws(() => planDungeonTopology([], 1), /start room/);
  assert.throws(() => planDungeonTopology(rooms, 1, { extraLinks: NaN }), /finite/);
});

test('corridor cross-sections widen perpendicular to travel without extending their length', () => {
  const horizontal = dungeonCorridorCells({ fromSocket: { x: 4, y: 4 }, bend: { x: 10, y: 4 }, toSocket: { x: 10, y: 4 }, width: 3 });
  assert.equal(horizontal.length, 7 * 3);
  assert.deepEqual([...new Set(horizontal.map(cell => cell.y))], [3, 4, 5]);
  assert.equal(Math.min(...horizontal.map(cell => cell.x)), 4);
  assert.equal(Math.max(...horizontal.map(cell => cell.x)), 10);
  const vertical = dungeonCorridorCells({ fromSocket: { x: 8, y: 4 }, bend: { x: 8, y: 10 }, toSocket: { x: 8, y: 10 }, width: 2 });
  assert.equal(vertical.length, 7 * 2);
  assert.equal(Math.min(...vertical.map(cell => cell.y)), 4);
  assert.equal(Math.max(...vertical.map(cell => cell.y)), 10);
  assert.deepEqual([...new Set(vertical.map(cell => cell.x))], [8, 9]);
});

test('socket, bend and intersection fixtures retain their requested width', () => {
  const room = { x: 2, y: 2, w: 5, h: 5 };
  assert.deepEqual(dungeonRoomSocket(room, { x: 20, y: 4 }, 3), { x: 6, y: 4 });
  assert.deepEqual(dungeonRoomSocket(room, { x: 4, y: -20 }, 3), { x: 4, y: 2 });
  assert.throws(() => dungeonRoomSocket(room, { x: 20, y: 20 }, 6), /does not fit/);
  const cells = dungeonCorridorCells({ fromSocket: { x: 4, y: 4 }, bend: { x: 10, y: 4 }, toSocket: { x: 10, y: 10 }, width: 3 });
  const keys = new Set(cells.map(cell => `${cell.x},${cell.y}`));
  for (const y of [3, 4, 5]) assert.ok(keys.has(`7,${y}`));
  for (const x of [9, 10, 11]) assert.ok(keys.has(`${x},7`));
  const crossing = dungeonCorridorCells({ fromSocket: { x: 7, y: 1 }, bend: { x: 7, y: 8 }, toSocket: { x: 7, y: 8 }, width: 3 });
  crossing.forEach(cell => keys.add(`${cell.x},${cell.y}`));
  for (const x of [6, 7, 8]) for (const y of [3, 4, 5]) assert.ok(keys.has(`${x},${y}`));
});
