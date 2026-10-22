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

test("enemy test mode places one of every ranked enemy near the entrance", () => {
  const floor = generateFloor(1, 17, 1, { level1EnemyTestMode: true });
  const enemies = floor.entities.filter((entity) => entity.kind === "enemy");
  assert.deepEqual(enemies.map((enemy) => enemy.name), ENEMY_DEFINITIONS.map((enemy) => enemy.name));
  assert.ok(enemies.every((enemy) => Math.max(Math.abs(enemy.x - floor.start.x), Math.abs(enemy.y - floor.start.y)) <= 50));
  assert.deepEqual(enemies.map((enemy) => ({ character: enemy.character, graphic: enemy.graphic, idle: enemy.idle })), ENEMY_DEFINITIONS.map((enemy) => ({ character: enemy.character, graphic: enemy.graphic, idle: enemy.idle })));
});

test("item and enemy test modes do not suppress each other's normal generation", () => {
  const itemTestFloor = generateFloor(1, 17, 1, { level1ObjectTestMode: true });
  const enemyTestFloor = generateFloor(1, 17, 1, { level1EnemyTestMode: true });

  assert.equal(itemTestFloor.entities.some((entity) => entity.kind === "enemy" && entity.id.startsWith("test-")), false);
  assert.ok(itemTestFloor.entities.some((entity) => entity.kind === "enemy" && !entity.id.startsWith("test-")));
  assert.equal(enemyTestFloor.entities.some((entity) => entity.kind === "item" && entity.id.startsWith("test-item")), false);
  assert.ok(enemyTestFloor.entities.some((entity) => entity.kind === "enemy" && entity.id.startsWith("test-")));
});

test("disabled enemy test mode does not add enemies beside the entrance", () => {
  const floor = generateFloor(1, 17, 1, { level1EnemyTestMode: false });
  assert.equal(floor.entities.some((entity) => entity.kind === "enemy" && entity.id.startsWith("test-")), false);
  assert.ok(floor.entities.filter((entity) => entity.kind === "enemy").every((enemy) => Math.max(Math.abs(enemy.x - floor.start.x), Math.abs(enemy.y - floor.start.y)) > 15));
});
