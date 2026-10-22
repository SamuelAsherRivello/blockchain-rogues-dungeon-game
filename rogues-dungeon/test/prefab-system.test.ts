import assert from "node:assert/strict";
import test from "node:test";
import { createSemanticCells } from "../src/systems/procedural/level-grid-system.ts";
import { HERO_HOUSE_PREFAB, PLAYER_HOME_PREFAB, stampPrefab, validatePrefab, validatePrefabPlacement } from "../src/systems/procedural/prefab-system.ts";
import { generateFloor } from "../src/systems/procedural/world-procedural-system.ts";

test("validates the hero-house prefab contract and footprint", () => {
  assert.deepEqual(validatePrefab(HERO_HOUSE_PREFAB), []);
  assert.deepEqual(validatePrefabPlacement({ width: 20, height: 20, cells: createSemanticCells(20, 20) }, HERO_HOUSE_PREFAB, { x: 4, y: 4 }), []);
  assert.match(validatePrefabPlacement({ width: 20, height: 20, cells: createSemanticCells(20, 20) }, HERO_HOUSE_PREFAB, { x: 18, y: 18 }).join(" "), /outside map/);
});

test("distinguishes the authored player-home teleport prefab from the stamp prefab", () => {
  assert.deepEqual(validatePrefab(PLAYER_HOME_PREFAB), []);
  assert.equal(PLAYER_HOME_PREFAB.kind, "teleport");
  assert.equal(PLAYER_HOME_PREFAB.assetPath, "assets/art/game-view/maps/prefabs/player-home.tmx");
  assert.deepEqual(PLAYER_HOME_PREFAB.entrances, [{ x: 4, y: 9 }]);
  assert.equal(PLAYER_HOME_PREFAB.cells[9][4].walkable, true);
  assert.equal(PLAYER_HOME_PREFAB.cells[0][0].walkable, false);
});

test("prefab stamping is atomic for protected overlap and coherent when valid", () => {
  const target = { width: 20, height: 20, cells: createSemanticCells(20, 20), protectedCells: [{ x: 4, y: 4 }] };
  const before = JSON.stringify(target.cells);
  assert.throws(() => stampPrefab(target, HERO_HOUSE_PREFAB, { x: 4, y: 4 }), /protected overlap/);
  assert.equal(JSON.stringify(target.cells), before);
  const placement = stampPrefab(target, HERO_HOUSE_PREFAB, { x: 8, y: 8 });
  assert.deepEqual(placement, { prefabId: "hero-house", origin: { x: 8, y: 8 } });
  assert.equal(target.cells[9][9].walkable, true);
  assert.equal(target.cells[8][8].walkable, false);
});

test("player-house generation selects and protects the authored footprint", () => {
  const floor = generateFloor(1, 20261022, 1, { playerHouse: true });
  assert.deepEqual(floor.prefabPlacements, [{ prefabId: "hero-house", origin: { x: 47, y: 47 } }]);
  assert.equal(floor.cells[48][48].protected, true);
  assert.equal(generateFloor(1, 20261022, 1).prefabPlacements?.length ?? 0, 0);
});
