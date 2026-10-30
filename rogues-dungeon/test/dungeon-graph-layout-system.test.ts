import assert from 'node:assert/strict';
import test from 'node:test';
import { generateDungeonGraphLayout, routeDungeonCorridor } from '../src/systems/procedural/dungeon-graph-layout-system.ts';
import { validateDungeonQuality } from '../src/systems/procedural/dungeon-quality-system.ts';
import { dungeonGraphRoute } from '../src/systems/procedural/dungeon-topology-system.ts';

test('graph layout is deterministic, bounded and connects nonoverlapping rooms with semantic terrain', () => {
  const options = { width: 70, height: 70, seed: 42, roomCount: 6, corridorWidth: 3, extraLinks: 2, levelOneChamber: true };
  const original = structuredClone(options), layout = generateDungeonGraphLayout(options);
  assert.deepEqual(generateDungeonGraphLayout(options), layout); assert.deepEqual(options, original);
  assert.equal(layout.rooms.length, options.roomCount);
  assert.equal(layout.topology.edges.filter(edge => edge.kind === 'loop').length, 2);
  for (const edge of layout.topology.edges) {
    const corridor = layout.corridors.find(value => value.edgeId === edge.id)!;
    assert.deepEqual(edge.fromSocket, corridor.path[0]); assert.deepEqual(edge.toSocket, corridor.path.at(-1));
    assert.deepEqual(edge.path, corridor.path); assert.deepEqual(edge.segments, corridor.segments);
    assert.equal('bend' in edge, false);
  }
  const quality = validateDungeonQuality({ ...layout, exit: layout.topology.rooms[layout.topology.exitRoomId]!.center, corridors: layout.corridors.flatMap(corridor => corridor.segments), minimumRoomWidth: 5, minimumRoomHeight: 4 });
  assert.equal(quality.valid, true, JSON.stringify(quality.issues));
  for (const room of layout.topology.rooms) assert.ok(dungeonGraphRoute(layout.rooms.length, layout.topology.edges, 0, room.id).length);
  for (let y = 0; y < layout.height; y++) for (let x = 0; x < layout.width; x++) assert.equal(layout.map[y]![x] === 0, layout.cells[y]![x]!.walkable);
});

test('room placement and full corridor footprints preserve the sealed chamber and external reservations', () => {
  const reservation = { id: 'future-landmark', x: 8, y: 8, w: 8, h: 8 };
  const layout = generateDungeonGraphLayout({ width: 70, height: 70, seed: 1, roomCount: 7, corridorWidth: 5, levelOneChamber: true, reservations: [reservation] });
  const inside = (point: { x: number; y: number }, room: { x: number; y: number; w: number; h: number }) => point.x >= room.x && point.y >= room.y && point.x < room.x + room.w && point.y < room.y + room.h;
  for (const corridor of layout.corridors) for (const point of corridor.cells) for (const region of layout.reservations) assert.equal(inside(point, region), false, `${corridor.edgeId} touches ${region.id}`);
  for (let y = 8; y < 16; y++) for (let x = 8; x < 16; x++) assert.equal(layout.cells[y]![x]!.walkable, false);
  const { bounds, door, goal } = layout.chamber!;
  assert.equal(layout.cells[goal.y]![goal.x]!.walkable, true);
  for (let y = bounds.y; y < bounds.y + bounds.h; y++) for (let x = bounds.x; x < bounds.x + bounds.w; x++) {
    if (x !== bounds.x && x !== bounds.x + bounds.w - 1 && y !== bounds.y && y !== bounds.y + bounds.h - 1) continue;
    assert.equal(layout.cells[y]![x]!.walkable, x === door.x && y === door.y);
  }
});

test('home footprint reserves placement and routes start edges only through its south entrance', () => {
  const home = { x: 32, y: 32, w: 7, h: 7 };
  const layout = generateDungeonGraphLayout({ width: 70, height: 70, seed: 93, roomCount: 6, corridorWidth: 3, homeFootprint: home, levelOneChamber: true });
  assert.deepEqual(layout.homeEntrance, { x: 35, y: 38 });
  for (const corridor of layout.corridors) for (const point of corridor.cells) {
    if (point.x < home.x || point.x >= home.x + home.w || point.y < home.y || point.y >= home.y + home.h) continue;
    assert.equal(point.y, layout.homeEntrance!.y); assert.ok(Math.abs(point.x - layout.homeEntrance!.x) <= 1);
  }
});

