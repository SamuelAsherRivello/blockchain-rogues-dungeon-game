import assert from "node:assert/strict";
import test from "node:test";
import { ENEMY_DEFINITIONS, enemyDefinitionsForWorldLevel } from "../src/content/enemies/enemy-catalog.ts";
import { generateFloor } from "../src/systems/procedural/world-procedural-system.ts";

test("enemy difficulty stats increase with the agreed rank", () => {
  for (let index = 1; index < ENEMY_DEFINITIONS.length; index++) {
    assert.ok(ENEMY_DEFINITIONS[index].hp > ENEMY_DEFINITIONS[index - 1].hp);
    assert.ok(ENEMY_DEFINITIONS[index].damage > ENEMY_DEFINITIONS[index - 1].damage);
  }
});

test("world levels unlock only the allowed enemy ranks", () => {
  assert.deepEqual(enemyDefinitionsForWorldLevel(1).map((enemy) => enemy.rank), [1, 2]);
  assert.deepEqual(enemyDefinitionsForWorldLevel(2).map((enemy) => enemy.rank), [1, 2, 3]);
  assert.deepEqual(enemyDefinitionsForWorldLevel(3).map((enemy) => enemy.rank), [1, 2, 3, 4]);
});

test("level-one test mode places one of every ranked enemy near the entrance", () => {
  const floor = generateFloor(1, 17, 1, { level1TestMode: true });
  const enemies = floor.entities.filter((entity) => entity.kind === "enemy");
  assert.deepEqual(enemies.map((enemy) => enemy.name), ENEMY_DEFINITIONS.map((enemy) => enemy.name));
  assert.ok(enemies.every((enemy) => Math.max(Math.abs(enemy.x - floor.start.x), Math.abs(enemy.y - floor.start.y)) <= 50));
});
