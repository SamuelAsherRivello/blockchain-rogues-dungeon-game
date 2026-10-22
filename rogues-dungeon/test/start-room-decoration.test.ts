import assert from "node:assert/strict";
import test from "node:test";
import type { TerrainCell } from "../src/game/types.ts";
import { migrateCampaign } from "../src/systems/persistence/save-system.ts";
import { planStartRoomDecoration } from "../src/content/world/start-wall-autotile.ts";
import { createCampaign, generateFloor, normalizeStartRoomMetadata } from "../src/systems/procedural/world-procedural-system.ts";
import { findCardinalPath } from "../src/game/a-star.ts";
import { WorldRender } from "../src/systems/rendering/world-render-system.ts";

test("generated floors retain deterministic central start-room metadata", () => {
  const first = generateFloor(1, 8128, 1);
  const second = generateFloor(1, 8128, 1);
  assert.deepEqual(first.startRoom, { x: first.start.x - 3, y: first.start.y - 3, w: 7, h: 7 });
  assert.deepEqual(second.startRoom, first.startRoom);
  assert.ok(first.startRoom && first.cells.slice(first.startRoom.y, first.startRoom.y + first.startRoom.h).every(row => row.slice(first.startRoom!.x, first.startRoom!.x + first.startRoom!.w).every(cell => cell.walkable)));
  assert.deepEqual(first.start, second.start);
  const exit = first.entities.find(entity => entity.kind === "stairs" && entity.direction === "forward");
  assert.ok(exit);
  assert.ok((findCardinalPath(first, first.start, exit)?.length ?? 0) > 0);
});

test("saved compatible floors recover metadata without changing their simulation data", () => {
  const campaign = createCampaign(8129);
  const saved = structuredClone(campaign);
  delete saved.floor.startRoom;
  const before = { cells: structuredClone(saved.floor.cells), entities: structuredClone(saved.floor.entities), start: { ...saved.floor.start } };
  const restored = migrateCampaign(saved);
  assert.deepEqual(restored.floor.startRoom, { x: before.start.x - 3, y: before.start.y - 3, w: 7, h: 7 });
  assert.deepEqual(restored.floor.cells, before.cells);
  assert.deepEqual(restored.floor.entities, before.entities);
  delete restored.floor.startRoom;
  normalizeStartRoomMetadata(restored.floor);
  assert.deepEqual(restored.floor.startRoom, { x: before.start.x - 3, y: before.start.y - 3, w: 7, h: 7 });
});

test("start-room decoration uses only the blocked room ring and leaves doorways open", () => {
  const cells: TerrainCell[][] = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => ({ walkable: false, role: "wall" })));
  const room = { x: 3, y: 3, w: 3, h: 3 };
  for (let y = room.y; y < room.y + room.h; y++) for (let x = room.x; x < room.x + room.w; x++) cells[y][x] = { walkable: true, role: "ground" };
  cells[2][4] = { walkable: true, role: "ground" }; // A north doorway must omit a blocking face.
  const plan = planStartRoomDecoration(cells, room);
  const at = (x: number, y: number) => plan.find(entry => entry.x === x && entry.y === y)?.frame;
  assert.deepEqual([at(2, 2), at(6, 2), at(2, 6), at(6, 6)], [0, 5, 48, 53]);
  assert.deepEqual([at(3, 2), at(4, 2), at(5, 2), at(2, 4), at(6, 4), at(4, 6)], [1, undefined, 1, 12, 17, 49]);
  assert.equal(at(1, 1), undefined, "a blocked non-ring cell is not decorated");
  assert.equal(plan.some(entry => entry.frame === 19), false, "opaque obstacle-center art is never selected");
});

test("start-room decoration is game-view-only and leaves shared geometry unchanged", () => {
  const floor = generateFloor(1, 8130, 1);
  const options = { cells: floor.cells, entities: floor.entities, decorations: floor.decorations, objectSets: floor.objectSets, player: { ...floor.start } };
  const game = WorldRender.Render({ ...options, view: "game" });
  const minimap = WorldRender.Render({ ...options, view: "minimap", detail: "simplified" });
  assert.ok(game.wallDecorations.some(decoration => decoration.kind === "start-room-wall"));
  assert.equal(minimap.wallDecorations.some(decoration => decoration.kind === "start-room-wall"), false);
  assert.deepEqual(game.terrain.map(entry => [entry.x, entry.y]), minimap.terrain.map(entry => [entry.x, entry.y]));
  assert.deepEqual(game.walls.map(entry => [entry.x, entry.y, entry.frame]), minimap.walls.map(entry => [entry.x, entry.y, entry.frame]));
});
