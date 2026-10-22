import test from "node:test";
import assert from "node:assert/strict";
import { createCampaign, effectiveAwareness, gameMode } from "../src/systems/procedural/world-procedural-system.ts";
import { tacticalRectangles, tacticalRowSpans, tacticalContains } from "../src/game/tactical-area.ts";

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
  assert.equal(tacticalContains(area, { x: 19, y: 19 }), false, "left boundary stays unchanged");
  assert.equal(tacticalContains(area, { x: 31, y: 19 }), false, "right boundary stays unchanged");
  assert.equal(tacticalContains(area, { x: 25, y: 21 }), false, "bottom boundary stays unchanged");
  campaign.floor.cells[20][25].walkable = false;
  assert.equal(gameMode(campaign), "Battle");
  assert.deepEqual(tacticalRectangles(campaign), [{ minX: 20, maxX: 20, minY: 19, maxY: 20 }]);
  enemy.hp = 0; assert.equal(gameMode(campaign), "General");
});

test("rectangle union includes endpoints, clips to viewport, and never doubles overlapping cells", () => {
  const rectangles = [{ minX: 1, maxX: 4, minY: 1, maxY: 4 }, { minX: 3, maxX: 6, minY: 2, maxY: 5 }];
  const spans = tacticalRowSpans(rectangles, { minX: 0, maxX: 5, minY: 0, maxY: 5 });
  const cells = spans.flatMap((span) => Array.from({ length: span.width }, (_, x) => `${span.x + x},${span.y}`));
  assert.equal(cells.length, new Set(cells).size);
  assert.ok(cells.includes("1,1")); assert.ok(cells.includes("4,4")); assert.ok(!cells.includes("6,3"));
  assert.ok(!cells.includes("1,5")); assert.ok(cells.includes("5,5"));
});
