import test from "node:test";
import assert from "node:assert/strict";
import { generateOverworldFloor } from "../src/systems/procedural/world-procedural-system.ts";
import { WorldRender } from "../src/systems/rendering/world-render-system.ts";
import { minimapMarkerEntries } from "../src/systems/rendering/minimap-presentation.ts";
import { applyAction, compactCampaignForSave, createRunCampaign, restoreCompactCampaign } from "../src/systems/procedural/world-procedural-system.ts";

test("game view and minimap consume overworld semantic cells in the same coordinates", () => {
  const floor = generateOverworldFloor(1, 991);
  const player = { ...floor.start, hasMass: true };
  const game = WorldRender.Render({ cells: floor.cells, entities: floor.entities, player, start: floor.start, view: "game" });
  const minimap = WorldRender.Render({ cells: floor.cells, entities: floor.entities, player, start: floor.start, view: "minimap" });
  assert.equal(game.width, floor.width);
  assert.equal(game.height, floor.height);
  assert.deepEqual(game.terrain.map(({ x, y }) => `${x},${y}`), minimap.terrain.map(({ x, y }) => `${x},${y}`));
  assert.deepEqual(game.walls.map(({ x, y }) => `${x},${y}`), minimap.walls.map(({ x, y }) => `${x},${y}`));
  assert.ok(game.walls.length > 0);
  assert.ok(game.walls.some((cell) => cell.role === "mountain"));
  assert.equal(game.objects.find((object) => object.kind === "stairs")?.x, floor.entities.find((entity) => entity.kind === "stairs" && entity.direction === "forward")?.x);
  assert.deepEqual(minimapMarkerEntries(game, player, new Set(), (_id, fallback) => fallback)[0]?.position, player);
});

test("overworld family selects a seeded semantic level through the campaign generator", async () => {
  const { generatedFloorForCampaign } = await import("../src/systems/procedural/world-procedural-system.ts");
  const campaign = createRunCampaign(1883, 1, 1, 1, 1, { worldFamily: "overworld" });
  const regenerated = generatedFloorForCampaign(campaign, 1);
  assert.equal(campaign.worldFamily, "overworld");
  assert.equal(campaign.floor.family, "overworld");
  assert.equal(regenerated.family, "overworld");
  assert.deepEqual(regenerated.cells, campaign.floor.cells);
});

test("overworld stairs persist paired return positions across level three and save restore", () => {
  const campaign = createRunCampaign(88213, 1, 1, 1, 1, { worldFamily: "overworld", mode: "classic" });
  const firstForward = campaign.floor.entities.find((entity) => entity.kind === "stairs" && entity.direction === "forward")!;
  campaign.player.x = firstForward.x;
  campaign.player.y = firstForward.y;
  let state = applyAction(campaign, { type: "enter-stairs" }).state;
  assert.equal(state.floor.level, 2);
  const firstBack = state.floor.entities.find((entity) => entity.kind === "stairs" && entity.direction === "back")!;
  assert.deepEqual({ x: state.player.x, y: state.player.y }, { x: firstBack.x + 1, y: firstBack.y });
  const firstReturn = structuredClone(state.levelTransitions?.["1:2"]?.fromPosition);
  const saved = JSON.parse(JSON.stringify(compactCampaignForSave(state)));
  state = restoreCompactCampaign(saved);
  const secondBack = state.floor.entities.find((entity) => entity.kind === "stairs" && entity.direction === "back")!;
  state.player.x = secondBack.x;
  state.player.y = secondBack.y;
  state = applyAction(state, { type: "enter-stairs" }).state;
  assert.equal(state.floor.level, 1);
  assert.deepEqual({ x: state.player.x, y: state.player.y }, firstReturn);

  const reusedForward = state.floor.entities.find((entity) => entity.kind === "stairs" && entity.direction === "forward")!;
  state.player.x = reusedForward.x;
  state.player.y = reusedForward.y;
  state = applyAction(state, { type: "enter-stairs" }).state;
  const secondForward = state.floor.entities.find((entity) => entity.kind === "stairs" && entity.direction === "forward")!;
  state.player.x = secondForward.x;
  state.player.y = secondForward.y;
  state = applyAction(state, { type: "enter-stairs" }).state;
  assert.equal(state.floor.level, 3);
  const secondReturn = structuredClone(state.levelTransitions?.["2:3"]?.fromPosition);
  const thirdBack = state.floor.entities.find((entity) => entity.kind === "stairs" && entity.direction === "back")!;
  state.player.x = thirdBack.x;
  state.player.y = thirdBack.y;
  state = applyAction(state, { type: "enter-stairs" }).state;
  assert.equal(state.floor.level, 2);
  assert.deepEqual({ x: state.player.x, y: state.player.y }, secondReturn);
});
