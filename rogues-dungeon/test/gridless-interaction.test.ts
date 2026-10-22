import assert from "node:assert/strict";
import test from "node:test";
import type { Action, Campaign, Entity, GameEvent } from "../src/game/types.ts";
import { GridlessInteractionController, planGridlessInteraction, resolveGridlessInteraction } from "../src/game/gridless-interaction.ts";
import { cellCenter, precisePlayerPosition } from "../src/game/player-position.ts";
import { applyAction, createCampaign, createGameSession, gameMode, isObjectSetDoorOpen } from "../src/systems/procedural/world-procedural-system.ts";
import { CHARACTER_MOVEMENT_DURATION_MS, INTERACTIVE_BUMP_APEX_MS, INTERACTIVE_BUMP_DURATION_MS, TurnPresentationSystem } from "../src/systems/animation/turn-presentation-system.ts";

function arena() {
  const state = createCampaign(90210);
  state.floor.cells = Array.from({ length: 100 }, () => Array.from({ length: 100 }, () => ({ walkable: true, role: "floor" })));
  delete state.floor.map;
  state.floor.entities = []; state.floor.objectSets = []; state.floor.decorations = [];
  state.player.x = 20; state.player.y = 20; state.player.pixel = cellCenter(state.player);
  state.player.hasMass = true;
  state.counters.gold = 100;
  return state;
}

function sequence(state: Campaign, action: Action, now = 0) {
  const events: GameEvent[] = [];
  const session = createGameSession(state, { getEnemyLogicDisabled: () => true });
  session.subscribe(result => events.push(...result.events));
  const presentation = new TurnPresentationSystem(); presentation.reset(state); presentation.setPlayerMode("gridless");
  const controller = new GridlessInteractionController(presentation);
  let plan = planGridlessInteraction(session.getState(), action);
  assert.ok(plan);
  if (plan.prefix) {
    session.dispatch({ type: "move-pixels", to: plan.prefix });
    plan = planGridlessInteraction(session.getState(), action);
    assert.ok(plan);
  }
  const selected = plan;
  const initial = session.getState();
  let commits = 0;
  controller.start(selected, initial, now, () => true, at => { commits++; resolveGridlessInteraction(session, selected, at); });
  return { session, presentation, controller, events, initial, plan: selected, commits: () => commits };
}

const target = { x: 21, y: 20 };
const pixelEntry: Action = { type: "move-pixels", to: cellCenter(target) };

for (const entity of [
  { id: "gold", kind: "gold", amount: 2, ...target },
  { id: "key", kind: "key", amount: 1, ...target },
  { id: "potion", kind: "potion", resource: "health", ...target },
  { id: "item", kind: "item", item: { id: "stick", name: "Stick", group: "weapons", modifiers: { offense: 1 } }, ...target },
  { id: "cache", kind: "discovery", ...target },
  { id: "stairs", kind: "stairs", direction: "forward", ...target },
  { id: "stairs", kind: "stairs", direction: "back", ...target },
  { id: "arrow", kind: "teleport-arrow", destination: "player-home", ...target },
] as Entity[]) {
  test(`${entity.kind} ${"direction" in entity ? entity.direction : ""} waits for arrival and preserves pixel turn costs`, () => {
    const state = arena(); state.floor.entities = [entity];
    const reference = applyAction(state, pixelEntry, { enemyLogicDisabled: true });
    const flow = sequence(state, pixelEntry);
    flow.controller.update(CHARACTER_MOVEMENT_DURATION_MS - 1);
    assert.equal(flow.commits(), 0);
    assert.deepEqual(flow.session.getState(), flow.initial);
    assert.ok(flow.presentation.playerPositionOf(state.player).x > state.player.x);
    flow.controller.update(CHARACTER_MOVEMENT_DURATION_MS);
    assert.equal(flow.commits(), 1); assert.equal(flow.controller.active, false);
    assert.equal(flow.session.getState().floor.time, reference.state.floor.time);
    assert.deepEqual(flow.session.getState().counters, reference.state.counters);
    assert.deepEqual(flow.session.getState().player.pixel, cellCenter(target));
    assert.equal(flow.events.filter(e => e.type === "item.collected").length, reference.events.filter(e => e.type === "item.collected").length);
    assert.equal(flow.events.filter(e => e.type === "stairs.entered").length, reference.events.filter(e => e.type === "stairs.entered").length);
    flow.controller.update(1000); assert.equal(flow.commits(), 1);
  });
}

