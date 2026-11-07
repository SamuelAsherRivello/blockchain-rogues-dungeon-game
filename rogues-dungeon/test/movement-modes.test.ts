import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getMousePathResult, getMouseMovementFromSelectedCell, MAX_MOUSE_TRAVEL_STEPS, planMouseTravel } from "../src/game/mouse-selection.ts";
import { applyAction, createCampaign, effectiveAttributes, gameMode, isObjectSetBlocked, isObjectSetDoorOpen, progressionStatNames, upgradeCampaignResources } from "../src/systems/procedural/world-procedural-system.ts";
import { normalizePreferences, migrateCampaign } from "../src/systems/persistence/save-system.ts";
import { cellCenter, centerCrossings, normalizePlayerPosition, occupiedCell, PixelMovementIntegrator } from "../src/game/player-position.ts";
import { TurnPresentationSystem } from "../src/systems/animation/turn-presentation-system.ts";
import { resolveWorldCursor } from "../src/game/world-cursor.ts";
import { createHeroWarriorAnimationEntity, heroWarriorRunAnimationForHeading } from "../src/content/characters/hero-warrior/hero-warrior-animation.ts";
import { isWalkable, setCell } from "../src/systems/procedural/level-grid-system.ts"; import { detectedEnemyIds, hasPerceptionLineOfSight } from "../src/game/enemy-detection.ts";
import { WorldRender } from "../src/systems/rendering/world-render-system.ts";

function arena() {
  const campaign = createCampaign(90210);
  campaign.floor.cells = Array.from({ length: 100 }, () => Array.from({ length: 100 }, () => ({ walkable: true, role: "floor" })));
  delete campaign.floor.map;
  campaign.floor.entities = []; campaign.floor.objectSets = []; campaign.floor.decorations = [];
  campaign.counters.gold = 0;
  campaign.player.x = 20; campaign.player.y = 20; campaign.player.pixel = cellCenter(campaign.player);
  return campaign;
}

test("open authored front and side doors make their doorway cells walkable", () => {
  for (const { openGid, closedGid, doorwayCells, start, goal, direction } of [
    { openGid: 155, closedGid: 154, doorwayCells: [{ x: 21, y: 20 }], start: { x: 21, y: 19 }, goal: { x: 21, y: 21 }, direction: "s" },
    { openGid: 159, closedGid: 158, doorwayCells: [{ x: 21, y: 20 }, { x: 22, y: 20 }], start: { x: 20, y: 20 }, goal: { x: 23, y: 20 }, direction: "e" },
  ]) {
    const campaign = arena();
    campaign.player.x = start.x; campaign.player.y = start.y;
    campaign.floor.tiledDecorations = [{ x: 21, y: 20, gid: openGid }];
    for (let y = 0; y < 100; y++) for (let x = 0; x < 100; x++) setCell(campaign.floor, x, y, { walkable: false });
    setCell(campaign.floor, 21, 20, { walkable: false });
    if (openGid === 159) setCell(campaign.floor, 22, 20, { walkable: false });
    setCell(campaign.floor, start.x, start.y, { walkable: true }); setCell(campaign.floor, goal.x, goal.y, { walkable: true });
    const route = getMousePathResult(goal, campaign);
    assert.equal(route.reachable, true, `open door GID ${openGid} must admit a mouse route`);
    assert.equal(resolveWorldCursor(campaign, goal, route.reachable, new Set()), "walk");
    assert.equal(getMouseMovementFromSelectedCell({ ...goal, pressed: true }, campaign, route.path)?.direction, direction);
    assert.ok(doorwayCells.every(cell => isWalkable(campaign.floor, cell.x, cell.y)));
    let state = campaign;
    const steps = Math.abs(goal.x - start.x) + Math.abs(goal.y - start.y);
    for (let step = 0; step < steps; step++) {
      const moved = applyAction(state, { type: "move", direction });
      assert.equal(moved.accepted, true, `open door GID ${openGid} must allow crossing step ${step + 1}`);
      state = moved.state;
    }
    assert.deepEqual({ x: state.player.x, y: state.player.y }, goal);
    campaign.floor.tiledDecorations = [{ x: 21, y: 20, gid: closedGid }];
    assert.ok(doorwayCells.every(cell => !isWalkable(campaign.floor, cell.x, cell.y)), `closed door GID ${closedGid} must block its aperture`);
  }
});

