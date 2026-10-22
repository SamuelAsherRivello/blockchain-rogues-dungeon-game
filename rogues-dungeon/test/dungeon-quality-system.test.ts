import assert from 'node:assert/strict';
import test from 'node:test';
import type { TerrainCell } from '../src/game/types.ts';
import { repairDungeonRoutes, validateDungeonQuality } from '../src/systems/procedural/dungeon-quality-system.ts';
import { dungeonCorridorCells, planDungeonTopology } from '../src/systems/procedural/dungeon-topology-system.ts';

function fixture() {
  const width = 20, height = 12;
  const rooms = [{ x: 2, y: 2, w: 5, h: 5 }, { x: 12, y: 2, w: 5, h: 5 }];
  const graph = planDungeonTopology(rooms, 17, { corridorWidth: 3 });
  const cells: TerrainCell[][] = Array.from({ length: height }, () => Array.from({ length: width }, () => ({ walkable: false, role: 'wall' })));
  for (const room of rooms) for (let y = room.y; y < room.y + room.h; y++) for (let x = room.x; x < room.x + room.w; x++) cells[y]![x] = { walkable: true, role: 'ground' };
  for (const edge of graph.edges) for (const position of dungeonCorridorCells(edge)) cells[position.y]![position.x] = { walkable: true, role: 'ground' };
  const start = { x: 4, y: 4 }, exit = { x: 14, y: 4 };
  return { width, height, cells, rooms, corridors: graph.edges, start, exit, protectedCells: [start, exit] };
}

test('quality accepts connected semantic rooms, full corridors and protected destinations', () => {
  const result = validateDungeonQuality(fixture());
  assert.equal(result.valid, true); assert.equal(result.routeLength, 10);
  assert.ok(result.reachableCells > 50);
});

test('quality rejects malformed dimensions, semantic roles, bounds and overlapping entities', () => {
  const badDimensions = fixture(); badDimensions.width++;
  assert.equal(validateDungeonQuality(badDimensions).issues[0]!.code, 'grid-dimensions');
  const invalid = fixture(); invalid.cells[4]![4]!.role = 'wall';
  const result = validateDungeonQuality({ ...invalid, entities: [{ id: 'one', x: 5, y: 4 }, { id: 'two', x: 5, y: 4 }, { id: 'outside', x: 99, y: 0 }] });
  for (const code of ['terrain-role', 'entity-overlap', 'entity-cell']) assert.ok(result.issues.some(issue => issue.code === code), code);
});

test('quality detects a thin corridor, blocked protected cells and pacing violations', () => {
  const thin = fixture(); thin.cells[3]![9] = { walkable: false, role: 'wall' };
  assert.ok(validateDungeonQuality(thin).issues.some(issue => issue.code === 'corridor-width'));
  const blocked = fixture(); blocked.cells[4]![14] = { walkable: false, role: 'wall' };
  const issues = validateDungeonQuality(blocked).issues;
  assert.ok(issues.some(issue => issue.code === 'protected-blocked'));
  assert.ok(issues.some(issue => issue.code === 'exit-unreachable'));
  assert.ok(validateDungeonQuality({ ...fixture(), minimumRouteLength: 20 }).issues.some(issue => issue.code === 'route-pacing'));
});

test('one deterministic repair pass reconnects required points without mutating input', () => {
  const cells: TerrainCell[][] = Array.from({ length: 6 }, () => Array.from({ length: 6 }, () => ({ walkable: false, role: 'wall' })));
  const start = { x: 1, y: 1 }, exit = { x: 4, y: 4 };
  cells[1]![1] = { walkable: true, role: 'ground' }; cells[4]![4] = { walkable: true, role: 'ground' };
  const original = structuredClone(cells);
  const repaired = repairDungeonRoutes(cells, start, [exit], [start, exit]);
  assert.deepEqual(repairDungeonRoutes(cells, start, [exit], [start, exit]), repaired);
  assert.deepEqual(cells, original); assert.equal(repaired.passes, 1);
  assert.equal(validateDungeonQuality({ cells: repaired.cells, width: 6, height: 6, start, exit }).valid, true);
  const barrier = Array.from({ length: 6 }, (_, x) => ({ x, y: 2 }));
  assert.equal(repairDungeonRoutes(cells, start, [exit], barrier).changed.length, 0);
  assert.equal(repairDungeonRoutes(cells, start, [{ x: Infinity, y: 0 }]).changed.length, 0);
});