test('Level One lockdown fixture is immediately north of the start behind one choke-point door', () => {
  const layout = generateDungeonGraphLayout({ width: 70, height: 70, seed: 93, roomCount: 6, corridorWidth: 3, levelOneLockdownFixture: true });
  const fixture = layout.lockdownFixture!;
  assert.equal(fixture.door.x, layout.start.x);
  assert.equal(fixture.door.y, layout.start.y - 4);
  assert.equal(Math.abs(fixture.door.x - layout.start.x) + Math.abs(fixture.door.y - layout.start.y), 4);
  assert.equal(layout.cells[fixture.door.y]![fixture.door.x]!.walkable, true);
  const walkableNeighbors = [[0, -1], [0, 1], [-1, 0], [1, 0]].filter(([dx, dy]) => layout.cells[fixture.door.y + dy]![fixture.door.x + dx]!.walkable);
  assert.deepEqual(walkableNeighbors, [[0, -1], [0, 1]]);
  assert.equal(layout.cells[fixture.trigger.y]![fixture.trigger.x]!.walkable, true);
});

test('reservation detours retain complete widths and cannot carve through an impassable barrier', () => {
  const obstacle = (point: { x: number; y: number }) => point.x >= 9 && point.x <= 12 && point.y >= 4 && point.y <= 14;
  const path = routeDungeonCorridor({ x: 4, y: 9 }, { x: 18, y: 9 }, 3, { width: 24, height: 22 }, obstacle);
  assert.ok(path.length > 15); assert.ok(path.some(point => point.y < 4 || point.y > 14));
  for (let index = 1; index < path.length; index++) {
    const previous = path[index - 1]!, point = path[index]!;
    assert.equal(Math.abs(point.x - previous.x) + Math.abs(point.y - previous.y), 1);
    for (const current of [previous, point]) for (const offset of [-1, 0, 1]) assert.equal(obstacle({ x: current.x + (point.y === previous.y ? 0 : offset), y: current.y + (point.y === previous.y ? offset : 0) }), false);
  }
  assert.deepEqual(routeDungeonCorridor({ x: 4, y: 9 }, { x: 18, y: 9 }, 3, { width: 24, height: 22 }, point => point.x === 10), []);
});

test('invalid dimensions and impossible reserved layouts fail before activation', () => {
  assert.throws(() => generateDungeonGraphLayout({ width: 15, height: 15, seed: 1, roomCount: 3 }), /integer dimensions/);
  assert.throws(() => generateDungeonGraphLayout({ width: 30, height: 30, seed: 1, roomCount: 100 }), /cannot place/);
  assert.throws(() => generateDungeonGraphLayout({ width: 70, height: 70, seed: 1, roomCount: 4, reservations: [{ id: 'outside', x: -1, y: 0, w: 8, h: 8 }] }), /reservation/);
});

test('seed and width fixtures preserve all room and actual corridor quality constraints', () => {
  for (const seed of [1, 2, 17, 42, 93]) for (const corridorWidth of [1, 2, 3, 4, 5]) {
    const layout = generateDungeonGraphLayout({ width: 70, height: 70, seed, roomCount: 6, corridorWidth, extraLinks: 2, levelOneChamber: true });
    const quality = validateDungeonQuality({ ...layout, exit: layout.topology.rooms[layout.topology.exitRoomId]!.center, corridors: layout.corridors.flatMap(corridor => corridor.segments), minimumRoomWidth: 5, minimumRoomHeight: 4 });
    assert.equal(quality.valid, true, `${seed}/${corridorWidth}: ${JSON.stringify(quality.issues)}`);
  }
  const large = generateDungeonGraphLayout({ width: 200, height: 200, seed: 1234, roomCount: 40, corridorWidth: 5, extraLinks: 5 });
  assert.equal(validateDungeonQuality({ ...large, exit: large.topology.rooms[large.topology.exitRoomId]!.center, corridors: large.corridors.flatMap(corridor => corridor.segments) }).valid, true);
});