test("mouse routes cross encounter doors whenever they are open", () => {
  const campaign = arena();
  for (let y = 0; y < 100; y++) for (let x = 0; x < 100; x++) setCell(campaign.floor, x, y, { walkable: y === 20 && x >= 20 && x <= 23 });
  const door = { x: 21, y: 20 }, target = { x: 23, y: 20 };
  campaign.floor.objectSets = [{ id: "arena", kind: "enemy-locked-door", doors: [door], triggers: [{ x: 22, y: 20 }], room: { x: 22, y: 20, w: 2, h: 1 }, enemyIds: [], regionRole: "optional-reward", activated: false, completed: false }];
  const encounter = campaign.floor.objectSets[0];
  for (const state of [{ activated: false, completed: false }, { activated: true, completed: true }]) {
    Object.assign(encounter, state);
    const route = getMousePathResult(target, campaign, cell => cell.x !== door.x);
    assert.equal(route.reachable, true);
    assert.deepEqual(route.path?.map(cell => cell.x), [20, 21, 22, 23]);
    assert.equal(getMouseMovementFromSelectedCell({ ...target, pressed: true }, campaign, route.path, cell => cell.x !== door.x)?.direction, "e");
  }
  Object.assign(encounter, { activated: true, completed: false });
  assert.equal(getMousePathResult(target, campaign).reachable, false);
});

test("open side puzzle doors keep both doorway cells passable until the player clears them", () => {
  const campaign = arena();
  for (let y = 0; y < 100; y++) for (let x = 0; x < 100; x++) setCell(campaign.floor, x, y, { walkable: y === 20 && x >= 20 && x <= 24 });
  campaign.floor.objectSets = [{ id: "side-gate", kind: "barrel-panel-door", barrel: { x: 18, y: 20 }, trigger: { x: 21, y: 20 }, door: { x: 22, y: 20 }, regionRole: "optional-reward" }];
  setCell(campaign.floor, 22, 20, { walkable: false }); setCell(campaign.floor, 23, 20, { walkable: false });
  campaign.player.x = 21; campaign.player.y = 20;
  const target = { x: 24, y: 20 };
  const route = getMousePathResult(target, campaign);
  assert.equal(route.reachable, true);
  assert.equal(resolveWorldCursor(campaign, target, route.reachable, new Set()), "walk");
  assert.equal(getMouseMovementFromSelectedCell({ ...target, pressed: true }, campaign, route.path)?.direction, "e");
  assert.equal(isWalkable(campaign.floor, 22, 20), true);
  assert.equal(isWalkable(campaign.floor, 23, 20), true);
  let state = campaign;
  for (let step = 0; step < 3; step++) {
    const moved = applyAction(state, { type: "move", direction: "e" });
    assert.equal(moved.accepted, true, `crossing step ${step + 1} must pass through the open side door`);
    state = moved.state;
    const door = state.floor.objectSets![0]!;
    assert.equal(isObjectSetDoorOpen(door as Extract<typeof door, { kind: "barrel-panel-door" }>, state.player, state.floor.entities, [{ x: 22, y: 20 }, { x: 23, y: 20 }]), step < 2);
    if (step === 1) {
      const renderedDoor = WorldRender.Render({ cells: state.floor.cells, entities: state.floor.entities, objectSets: state.floor.objectSets, player: state.player }).puzzleObjects.find((object) => object.kind === "door");
      assert.equal(renderedDoor?.active, true, "the door art remains open while the player occupies its second aperture cell");
    }
  }
  assert.deepEqual({ x: state.player.x, y: state.player.y }, target);
  assert.equal(isObjectSetBlocked(state.floor, state.player, 22, 20), true);
  assert.equal(isObjectSetBlocked(state.floor, state.player, 23, 20), true);
});

