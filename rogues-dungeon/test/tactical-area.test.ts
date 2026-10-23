import test from "node:test";
import assert from "node:assert/strict";
import { createCampaign, effectiveAwareness, gameMode } from "../src/systems/procedural/world-procedural-system.ts";
import { tacticalRectangles, tacticalRowSpans, tacticalContains } from "../src/game/tactical-area.ts";
import { detectedEnemyIds } from "../src/game/enemy-detection.ts";

test("Perception extends warning without extending AI range or disclosing hidden enemies", () => {
  const campaign = createCampaign(4321);
  const enemy = campaign.floor.entities.find((entity) => entity.kind === "enemy")!;
  assert.equal(enemy.kind, "enemy"); if (enemy.kind !== "enemy") return;
  campaign.floor.entities = [enemy]; campaign.floor.objectSets = []; delete campaign.floor.map;
  campaign.floor.cells = Array.from({ length: 100 }, () => Array.from({ length: 100 }, () => ({ walkable: true, role: "floor" })));
  campaign.player.x = 20; campaign.player.y = 20;
  enemy.x = 30; enemy.y = 20; enemy.awareness = 3;
  campaign.progression.attributes.perception = 4; assert.equal(gameMode(campaign), "General");
  campaign.progression.attributes.perception = 5; assert.equal(gameMode(campaign), "Battle");
  assert.equal(effectiveAwareness(campaign, enemy), 3);
  assert.equal(tacticalContains(tacticalRectangles(campaign), enemy), true);
  const area = tacticalRectangles(campaign);
  assert.equal(tacticalContains(area, { x: 25, y: 19 }), true, "one extra row protects character artwork");
  assert.equal(tacticalContains(area, { x: 25, y: 18 }), false, "only one row is added");
  assert.equal(tacticalContains(area, { x: 18, y: 19 }), false, "minimum focus is only three cells wide");
  assert.equal(tacticalContains(area, { x: 31, y: 19 }), false, "right boundary stays unchanged");
  assert.equal(tacticalContains(area, { x: 25, y: 21 }), false, "bottom boundary stays unchanged");
  campaign.floor.cells[20][25].walkable = false;
  assert.equal(gameMode(campaign), "Battle");
  assert.deepEqual(tacticalRectangles(campaign), [{ minX: 19, maxX: 21, minY: 18, maxY: 21 }]);
  enemy.hp = 0; assert.equal(gameMode(campaign), "General");
});

test("Battle focus reaches a clear-line threat before its sprite is detected and keeps a useful minimum behind walls", () => {
  const campaign = createCampaign(4321);
  const enemy = campaign.floor.entities.find((entity) => entity.kind === "enemy")!;
  assert.equal(enemy.kind, "enemy"); if (enemy.kind !== "enemy") return;
  campaign.floor.entities = [enemy]; campaign.floor.objectSets = []; delete campaign.floor.map;
  campaign.floor.cells = Array.from({ length: 100 }, () => Array.from({ length: 100 }, () => ({ walkable: true, role: "floor" })));
  campaign.player.x = 20; campaign.player.y = 20; campaign.progression.attributes.perception = 0;
  enemy.x = 25; enemy.y = 20; enemy.awareness = 6;
  assert.equal(gameMode(campaign), "Battle");
  assert.equal(tacticalContains(tacticalRectangles(campaign, new Set()), enemy), true, "clear-line focus is independent of sprite detection");
  assert.equal(detectedEnemyIds(campaign).size, 0, "spatial focus does not reveal the low-Perception enemy sprite");
  const second = { ...structuredClone(enemy), id: "farther", x: 20, y: 26 };
  campaign.floor.entities.push(second);
  assert.equal(tacticalContains(tacticalRectangles(campaign, new Set()), second), false, "only the nearest clear-line hidden threat contributes");
  campaign.floor.cells[20][22].walkable = false;
  campaign.floor.cells[22][20].walkable = false;
  const hiddenArea = tacticalRectangles(campaign, new Set());
  assert.equal(tacticalContains(hiddenArea, enemy), false);
  assert.equal(tacticalContains(hiddenArea, second), false);
  for (let y = 18; y <= 21; y++) for (let x = 19; x <= 21; x++) assert.equal(tacticalContains(hiddenArea, { x, y }), true);
});

test("rectangle union includes endpoints, clips to viewport, and never doubles overlapping cells", () => {
  const rectangles = [{ minX: 1, maxX: 4, minY: 1, maxY: 4 }, { minX: 3, maxX: 6, minY: 2, maxY: 5 }];
  const spans = tacticalRowSpans(rectangles, { minX: 0, maxX: 5, minY: 0, maxY: 5 });
  const cells = spans.flatMap((span) => Array.from({ length: span.width }, (_, x) => `${span.x + x},${span.y}`));
  assert.equal(cells.length, new Set(cells).size);
  assert.ok(cells.includes("1,1")); assert.ok(cells.includes("4,4")); assert.ok(!cells.includes("6,3"));
  assert.ok(!cells.includes("1,5")); assert.ok(cells.includes("5,5"));
});