for (const kind of ["crate", "chest", "campfire"] as const) {
  test(`${kind} aligns without a turn, then resolves only at bump contact`, () => {
    const state = arena(); state.player.pixel = { x: 668, y: 659 };
    state.floor.entities = [kind === "crate" ? { id: kind, kind, health: 100, ...target } : { id: kind, kind, ...target }];
    const flow = sequence(state, { type: "move", direction: "e" });
    flow.controller.update(125);
    const aligned = flow.presentation.playerPositionOf(state.player);
    assert.ok(aligned.x > 20 && aligned.x < precisePlayerPosition(state.player).x);
    assert.equal(flow.session.getState().floor.time, state.floor.time);
    flow.controller.update(250);
    flow.controller.update(250 + INTERACTIVE_BUMP_APEX_MS - 1); assert.equal(flow.commits(), 0);
    flow.controller.update(250 + INTERACTIVE_BUMP_APEX_MS); assert.equal(flow.commits(), 1);
    assert.equal(flow.session.getState().floor.time, state.floor.time + (kind === "campfire" ? 0 : 1));
    assert.equal(flow.events.filter(e => e.type === "crate.bumped" || e.type === "chest.opened").length, kind === "campfire" ? 0 : 1);
    // React may publish the new campaign while the bump is returning.
    flow.presentation.begin(state, flow.session.getState(), new Set(), 330);
    assert.ok(flow.presentation.playerPositionOf(state.player).x > 20);
    flow.controller.update(250 + INTERACTIVE_BUMP_DURATION_MS);
    assert.deepEqual(flow.presentation.playerPositionOf(state.player), { x: 20, y: 20 });
  });
}

for (const armed of [false, true]) test(`enemy contact ${armed ? "attacks" : "rejects unarmed"} after the tween with the existing cost`, () => {
  const state = arena();
  const enemy = createCampaign(4321).floor.entities.find(e => e.kind === "enemy")!;
  Object.assign(enemy, target, { nextActionAt: 9999 }); state.floor.entities = [enemy];
  if (armed) state.player.equipment.weapons[0] = { id: "stick", name: "Stick", group: "weapons", modifiers: { offense: 6 } };
  const reference = applyAction(state, { type: "move", direction: "e" }, { enemyLogicDisabled: true });
  const flow = sequence(state, { type: "move", direction: "e" });
  flow.controller.update(INTERACTIVE_BUMP_APEX_MS - 1); assert.equal(flow.commits(), 0);
  flow.controller.update(INTERACTIVE_BUMP_APEX_MS);
  assert.equal(flow.session.getState().floor.time, reference.state.floor.time);
  assert.equal(flow.events.filter(e => e.type === "combat.hit").length, reference.events.filter(e => e.type === "combat.hit").length);
  assert.equal(flow.events.some(e => e.type === "action.rejected"), !armed);
});

test("barrel contact precedes synchronized player/barrel travel and plate consequences", () => {
  const state = arena();
  state.floor.objectSets = [{ id: "gate", kind: "floor-trigger-door-barrel", barrel: target, trigger: { x: 22, y: 20 }, door: { x: 25, y: 20 }, regionRole: "optional-reward" }];
  const flow = sequence(state, { type: "move", direction: "e" });
  flow.controller.update(INTERACTIVE_BUMP_APEX_MS);
  assert.equal(flow.commits(), 0);
  flow.controller.update(INTERACTIVE_BUMP_APEX_MS + 125);
  assert.ok(flow.presentation.positionOf("gate-barrel", target).x > 21);
  assert.ok(flow.presentation.playerPositionOf(state.player).x > 20.5);
  assert.deepEqual(flow.session.getState().floor.objectSets![0].barrel, target);
  flow.controller.update(INTERACTIVE_BUMP_APEX_MS + 250);
  const after = flow.session.getState();
  assert.equal(after.floor.time, state.floor.time + 1);
  assert.equal(isObjectSetDoorOpen(after.floor.objectSets![0], after.player), true);
  assert.equal(flow.events.filter(e => e.type === "floor-trigger.changed").length, 1);
  flow.presentation.begin(state, after, new Set(), 313);
  assert.equal(flow.presentation.isPlayerMoving, false, "the completed push must not tween a second time");
});

for (const obstacle of ["wall", "door", "barrel"] as const) test(`blocked ${obstacle} gives a bump without a turn`, () => {
  const state = arena();
  if (obstacle === "wall") state.floor.cells[20][21].walkable = false;
  else state.floor.objectSets = [{ id: "gate", kind: "floor-trigger-door-barrel", barrel: obstacle === "barrel" ? target : { x: 30, y: 30 }, trigger: { x: 23, y: 20 }, door: obstacle === "door" ? target : { x: 25, y: 20 }, regionRole: "optional-reward" }];
  if (obstacle === "barrel") state.floor.cells[20][22].walkable = false;
  const flow = sequence(state, { type: "move", direction: "e" });
  flow.controller.update(62); assert.equal(flow.commits(), 0);
  flow.controller.update(63); assert.equal(flow.events.some(e => e.type === "action.rejected"), true);
  assert.equal(flow.session.getState().floor.time, state.floor.time);
  flow.controller.update(125); assert.deepEqual(flow.session.getState().player.pixel, cellCenter(state.player));
});