test("open front puzzle doors allow vertical mouse routes and movement", () => {
  const campaign = arena();
  for (let y = 0; y < 100; y++) for (let x = 0; x < 100; x++) setCell(campaign.floor, x, y, { walkable: x === 20 && y >= 19 && y <= 23 });
  campaign.floor.objectSets = [{ id: "front-gate", kind: "barrel-panel-door", barrel: { x: 18, y: 20 }, trigger: { x: 20, y: 20 }, door: { x: 20, y: 21 }, regionRole: "optional-reward" }];
  setCell(campaign.floor, 20, 21, { walkable: false });
  campaign.player.x = 20; campaign.player.y = 20;
  const target = { x: 20, y: 23 };
  const route = getMousePathResult(target, campaign);
  assert.equal(route.reachable, true);
  assert.equal(resolveWorldCursor(campaign, target, route.reachable, new Set()), "walk");
  assert.equal(getMouseMovementFromSelectedCell({ ...target, pressed: true }, campaign, route.path)?.direction, "s");
  let state = campaign;
  for (let step = 0; step < 3; step++) {
    const moved = applyAction(state, { type: "move", direction: "s" });
    assert.equal(moved.accepted, true, `crossing step ${step + 1} must pass through the open front door`);
    state = moved.state;
  }
  assert.deepEqual({ x: state.player.x, y: state.player.y }, target);
  assert.equal(isObjectSetBlocked(state.floor, state.player, 20, 21), true);
});

