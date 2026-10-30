import test from "node:test";
import assert from "node:assert/strict";
import { applyOverworldScopedPass, generateOverworld } from "../src/systems/procedural/overworld-generation-system.ts";

test("overworld generation is deterministic and exposes tuned dimensions", () => {
  const options = { seed: 4312, width: 48, height: 36, mountainDensity: 0.24, scale: 11 };
  const first = generateOverworld(options);
  const second = generateOverworld(options);
  assert.equal(first.family, "overworld");
  assert.equal(first.width, 48);
  assert.equal(first.height, 36);
  assert.equal(first.seed, 4312);
  assert.equal(first.mountainDensity, 0.24);
  assert.equal(first.scale, 11);
  assert.deepEqual(first.cells, second.cells);
});

test("overworld starts walkable-majority and protects required cells and reserved areas", () => {
  const result = generateOverworld({ seed: 812, width: 40, height: 32, mountainDensity: 0.3, scale: 9,
    start: { x: 2, y: 3 }, exit: { x: 37, y: 28 }, protectedCells: [{ x: 20, y: 15 }],
    reserved: [{ x: 8, y: 7, width: 5, height: 4 }] });
  const walkable = result.cells.flat().filter((cell) => cell.walkable).length;
  assert.ok(walkable > result.width * result.height / 2);
  assert.equal(result.cells[3][2]?.walkable, true);
  assert.equal(result.cells[28][37]?.walkable, true);
  assert.equal(result.cells[15][20]?.walkable, true);
  for (let y = 7; y < 11; y++) for (let x = 8; x < 13; x++) assert.equal(result.cells[y][x]?.walkable, true);
  assert.ok(result.passes.some((pass) => pass.id === "organic-overworld-mountains"));
});

test("overworld density and scale parameters change the generated terrain", () => {
  const sparse = generateOverworld({ seed: 99, width: 60, height: 60, mountainDensity: 0.1, scale: 14 });
  const dense = generateOverworld({ seed: 99, width: 60, height: 60, mountainDensity: 0.38, scale: 14 });
  const broad = generateOverworld({ seed: 99, width: 60, height: 60, mountainDensity: 0.25, scale: 26 });
  const mountainCount = (cells: typeof sparse.cells) => cells.flat().filter((cell) => cell.role === "mountain").length;
  assert.ok(mountainCount(dense.cells) > mountainCount(sparse.cells));
  assert.notDeepEqual(broad.cells, sparse.cells);
});

test("overworld route repair connects edge starts, exits and mandatory landmarks", () => {
  for (const options of [
    { seed: 1, width: 24, height: 18, mountainDensity: 0.65, scale: 5, start: { x: 0, y: 0 }, exit: { x: 23, y: 17 }, landmarks: [{ x: 12, y: 8 }] },
    { seed: 2, width: 31, height: 25, mountainDensity: 0.08, scale: 24, start: { x: 1, y: 12 }, exit: { x: 29, y: 12 }, landmarks: [{ x: 15, y: 22 }] },
    { seed: 3, width: 16, height: 16, mountainDensity: 0.6, scale: 4, start: { x: 8, y: 8 }, exit: { x: 14, y: 1 } },
  ]) {
    const world = generateOverworld(options);
    const queue = [world.start];
    const reached = new Set([`${world.start.x},${world.start.y}`]);
    for (let index = 0; index < queue.length; index++) for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const point = { x: queue[index]!.x + dx, y: queue[index]!.y + dy };
      const key = `${point.x},${point.y}`;
      if (world.cells[point.y]?.[point.x]?.walkable && !reached.has(key)) { reached.add(key); queue.push(point); }
    }
    for (const point of [world.exit, ...(options.landmarks ?? [])]) assert.ok(reached.has(`${point.x},${point.y}`));
    assert.ok(world.cells.flat().some((cell) => cell.role === "mountain"), "route repair should retain organic mountain terrain");
  }
});

test("structured region passes stay inside their reserved overworld scope", () => {
  const world = generateOverworld({ seed: 71, width: 36, height: 30, mountainDensity: 0.31, scale: 7,
    reserved: [{ x: 12, y: 9, width: 8, height: 7 }] });
  const before = structuredClone(world.cells);
  let accepted = 0;
  let rejectedOutside = 0;
  applyOverworldScopedPass(world, { id: "rectilinear-settlement-fixture", scope: { x: 12, y: 9, width: 8, height: 7 }, run({ writeCell }) {
    for (let y = 9; y < 16; y++) for (let x = 12; x < 20; x++) {
      if (x === 12 || y === 9 || x === 19 || y === 15) { if (writeCell(x, y, { walkable: false, role: "wall" })) accepted++; }
    }
    if (!writeCell(20, 12, { walkable: false, role: "wall" })) rejectedOutside++;
  } });
  assert.ok(accepted > 0);
  assert.equal(rejectedOutside, 1);
  assert.equal(world.cells[12]![19]!.role, "wall");
  assert.deepEqual(world.cells[12]![20], before[12]![20]);
  assert.deepEqual(world.cells[8]![13], before[8]![13]);
  assert.ok(world.passes.some((pass) => pass.id === "rectilinear-settlement-fixture"));
});