test("trap damage waits for arrival and uses the arrival spike phase", () => {
  const state = arena(); state.floor.decorations = [{ id: "trap", kind: "trap", ...target, wallMounted: false }];
  const flow = sequence(state, pixelEntry, 100);
  flow.controller.update(349); assert.equal(flow.session.getState().player.resources.health.current, state.player.resources.health.current);
  flow.controller.update(350);
  assert.ok(flow.session.getState().player.resources.health.current < state.player.resources.health.current);
  assert.equal(flow.events.filter(e => e.type === "resource.changed" && e.facts.cause === "trap").length, 1);
  flow.controller.update(500); assert.equal(flow.commits(), 1);
});

for (const leaving of [false, true]) test(`pressure plate ${leaving ? "release" : "activation"} waits for arrival`, () => {
  const state = arena();
  state.floor.objectSets = [{ id: "gate", kind: "floor-trigger-door-barrel", barrel: { x: 18, y: 20 }, trigger: leaving ? { x: 20, y: 20 } : target, door: { x: 25, y: 20 }, regionRole: "optional-reward" }];
  const flow = sequence(state, pixelEntry);
  flow.controller.update(249); assert.equal(flow.events.some(e => e.type === "floor-trigger.changed"), false);
  flow.controller.update(250);
  assert.equal(flow.events.filter(e => e.type === "floor-trigger.changed").length, 1);
  assert.equal(isObjectSetDoorOpen(flow.session.getState().floor.objectSets![0], flow.session.getState().player), !leaving);
});

test("encounter entry completes before the doors lock", () => {
  const state = arena();
  state.floor.objectSets = [{ id: "encounter", kind: "encounter-lockdown", barrel: { x: 18, y: 20 }, trigger: target, door: { x: 19, y: 20 }, doors: [{ x: 19, y: 20 }], triggers: [target], room: { x: 20, y: 18, w: 5, h: 5 }, enemyIds: ["missing"], activated: false, completed: false, regionRole: "optional-reward" }];
  const flow = sequence(state, pixelEntry);
  flow.controller.update(249); assert.equal(flow.session.getState().floor.objectSets![0].kind, "encounter-lockdown");
  assert.equal(flow.events.some(e => e.type === "encounter.locked"), false);
  flow.controller.update(250); assert.equal(flow.events.filter(e => e.type === "encounter.locked").length, 1);
});

test("Battle entry finishes its approach before the first tactical action", () => {
  const state = arena(); state.progression.attributes.perception = 1;
  const enemy = createCampaign(4321).floor.entities.find(e => e.kind === "enemy")!;
  Object.assign(enemy, { x: 24, y: 20, awareness: 3, nextActionAt: 9999 }); state.floor.entities = [enemy];
  assert.equal(gameMode(state), "General");
  const flow = sequence(state, pixelEntry);
  flow.controller.update(249); assert.equal(gameMode(flow.session.getState()), "General");
  flow.controller.update(250); assert.equal(gameMode(flow.session.getState()), "Battle");
  assert.deepEqual(flow.session.getState().player.pixel, cellCenter(target));
});

test("diagonal blocked corners cannot become a cardinal push or attack", () => {
  const state = arena(); state.floor.cells[20][21].walkable = false;
  state.floor.objectSets = [{ id: "barrel", kind: "floor-trigger-door-barrel", barrel: { x: 20, y: 21 }, trigger: { x: 20, y: 22 }, door: { x: 25, y: 20 }, regionRole: "optional-reward" }];
  const flow = sequence(state, { type: "move-pixels", to: cellCenter({ x: 21, y: 21 }) });
  assert.equal(flow.plan.rejectOnly, true);
  flow.controller.update(250); flow.controller.update(313); flow.controller.update(375);
  assert.equal(flow.events.some(e => e.type === "barrel.pushed"), false);
  assert.equal(flow.session.getState().floor.objectSets![0].barrel.x, 20);
  assert.equal(flow.session.getState().floor.objectSets![0].barrel.y, 21);
});

test("cancellation and changed sessions prevent stale consequences and duplicate input", () => {
  const state = arena(); state.floor.entities = [{ id: "coin", kind: "gold", ...target }];
  const flow = sequence(state, pixelEntry);
  assert.equal(flow.controller.start(flow.plan, state, 1, () => true, () => assert.fail("duplicate")), false);
  flow.controller.update(125); flow.controller.cancel(state); flow.controller.update(1000);
  assert.equal(flow.commits(), 0); assert.deepEqual(flow.presentation.playerPositionOf(state.player), { x: 20, y: 20 });
  let committed = false;
  flow.controller.start(flow.plan, state, 0, () => false, () => { committed = true; });
  flow.controller.update(1000); assert.equal(committed, false);
});

test("plain pixel travel stays continuous, while requested centering costs no turn", () => {
  const state = arena();
  assert.equal(planGridlessInteraction(state, { type: "move-pixels", to: { x: 750, y: 660 } }), null);
  state.player.pixel!.x += 7;
  const flow = sequence(state, { type: "center-player" });
  flow.controller.update(125); assert.equal(flow.session.getState().player.pixel!.x, 663);
  flow.controller.update(250); assert.deepEqual(flow.session.getState().player.pixel, cellCenter(state.player));
  assert.equal(flow.session.getState().floor.time, state.floor.time);
});