test("Gridless locomotion follows displacement, loops directional run clips, and idles after stopping", () => {
  const before = arena(); const after = structuredClone(before); after.player.pixel!.x += 2;
  const presentation = new TurnPresentationSystem(); presentation.reset(before); presentation.setPlayerMode("gridless");
  assert.equal(presentation.isPlayerTraveling(), false);
  presentation.begin(before, after, new Set(), 10);
  presentation.notePlayerPixelTravel(before.player, after.player);
  assert.equal(presentation.isPlayerTraveling(), true);
  assert.equal(presentation.movementPulseOf("player", 30), 0);
  presentation.begin(after, after, new Set(), 40);
  assert.equal(presentation.isPlayerTraveling(), true);
  presentation.stopPlayerPixelTravel();
  assert.equal(presentation.isPlayerTraveling(), false);
  const offCenter = structuredClone(before); offCenter.player.pixel!.x += 7;
  const centered = applyAction(offCenter, { type: "center-player" });
  assert.deepEqual(centered.state.player.pixel, cellCenter(before.player));
  assert.equal(centered.ticks, 0);
  for (const mode of ["grid-snap", "grid-tween"] as const) {
    presentation.setPlayerMode(mode); presentation.begin(before, after, new Set(), 20);
    presentation.notePlayerPixelTravel(before.player, after.player);
    assert.equal(presentation.isPlayerTraveling(), false);
  }
  presentation.reset(before); presentation.setPlayerMode("gridless");
  assert.equal(presentation.isPlayerTraveling(), false);
  for (const [heading, clip] of [["n", "run/up"], ["s", "run/down"], ["e", "run/side"], ["w", "run/side"]] as const) {
    assert.equal(heroWarriorRunAnimationForHeading(heading), clip);
    const animation = createHeroWarriorAnimationEntity(); animation.selectAnimation(clip); animation.start(); animation.update(2500);
    assert.equal(animation.getState().animation, clip);
    assert.equal(animation.getState().playing, true);
  }
});
test("movement preference validation and precise position migration", () => {
  assert.equal(normalizePreferences({}).mobileMovementSpeed, "walk");
  assert.equal(normalizePreferences({ mobileMovementSpeed: "run" }).mobileMovementSpeed, "run");
  assert.equal(normalizePreferences({ mobileMovementSpeed: "invalid" }).mobileMovementSpeed, "walk");
  for (const movementMode of ["grid-snap", "grid-tween", "gridless"] as const) assert.equal(normalizePreferences({ movementMode }).movementMode, movementMode);
  for (const movementMode of [undefined, "bad", null, 1]) assert.equal(normalizePreferences({ movementMode }).movementMode, "grid-tween");
  const campaign = arena(); delete campaign.player.pixel;
  assert.deepEqual(migrateCampaign(campaign).player.pixel, cellCenter(campaign.player));
  campaign.player.pixel = { x: 643, y: 650 };
  assert.deepEqual(migrateCampaign(campaign).player.pixel, campaign.player.pixel);
  campaign.player.pixel.x = NaN; normalizePlayerPosition(campaign.player);
  assert.deepEqual(campaign.player.pixel, cellCenter(campaign.player));
  assert.deepEqual(occupiedCell({ x: 672, y: 671 }), { x: 21, y: 20 });
});
test("center crossings use independent axes, ordered arrivals and no departure duplicate", () => {
  assert.deepEqual(centerCrossings({ x: 16, y: 16 }, { x: 112, y: 16 }).map((c) => c.axis), ["x", "x", "x"]);
  assert.deepEqual(centerCrossings({ x: 16, y: 16 }, { x: 48, y: 48 }).map((c) => c.axis), ["x", "y"]);
  assert.deepEqual(centerCrossings({ x: 47, y: 46 }, { x: 49, y: 49 }).map((c) => c.axis), ["x", "y"]);
  assert.equal(centerCrossings({ x: 48, y: 16 }, { x: 49, y: 16 }).length, 0);
  assert.equal(centerCrossings({ x: 49, y: 16 }, { x: 47, y: 16 }).length, 1);
});
test("pixel travel owns one cell, charges centers not edges and collects once", () => {
  let campaign = arena(); const start = campaign.floor.time;
  campaign.floor.entities.push({ id: "coin", kind: "gold", amount: 1, x: 21, y: 20 });
  let result = applyAction(campaign, { type: "move-pixels", to: { x: 673, y: 656 } });
  assert.equal(result.ticks, 0); assert.equal(result.state.player.x, 21); assert.equal(result.state.counters.gold, 1);
  campaign = result.state;
  result = applyAction(campaign, { type: "move-pixels", to: { x: 688, y: 656 } });
  assert.equal(result.ticks, 1); assert.equal(result.state.floor.time, start + 1); assert.equal(result.state.counters.gold, 1);
  assert.equal(applyAction(result.state, { type: "move-pixels", to: { x: 689, y: 656 } }).ticks, 0);
  campaign = arena(); setCell(campaign.floor, 21, 20, { walkable: false });
  result = applyAction(campaign, { type: "move-pixels", to: { x: 688, y: 656 } });
  assert.equal(result.state.player.pixel!.x, 671); assert.equal(result.ticks, 0);
  campaign = arena(); setCell(campaign.floor, 21, 20, { walkable: false }); setCell(campaign.floor, 20, 21, { walkable: false });
  result = applyAction(campaign, { type: "move-pixels", to: { x: 688, y: 688 } });
  assert.deepEqual(occupiedCell(result.state.player.pixel!), { x: 20, y: 20 });
  result = applyAction(arena(), { type: "move-pixels", to: { x: 688, y: 688 } }); assert.equal(result.ticks, 2);
});
test("Perception migration keeps ten attributes, explicit zero, modifiers and progress", () => {
  const campaign = arena(); const legacy = campaign.progression.attributes as Record<string, number>;
  delete legacy.perception; legacy.vitality = 5;
  campaign.player.inventory.push({ id: "legacy", name: "Legacy", group: "armor", modifiers: { vitality: 2 } as never });
  const migrated = migrateCampaign(campaign);
  assert.equal(migrated.progression.attributes.perception, 5); assert.equal(Object.keys(migrated.progression.attributes).length, 10);
  assert.equal(migrated.player.inventory.find((item) => item.id === "legacy")!.modifiers.perception, 2);
  legacy.perception = 0;
  assert.equal(migrateCampaign(campaign).progression.attributes.perception, 0);
  assert.equal(progressionStatNames.length, 10);
});
test("current detection has inclusive range, blocked sight, reacquisition and independent Battle", () => {
  const campaign = arena();
  const generated = createCampaign(4321).floor.entities.find((entity) => entity.kind === "enemy")!;
  assert.equal(generated.kind, "enemy");
  const enemy = structuredClone(generated); if (enemy.kind !== "enemy") return;
  enemy.x = 21; enemy.y = 20; enemy.awareness = 6; campaign.floor.entities = [enemy];
  for (const p of [0, 1, 4, 5, 99]) {
    campaign.progression.attributes.perception = p;
    const range = Math.max(1, 2 * p);
    enemy.x = 20 + Math.min(range, 70);
    assert.equal(detectedEnemyIds(campaign).has(enemy.id), true);
    if (range < 70) { enemy.x++; assert.equal(detectedEnemyIds(campaign).has(enemy.id), false); }
  }
  enemy.x = 23; campaign.progression.attributes.perception = 0;
  assert.equal(gameMode(campaign), "Battle"); assert.equal(detectedEnemyIds(campaign).size, 0);
  campaign.progression.attributes.perception = 5; assert.equal(detectedEnemyIds(campaign).size, 1);
  campaign.floor.cells[20][22].walkable = false; assert.equal(detectedEnemyIds(campaign).size, 0); assert.equal(gameMode(campaign), "General");
  campaign.floor.cells[20][22].walkable = true; assert.equal(detectedEnemyIds(campaign).size, 1); assert.equal(gameMode(campaign), "Battle");
  enemy.x = 31; assert.equal(gameMode(campaign), "General"); assert.equal(detectedEnemyIds(campaign).size, 0);
  setCell(campaign.floor, 21, 20, { walkable: false }); setCell(campaign.floor, 20, 21, { walkable: false });
  assert.equal(hasPerceptionLineOfSight(campaign, { x: 20, y: 20 }, { x: 21, y: 21 }), false);
  assert.equal(effectiveAttributes(upgradeCampaignResources(campaign)).perception, 5);
});

