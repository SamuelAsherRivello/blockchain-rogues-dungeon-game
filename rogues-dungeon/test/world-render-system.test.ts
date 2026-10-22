import assert from "node:assert/strict";
import test from "node:test";
import { WorldRender, compileStaticWorldPresentation, getVisibleWorldCellBounds, isWorldCellVisible, isWorldChunkVisible } from "../src/systems/rendering/world-render-system.ts";

test("compiled static presentation is reused for unchanged floor layers", () => {
  const cells = [[{ walkable: true, terrain: "floor" }]] as never;
  const ground = [1];
  const walls = [0];
  const first = compileStaticWorldPresentation(cells, 32, ground, walls);
  const second = compileStaticWorldPresentation(cells, 32, ground, walls);

  assert.strictEqual(second, first);
  assert.strictEqual(second.terrain, first.terrain);
});

test("visible world bounds retain a one-cell sprite margin", () => {
  const bounds = getVisibleWorldCellBounds({ x: 10, y: 10 }, 4, 4);
  assert.equal(isWorldCellVisible({ x: 7, y: 10 }, bounds), true);
  assert.equal(isWorldCellVisible({ x: 6, y: 10 }, bounds), false);
});

test("static chunks activate only when they intersect the camera cull area", () => {
  const near = getVisibleWorldCellBounds({ x: 8, y: 8 }, 8, 8);
  const far = getVisibleWorldCellBounds({ x: 40, y: 8 }, 8, 8);
  const firstChunk = { minX: 0, maxX: 15, minY: 0, maxY: 15 };
  const secondChunk = { minX: 32, maxX: 47, minY: 0, maxY: 15 };
  assert.equal(isWorldChunkVisible(firstChunk, near), true);
  assert.equal(isWorldChunkVisible(secondChunk, near), false);
  assert.equal(isWorldChunkVisible(firstChunk, far), false);
  assert.equal(isWorldChunkVisible(secondChunk, far), true);
});

test("discovery does not remove static dungeon geometry", () => {
  const cells = [
    [{ walkable: true, terrain: "floor" }, { walkable: true, terrain: "floor" }],
    [{ walkable: true, terrain: "floor" }, { walkable: true, terrain: "floor" }],
  ] as never;
  const model = WorldRender.Render({ cells, player: { x: 0, y: 0, hasMass: true }, isDiscovered: () => false });

  assert.equal(model.grounds.length, 4);
});