test("whole-pixel integration is frame independent for both axes and sprint", () => {
  for (const vector of [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: -1, y: 1 }]) for (const speed of [128, 256]) {
    const endpoints = [30, 60, 120].map(frames => {
      const integrator = new PixelMovementIntegrator(); let position = { x: 1000, y: 1000 };
      for (let frame = 0; frame < frames; frame++) position = integrator.advance(position, vector, 1000 / frames, speed);
      return position;
    });
    assert.deepEqual(endpoints[0], endpoints[1]); assert.deepEqual(endpoints[1], endpoints[2]);
  }
});
test("player snap and precise travel do not disable enemy or barrel tweening", () => {
  const before = arena(); const after = applyAction(before, { type: "move", direction: "e" }).state;
  const presentation = new TurnPresentationSystem(); presentation.reset(before); presentation.setPlayerMode("grid-snap");
  presentation.begin(before, after, new Set(), 0); assert.equal(presentation.playerPositionOf(after.player).x, 21);
  presentation.reset(before); presentation.setPlayerMode("grid-tween"); presentation.begin(before, after, new Set(), 0); presentation.sample(125);
  assert.ok(presentation.playerPositionOf(after.player).x > 20 && presentation.playerPositionOf(after.player).x < 21);
  const free = applyAction(before, { type: "move-pixels", to: { x: 660, y: 656 } }).state;
  presentation.reset(before); presentation.setPlayerMode("gridless"); presentation.begin(before, free, new Set(), 0);
  assert.equal(presentation.playerPositionOf(free.player).x, 660 / 32 - .5);
});
test("interaction bumps retain their tween while a Gridless action commits", () => {
  const campaign = arena();
  const presentation = new TurnPresentationSystem(); presentation.reset(campaign); presentation.setPlayerMode("gridless");
  presentation.beginBump("player", campaign.player, "e", 0);
  presentation.begin(campaign, campaign, new Set(), 31);
  assert.ok(presentation.playerPositionOf(campaign.player).x > campaign.player.x, "the action commit must not snap a Gridless bump back to its origin");
  presentation.sample(125);
  assert.deepEqual(presentation.playerPositionOf(campaign.player), { x: campaign.player.x, y: campaign.player.y });
});
test("cursor resolution respects detection and legal barrel pushes", () => {
  const campaign = arena();
  assert.equal(resolveWorldCursor(campaign, { x: 21, y: 20 }, true, new Set()), "walk");
  assert.equal(resolveWorldCursor(campaign, { x: 21, y: 20 }, false, new Set()), "blocked");
  campaign.floor.entities.push({ id: "crate", kind: "crate", health: 100, x: 21, y: 20 });
  assert.equal(resolveWorldCursor(campaign, { x: 21, y: 20 }, false, new Set()), "interact");
  campaign.floor.entities = [];
  campaign.floor.objectSets = [{ id: "barrel", kind: "barrel-panel-door", barrel: { x: 21, y: 20 }, trigger: { x: 23, y: 20 }, door: { x: 25, y: 20 }, regionRole: "optional-reward" }];
  assert.equal(resolveWorldCursor(campaign, { x: 21, y: 20 }, false, new Set()), "interact");
  setCell(campaign.floor, 22, 20, { walkable: false });
  assert.equal(resolveWorldCursor(campaign, { x: 21, y: 20 }, false, new Set()), "blocked");
});

test("Gridless entry updates triggers and stairs once without an extra movement charge", () => {
  const campaign = arena();
  campaign.floor.objectSets = [{ id: "gate", kind: "barrel-panel-door", barrel: { x: 18, y: 20 }, trigger: { x: 21, y: 20 }, door: { x: 25, y: 20 }, regionRole: "optional-reward" }];
  const entered = applyAction(campaign, { type: "move-pixels", to: { x: 674, y: 656 } });
  assert.equal(entered.state.player.x, 21); assert.equal(entered.ticks, 0);
  assert.equal(applyAction(entered.state, { type: "move", direction: "e" }).accepted, true);
  const stairs = arena(); stairs.floor.entities = [{ id: "stairs", kind: "stairs", x: 21, y: 20 }];
  const result = applyAction(stairs, { type: "move-pixels", to: { x: 752, y: 656 } });
  assert.equal(result.state.player.x, 21); assert.equal(result.events.filter(event => event.type === "stairs.entered").length, 1); assert.equal(result.ticks, 0);
});
test("closed doors block detection and fresh Battle entry until opened", () => {
  const campaign = arena();
  const enemy = createCampaign(4321).floor.entities.find(entity => entity.kind === "enemy")!;
  if (enemy.kind !== "enemy") throw Error("Missing enemy fixture");
  Object.assign(enemy, { x: 23, y: 20, awareness: 6 }); campaign.floor.entities = [enemy]; campaign.progression.attributes.perception = 5;
  const gate = { id: "gate", kind: "barrel-panel-door" as const, barrel: { x: 18, y: 20 }, trigger: { x: 19, y: 20 }, door: { x: 22, y: 20 }, regionRole: "optional-reward" as const };
  campaign.floor.objectSets = [gate];
  assert.equal(detectedEnemyIds(campaign).size, 0); assert.equal(gameMode(campaign), "General");
  gate.barrel = { ...gate.trigger }; assert.equal(detectedEnemyIds(campaign).size, 1); assert.equal(gameMode(campaign), "Battle");
  gate.barrel = { x: 18, y: 20 }; assert.equal(detectedEnemyIds(campaign).size, 0); assert.equal(gameMode(campaign), "General");
  enemy.hp = 0; assert.equal(gameMode(campaign), "General");
});
test("Battle entry centers the occupied cell with a tween and no extra enemy action", () => {
  const campaign = arena(); campaign.player.pixel = { x: 662, y: 660 };
  const enemy = createCampaign(4321).floor.entities.find(entity => entity.kind === "enemy")!;
  if (enemy.kind !== "enemy") throw Error("Missing enemy fixture");
  Object.assign(enemy, { x: 24, y: 20, awareness: 6, nextActionAt: 9999 }); campaign.floor.entities = [enemy];
  const result = applyAction(campaign, { type: "center-player" });
  assert.deepEqual(result.state.player.pixel, { x: 656, y: 656 }); assert.equal(result.state.player.x, 20); assert.equal(result.state.player.y, 20);
  assert.equal(result.ticks, 0); assert.equal(result.state.floor.time, campaign.floor.time); assert.equal(result.events.length, 0);
  const presentation = new TurnPresentationSystem(); presentation.reset(campaign); presentation.setPlayerMode("grid-tween"); presentation.begin(campaign, result.state, new Set(), 0); presentation.sample(125);
  assert.ok(presentation.playerPositionOf(result.state.player).x > 20 && presentation.playerPositionOf(result.state.player).x < 20.1875);
  presentation.sample(250); assert.deepEqual(presentation.playerPositionOf(result.state.player), { x: 20, y: 20 });
});
test("long pixel segments, reversals and trap death cannot charge untraveled centers", () => {
  const campaign = arena();
  const long = applyAction(campaign, { type: "move-pixels", to: { x: 752, y: 752 } }); assert.equal(long.ticks, 6);
  const reverse = applyAction(long.state, { type: "move-pixels", to: { x: 656, y: 752 } }); assert.equal(reverse.ticks, 3);
  const trap = arena(); trap.player.resources.health.current = 1;
  trap.floor.decorations = [{ id: "trap", kind: "trap", x: 21, y: 20, wallMounted: false }];
  const death = applyAction(trap, { type: "move-pixels", to: { x: 752, y: 656 }, hazardElapsedMs: 300 });
  assert.ok(death.events.some(event => event.type === "player.died")); assert.equal(death.ticks, 0);
  assert.equal(death.events.filter(event => event.type === "time.advanced").length, 0);
});

test("existing cardinal previews and closed-door approaches remain authoritative", async () => {
  const campaign = arena();
  assert.equal(getMousePathResult({ x: 21, y: 20 }, campaign).path!.length - 1, 1);
  assert.equal(getMousePathResult({ x: 21, y: 21 }, campaign).path!.length - 1, 2);
  for (let y = 0; y < 100; y++) for (let x = 0; x < 100; x++) setCell(campaign.floor, x, y, { walkable: y === 20 && x >= 20 && x <= 26 });
  campaign.floor.objectSets = [{ id: "gate", kind: "barrel-panel-door", barrel: { x: 18, y: 20 }, trigger: { x: 19, y: 20 }, door: { x: 23, y: 20 }, regionRole: "optional-reward" }];
  const result = getMousePathResult({ x: 26, y: 20 }, campaign);
  assert.equal(result.reachable, false); assert.deepEqual(result.path!.at(-1), { x: 22, y: 20 });
  assert.equal(getMouseMovementFromSelectedCell({ x: 26, y: 20, pressed: true }, campaign, result.path)!.direction, "e");
  const renderer = await readFile(new URL("../src/systems/rendering/babylon-render-system.tsx", import.meta.url), "utf8");
  assert.ok(renderer.includes('targetKind === "item" || targetKind === "enemy" ? targetKind : selectedCellReachable === false ? "invalid" : targetKind'));
  const palette = await readFile(new URL("../src/ui/interaction-colors.ts", import.meta.url), "utf8");
  for (const color of ["#f5f1e6", "#6dd873", "#dc3d40", "#090909"]) assert.ok(palette.includes(color));
});

test("clicking traps and stairs approaches without entering", () => {
  const campaign = arena();
  for (let y = 0; y < 100; y++) for (let x = 0; x < 100; x++) setCell(campaign.floor, x, y, { walkable: y === 20 && x >= 20 && x <= 26 });
  for (const kind of ["trap", "stairs"] as const) {
    campaign.floor.decorations = kind === "trap" ? [{ id: "trap", kind: "trap", x: 23, y: 20, wallMounted: false }] : [];
    campaign.floor.entities = kind === "stairs" ? [{ id: "stairs", kind: "stairs", x: 23, y: 20, direction: "forward" }] : [];
    campaign.player.x = 20;
    assert.equal(getMousePathResult({ x: 26, y: 20 }, campaign).reachable, false);
    assert.equal(getMousePathResult({ x: 23, y: 20 }, campaign).reachable, false);
    const approach = planMouseTravel({ x: 23, y: 20, pressed: true }, campaign);
    assert.equal(approach.reachable, true);
    assert.equal(approach.destination.x, 22);
    campaign.player.x = 22;
    assert.equal(getMousePathResult({ x: 26, y: 20 }, campaign).reachable, false);
    const explicit = planMouseTravel({ x: 23, y: 20, pressed: true }, campaign);
    assert.equal(explicit.reachable, true);
    assert.equal(getMouseMovementFromSelectedCell(explicit.destination, campaign)?.direction, "e");
  }
});

test("mouse click destinations have a thirty-step travel limit", () => {
  const campaign = arena();
  const target = { x: 80, y: 20, pressed: true };
  const preview = getMousePathResult(target, campaign);
  assert.equal(MAX_MOUSE_TRAVEL_STEPS, 30); assert.equal(preview.path!.length, 61);
  assert.equal(preview.reachable, false); assert.deepEqual(preview.path!.at(-1), { x: 80, y: 20 });
  assert.equal(planMouseTravel(target, campaign).destination.x, 50);
  assert.equal(getMousePathResult({ x: 50, y: 20 }, campaign).reachable, true);
});
