import test from "node:test";
import "./browser-campaign-fixture.test.ts";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { applyAction, applyFrozenMovement, compactCampaignForSave, createCampaign, createGameSession, createRunCampaign, generateFloor, generatedFloorForCampaign, isCellDiscovered, prepareCampaignSave } from "../src/systems/procedural/world-procedural-system.ts";
import { readSlot, readSlotSummary, writeSlot } from "../src/systems/persistence/save-system.ts";
import { DEFAULT_WORLD_ATTRIBUTES } from "../src/systems/procedural/world-attributes.ts";
import { createCardinalPathBatch, findCardinalApproachPath, findCardinalPath } from "../src/game/a-star.ts";
import { planEnemyActions } from "../src/game/enemy-ai-system.ts";
import { createEnemyDirectionField } from "./enemy-direction-field-prototype.ts";
import { findCardinalApproachPath as referenceApproach, findCardinalPath as referencePath } from "./navigation-full-grid-reference.ts";
import { createSemanticCells, ensureSemanticCells, markRuntimeGridValid, setCell } from "../src/systems/procedural/level-grid-system.ts";
import { TurnPresentationSystem } from "../src/systems/animation/turn-presentation-system.ts";
import type { Campaign, Enemy } from "../src/game/types.ts";
import { PerformanceSession } from "../src/game/performance-session.ts";
import { createWorldPresentationReader, performanceCellBounds } from "../src/systems/rendering/world-render-system.ts";
import { performanceFrame, performanceOptions, readPerformanceMetrics, resetPerformanceMetrics, resetPerformanceOptions, setPerformanceOptions } from "../src/systems/rendering/performance-system.ts";
import { minimapBackgroundRevision, minimapMarkerEntries } from "../src/systems/rendering/minimap-presentation.ts";
import { copyCampaignMutableState } from "../src/systems/procedural/campaign-copy-system.ts";
import { createRevisionGate, semanticBuffer } from "./browser/semantic-buffer-prototype.ts";

class SavePerformanceStorage {
  readonly records = new Map<string, string>();
  writes = 0;
  getItem(key: string) { return this.records.get(key) ?? null; }
  setItem(key: string, value: string) { this.records.set(key, value); this.writes++; }
  removeItem(key: string) { this.records.delete(key); }
}

test("saved actions and three menu summaries perform no terrain generation after startup", () => {
  const storage = new SavePerformanceStorage();
  for (const slot of [1, 2, 3]) {
    writeSlot(storage, slot, createRunCampaign(739061, slot, 1));
    writeSlot(storage, slot, readSlot(storage, slot)!);
  }
  const campaign = readSlot(storage, 1)!;
  prepareCampaignSave(campaign);
  const session = createGameSession(campaign, { onCommit: result => { writeSlot(storage, 1, result.state); readSlotSummary(storage); } });
  setPerformanceOptions({ enabled: true }); resetPerformanceMetrics();
  try {
    for (let turn = 0; turn < 12; turn++) assert.ok(session.dispatch({ type: "wait" })?.accepted);
    const metrics = readPerformanceMetrics();
    assert.equal(metrics.counts["generated baseline floors"] ?? 0, 0);
    assert.ok(metrics.counts["save baseline cache hits"] >= 12);
    const before = new Map(storage.records), writes = storage.writes;
    assert.deepEqual(readSlotSummary(storage).map(summary => summary.occupied), [true, true, true]);
    assert.deepEqual(storage.records, before); assert.equal(storage.writes, writes);
    const saved = readSlot(storage, 1)!;
    assert.equal(saved.floor.time, session.getState().floor.time);
    assert.deepEqual(saved.floor.entities, session.getState().floor.entities);
    assert.deepEqual(saved.discovery, session.getState().discovery);
  } finally { resetPerformanceOptions(); }
});

test("save baseline keys include all profile fields and compact records cannot mutate cached terrain", () => {
  const campaign = createRunCampaign(739062, 1, 1, 1, 1, { worldAttributes: { ...DEFAULT_WORLD_ATTRIBUTES } });
  prepareCampaignSave(campaign);
  const original = compactCampaignForSave(campaign);
  const expectedStart = { ...original.floor.start }, expectedProfile = structuredClone(original.floor.generationProfile);
  original.floor.start.x = -123;
  original.floor.generationProfile!.attributes!.clarity = 99;
  const next = compactCampaignForSave(campaign);
  assert.deepEqual(next.floor.start, expectedStart);
  assert.deepEqual(next.floor.generationProfile, expectedProfile);
  const profile = campaign.floorProfiles!["1"] as NonNullable<typeof campaign.floorProfiles>[string] & { topologyVersion?: string };
  profile.topologyVersion = profile.topologyVersion === "dungeon-graph-1" ? undefined : "dungeon-graph-1";
  setPerformanceOptions({ enabled: true }); resetPerformanceMetrics();
  try {
    compactCampaignForSave(campaign);
    assert.equal(readPerformanceMetrics().counts["generated baseline floors"], 1);
  } finally { resetPerformanceOptions(); }
  const publicFloor = generatedFloorForCampaign(campaign, 1); publicFloor.entities.length = 0;
  assert.ok(generatedFloorForCampaign(campaign, 1).entities.length > 0);
  profile.generatorVersion = "unsupported";
  assert.throws(() => compactCampaignForSave(campaign), /Unsupported saved world generator/);
});

test("current summary metadata rejects unsupported profiles without rewriting saved bytes", () => {
  const storage = new SavePerformanceStorage();
  const campaign = createRunCampaign(739063, 1, 1, 1, 1, { worldAttributes: { ...DEFAULT_WORLD_ATTRIBUTES } });
  writeSlot(storage, 1, campaign);
  const parsed = JSON.parse(storage.getItem("rogues-dungeon.slot.1")!);
  parsed.floorProfiles["1"].generatorVersion = "unsupported";
  const raw = JSON.stringify(parsed); storage.setItem("rogues-dungeon.slot.1", raw);
  const writes = storage.writes;
  assert.equal(readSlotSummary(storage)[0].invalid, true);
  assert.equal(storage.getItem("rogues-dungeon.slot.1"), raw);
  assert.equal(storage.writes, writes);
});

test("approach search keeps route tie-breaking and never freezes caller-owned player state", () => {
  const floor = { width: 20, height: 20, cells: createSemanticCells(20, 20, true), entities: [{ id: "occupied", kind: "enemy", x: 18, y: 18 }] };
  const player = { x: 1, y: 1, heading: "e" };
  const route = findCardinalApproachPath(floor, player, { x: 18, y: 18 });
  assert.ok(route); assert.equal(Object.isFrozen(player), false);
  assert.deepEqual(route[0], { x: 1, y: 1 });
  assert.ok(Object.isFrozen(route) && route.every(Object.isFrozen));
  for (let seed = 1; seed <= 30; seed++) {
    let random = seed;
    for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) {
      random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
      setCell(floor, x, y, { walkable: random % 5 !== 0 });
    }
    setCell(floor, 1, 1, { walkable: true }); setCell(floor, 18, 18, { walkable: true });
    for (const maxNodes of [1, undefined]) {
      const options = { maxNodes, isBlocked: ({ x, y }: { x: number; y: number }) => x === 8 && y % 3 !== 0 };
      assert.deepEqual(findCardinalApproachPath(floor, { x: 1, y: 1 }, { x: 18, y: 18 }, options), referenceApproach(floor, { x: 1, y: 1 }, { x: 18, y: 18 }, options));
    }
  }
});

test("a nearby occupied hover target does not flood an entire 200-cell-wide floor", () => {
  const floor = { width: 200, height: 200, cells: createSemanticCells(200, 200, true), entities: [{ id: "nearby", kind: "enemy", x: 104, y: 100 }] };
  ensureSemanticCells(floor); markRuntimeGridValid(floor);
  setPerformanceOptions({ enabled: true }); resetPerformanceMetrics();
  try {
    const route = findCardinalApproachPath(floor, { x: 100, y: 100 }, { x: 104, y: 100 });
    assert.deepEqual(route, referenceApproach(floor, { x: 100, y: 100 }, { x: 104, y: 100 }));
    assert.ok((readPerformanceMetrics().counts["approach cells visited"] ?? Infinity) < 100);
  } finally { resetPerformanceOptions(); }
});

test("diagnostic dimensions generate deterministic bounded connected worlds", () => {
  for (const size of [50, 100, 200] as const) {
    const floor = generateFloor(1, 17, 1, { size });
    assert.equal(floor.width, size); assert.equal(floor.height, size);
    assert.deepEqual(floor.cells, generateFloor(1, 17, 1, { size }).cells);
    for (const entity of floor.entities) { assert.ok(entity.x >= 0 && entity.y >= 0 && entity.x < size && entity.y < size); assert.ok(floor.cells[entity.y][entity.x].walkable); }
    const exit = floor.entities.find(e => e.kind === "stairs" && e.direction === "forward")!;
    assert.ok(findCardinalPath(floor, floor.start, exit)?.length);
  }
});

test("temporary sessions retain an independent reference across regeneration", () => {
  const original = createCampaign(17);
  const saved = JSON.stringify(original);
  const boundary = new PerformanceSession();
  const experiment = boundary.enter(original); experiment.counters.gold = 999;
  for (const size of [50, 100, 200]) {
    const next = boundary.regenerate(size); assert.equal(next.floor.width, size);
    assert.equal(next.counters.gold, original.counters.gold);
    assert.equal(JSON.stringify(original), saved);
  }
  assert.deepEqual(boundary.exit(), original);
  assert.equal(boundary.active, false);
  assert.throws(() => boundary.regenerate(50));
});

test("Perf restarts preserve the current topology instead of silently selecting legacy generation", () => {
  const source = createRunCampaign(739064, 1, 1);
  const original = JSON.stringify(source);
  const boundary = new PerformanceSession(); boundary.enter(source);
  for (const size of [50, 100, 200]) {
    const next = boundary.regenerate(size);
    assert.equal(next.floor.generationProfile?.topologyVersion, source.floor.generationProfile?.topologyVersion);
    assert.equal(next.floor.width, size);
  }
  assert.equal(JSON.stringify(source), original);
});

test("a historical active floor stays legacy when its campaign uses graph generation for future floors", () => {
  const campaign = createRunCampaign(739065, 1, 1);
  const seed = campaign.floor.seed;
  campaign.floor = generateFloor(1, seed);
  const profile = { seed, difficulty: 1, generatorVersion: campaign.generatorVersion! };
  campaign.floor.generationProfile = profile;
  campaign.floorProfiles!["1"] = profile;
  assert.equal(campaign.topologyVersion, "dungeon-graph-1");
  const boundary = new PerformanceSession(); boundary.enter(campaign);
  for (const size of [50, 100]) {
    const next = boundary.regenerate(size);
    assert.equal(next.floor.generationProfile?.topologyVersion, undefined);
    assert.deepEqual(next.floor.cells, generateFloor(1, seed, 1, { size: size as 50 | 100 }).cells);
  }
});

test("frozen movement preserves time, enemies, projectiles and encounter state", () => {
  const original = createCampaign(17);
  original.floor = generateFloor(1, 17);
  original.player = { ...original.player, ...original.floor.start, pixel: { x: original.floor.start.x * 32 + 16, y: original.floor.start.y * 32 + 16 } };
  const snapshot = JSON.stringify(original.floor);
  let frozen = true, commits = 0;
  const session = createGameSession(original, { getSimulationFrozen: () => frozen, onCommit: () => { commits++; } });
  const result = session.dispatch({ type: "move-pixels", to: { x: original.player.pixel!.x - 1, y: original.player.pixel!.y } });
  assert.ok(result?.accepted); assert.equal(result.ticks, 0);
  assert.notDeepEqual(session.getState().player.pixel, original.player.pixel);
  assert.equal(JSON.stringify(session.getState().floor), snapshot);
  assert.equal(session.dispatch({ type: "wait" })?.accepted, false);
  setPerformanceOptions({ enabled: true, simulation: "frozen" });
  resetPerformanceMetrics();
  const crossing = applyFrozenMovement(original, { type: "move", direction: "w" });
  assert.ok(crossing.accepted);
  assert.equal(crossing.state.floor.time, original.floor.time);
  assert.equal(readPerformanceMetrics().cpu["clone/upgrade (inclusive)"].count, 1);
  assert.equal(readPerformanceMetrics().counts.ticks ?? 0, 0);
  assert.equal(createGameSession(original).dispatch({ type: "wait" })?.ticks, 1);
  resetPerformanceOptions();
  frozen = false; const time = session.getState().floor.time;
  assert.equal(session.dispatch({ type: "wait" })?.ticks, 1);
  assert.equal(session.getState().floor.time, time + 1); assert.equal(commits, 2);
});

test("ordinary turns retain immutable terrain and repeated discovery reads decode once", () => {
  const original = createCampaign(17);
  const result = applyAction(original, { type: "wait" });
  assert.strictEqual(result.state.floor.cells, original.floor.cells);
  setPerformanceOptions({ enabled: true });
  resetPerformanceMetrics();
  for (let i = 0; i < 100; i++) isCellDiscovered(original, original.player);
  assert.ok((readPerformanceMetrics().counts["discovery decodes"] ?? 0) <= 1);
  resetPerformanceOptions();
});

test("spatial presentation reuses unchanged inputs and bounds exclude outside entities", () => {
  const original = createCampaign(17); const read = createWorldPresentationReader();
  const options = { cells: original.floor.cells, entities: original.floor.entities, player: original.player };
  const first = read(options);
  assert.strictEqual(read({ ...options, player: { ...original.player } }), first);
  const bounds = performanceCellBounds(original.player, { minX: 0, minY: 0, maxX: 99, maxY: 99 }, 100, 100);
  assert.equal(bounds.maxX - bounds.minX + 1, 20);
  const local = read(options, "", bounds);
  assert.ok(local.objects.every(o => o.x >= bounds.minX && o.x <= bounds.maxX && o.y >= bounds.minY && o.y <= bounds.maxY));
  const changed = read({ ...options, cells: structuredClone(options.cells) }, "repair");
  assert.notStrictEqual(changed, first);
});

test("frame summaries report display intervals and reset between comparisons", () => {
  setPerformanceOptions({ enabled: true }); performanceFrame(100); performanceFrame(108); performanceFrame(116);
  assert.equal(readPerformanceMetrics().median, 8);
  assert.equal(readPerformanceMetrics().fps, 125);
  resetPerformanceMetrics(); assert.equal(readPerformanceMetrics().frames, 0);
  resetPerformanceOptions();
});

test("minimap mover interpolation does not invalidate static dots and puzzles retain their state", () => {
  const original = createCampaign(17);
  const read = createWorldPresentationReader();
  const world = read({ cells: original.floor.cells, player: original.player });
  const model = { ...world, actors: [{ id: "enemy", x: 2, y: 2 }], puzzleObjects: [
    { id: "set-barrel", kind: "barrel", x: 3, y: 3, active: false },
    { id: "door", kind: "door", x: 4, y: 4, active: true },
  ] } as unknown as typeof world;
  const key = minimapBackgroundRevision(model, "");
  const entries = minimapMarkerEntries(model, { x: 1.5, y: 1 }, new Set(["enemy"]), (id, fallback) => id === "enemy" ? {x:2.5,y:2} : id === "set-barrel" ? {x:3.5,y:3} : fallback);
  assert.deepEqual(entries.map(entry => entry.position.x), [1.5, 2.5, 3.5, 4]);
  assert.equal(entries[3].frame, 5);
  assert.equal(minimapBackgroundRevision({ ...model, actors: [] }, ""), key);
  assert.notEqual(minimapBackgroundRevision(model, "new discovery"), key);
  assert.equal(minimapMarkerEntries(model, original.player, new Set(), (_id, fallback) => fallback).length, 3);
});

test("mutable copies exclude static grids across active, visited and recovery floors", () => {
  const source = createCampaign(17);
  source.floors = { "1":source.floor, "2":generateFloor(2,17) };
  source.adventureBaseline = createCampaign(18);
  source.journeyCheckpoint = createCampaign(19);
  const guard = new Proxy(source.floor.cells, { get(target, key, receiver) { if (key === "length" || key === Symbol.iterator) throw new Error("Static grid was traversed"); return Reflect.get(target,key,receiver); } });
  source.floor.cells = guard;
  const copy = copyCampaignMutableState(source);
  assert.strictEqual(copy.floor.cells, guard);
  assert.strictEqual(copy.floor.map, source.floor.map);
  assert.strictEqual(copy.floors!["1"], copy.floor);
  assert.strictEqual(copy.floors!["2"].cells, source.floors["2"].cells);
  assert.strictEqual(copy.adventureBaseline!.floor.cells, source.adventureBaseline.floor.cells);
  assert.strictEqual(copy.journeyCheckpoint!.floor.cells, source.journeyCheckpoint.floor.cells);
  copy.player.resources.health.current = 0;
  copy.floor.entities.length = 0;
  copy.adventureBaseline!.counters.gold = 999;
  assert.ok(source.player.resources.health.current > 0);
  assert.ok(source.floor.entities.length > 0);
  assert.notEqual(source.adventureBaseline.counters.gold, 999);
});

test("trusted session validates geometry once and revalidates replacement references", () => {
  const source = createCampaign(17);
  const session = createGameSession(source);
  setPerformanceOptions({enabled:true}); resetPerformanceMetrics();
  session.dispatch({type:"wait"});
  const first = session.getState();
  session.dispatch({type:"wait"});
  assert.strictEqual(session.getState().floor.cells, first.floor.cells);
  assert.strictEqual(session.getState().floor.map, first.floor.map);
  assert.equal(readPerformanceMetrics().counts["static normalization boundaries"], 1);
  session.getState().floor.cells = structuredClone(first.floor.cells);
  session.getState().floor.map = undefined;
  session.dispatch({type:"wait"});
  assert.equal(readPerformanceMetrics().counts["static normalization boundaries"], 2);
  resetPerformanceOptions();
});

test("shared-static actions match full-copy legacy control and retain old mutable state", () => {
  const initial = createCampaign(17);
  let control = structuredClone(initial);
  const session = createGameSession(copyCampaignMutableState(initial));
  for (const action of [{type:"wait"},{type:"move",direction:"w"},{type:"move",direction:"e"},{type:"wait"}] as const) {
    const old = session.getState(), snapshot = JSON.stringify(old);
    const result = session.dispatch(action)!;
    const expected = applyAction(structuredClone(control), action);
    assert.ok("state" in result);
    assert.equal(result.accepted, expected.accepted);
    assert.deepEqual(result.events.filter(e=>e.type!=="action.committed").map(({type,facts,gameTime})=>({type,facts,gameTime})),expected.events.map(({type,facts,gameTime})=>({type,facts,gameTime})));
    assert.equal(JSON.stringify(old),snapshot);
    assert.deepEqual(JSON.parse(JSON.stringify(result.state)),JSON.parse(JSON.stringify(expected.state)));
    control=expected.state;
  }
});

test("normal renderer gates world details by discovery and unarmed hover stays transparent", () => {
  const renderer = readFileSync(new URL("../src/systems/rendering/babylon-render-system.tsx", import.meta.url), "utf8");
  assert.match(renderer, /createDiscoveryReader\(state\)/);
  assert.ok((renderer.match(/isDiscovered: \(\) => true/g) ?? []).length >= 2);
  const css = readFileSync(new URL("../src/ui/style.css", import.meta.url), "utf8");
  assert.match(css, /\.world-view__grid-reticle--unarmed\s*\{[^}]*background:transparent/);
});

test("worker prototype rejects stale replies while retaining the last valid semantic buffer", () => {
  const bytes=semanticBuffer({width:2,height:1,terrain:new Uint16Array([0,0]),walls:new Uint16Array([1,0]),objects:new Uint16Array()});
  assert.deepEqual([...bytes],[111,113,128,255,41,40,55,255]);
  const gate=createRevisionGate<Uint8ClampedArray>();
  const first=gate.begin();assert.equal(gate.accept(first,bytes),true);
  const current=gate.begin();
  assert.equal(gate.accept(first,new Uint8ClampedArray()),false);
  assert.strictEqual(gate.current(),bytes);
  assert.equal(gate.accept(current,bytes),true);
});

test("Perf off ignores and clears every diagnostic rendering override", () => {
  resetPerformanceOptions();
  const normal = { ...performanceOptions() };
  setPerformanceOptions({local:true,animated:false,dynamic:false,minimap:"off",simulation:"frozen",enemyLogic:false});
  assert.deepEqual(performanceOptions(),normal);
  setPerformanceOptions({enabled:true});
  assert.deepEqual(performanceOptions(),{...normal,enabled:true});
  setPerformanceOptions({local:true,animated:false,dynamic:false,minimap:"frozen",simulation:"frozen",enemyLogic:false});
  assert.equal(performanceOptions().dynamic,false);
  setPerformanceOptions({enabled:false});
  assert.deepEqual(performanceOptions(),normal);
  setPerformanceOptions({enabled:true});
  assert.deepEqual(performanceOptions(),{...normal,enabled:true});
  resetPerformanceOptions();
});

function enemyDiagnosticArena() {
  const state = createCampaign(17);
  const template = generateFloor(1, 17).entities.find((entity): entity is Enemy => entity.kind === "enemy")!;
  assert.ok(template);
  Object.assign(state.floor, { width: 20, height: 20, cells: createSemanticCells(20, 20, true), map: undefined, entities: [], objectSets: [], decorations: [], projectiles: [], time: 2 });
  Object.assign(state.player, { x: 10, y: 10, pixel: { x: 336, y: 336 } });
  const enemy = { ...structuredClone(template), id: "diagnostic-enemy", x: 7, y: 10, awareness: 20, nextActionAt: 0, actionCooldown: 1 };
  state.floor.entities.push(enemy);
  return state;
}

test("enemy-only pause skips all planning and attacks but keeps visible entities and world time", () => {
  const source = enemyDiagnosticArena();
  const melee = source.floor.entities[0] as Enemy; melee.x = 9;
  const ranged = { ...structuredClone(melee), id: "diagnostic-ranged", x: 10, y: 7, attackKind: "ranged" as const };
  source.floor.entities.push(ranged);
  let paused = true;
  const session = createGameSession(source, { getEnemyLogicDisabled: () => paused });
  setPerformanceOptions({ enabled: true }); resetPerformanceMetrics();
  try {
    for (let i = 0; i < 4; i++) assert.ok(session.dispatch({ type: "wait" })?.accepted);
    const after = session.getState();
    assert.equal(after.floor.time, source.floor.time + 4);
    assert.deepEqual(after.floor.entities, source.floor.entities);
    assert.deepEqual(after.floor.projectiles, []);
    assert.equal(after.player.resources.health.current, source.player.resources.health.current);
    const metrics = readPerformanceMetrics();
    assert.equal(metrics.counts["enemy turns suppressed"], 4);
    assert.equal(metrics.counts["enemy visits"] ?? 0, 0);
    assert.equal(metrics.cpu["AI (inclusive)"], undefined);
    assert.equal(metrics.cpu["navigation (inclusive)"], undefined);
    paused = false;
    const resumed = session.dispatch({ type: "wait" });
    assert.ok(resumed && "state" in resumed);
    assert.equal(resumed.ticks, 1);
    assert.equal(readPerformanceMetrics().cpu["AI (inclusive)"].count, 1);
    assert.ok(resumed.events.some(event => event.type === "combat.hit"));
    // A separate ordinary session always runs AI. No serialized pause flag leaks.
    assert.ok(createGameSession(after).dispatch({ type: "wait" })?.events.some(event => event.type === "combat.hit"));
    assert.equal(JSON.stringify(after).includes("enemyLogicDisabled"), false);
  } finally { resetPerformanceOptions(); }
});

test("enemy pause survives nested gridless entries and does not pause player movement", () => {
  const source = enemyDiagnosticArena();
  Object.assign(source.floor.entities[0], { x: 1, y: 1, awareness: 1 });
  const session = createGameSession(source, { getEnemyLogicDisabled: () => true });
  setPerformanceOptions({ enabled: true }); resetPerformanceMetrics();
  try {
    const result = session.dispatch({ type: "move-pixels", to: { x: 336 + 96, y: 336 } });
    assert.ok(result && "state" in result && result.accepted);
    assert.equal(result.ticks, 3);
    assert.equal(result.state.floor.time, source.floor.time + 3);
    assert.equal(result.state.player.pixel!.x, 432);
    assert.deepEqual(result.state.floor.entities, source.floor.entities);
    assert.equal(readPerformanceMetrics().counts["enemy turns suppressed"], 3);
    assert.equal(readPerformanceMetrics().counts["enemy visits"] ?? 0, 0);
  } finally { resetPerformanceOptions(); }
});

test("pausing enemy presentation settles enemies without stopping player interpolation", () => {
  const before = enemyDiagnosticArena(), after = copyCampaignMutableState(before);
  after.player.x++; after.player.pixel!.x += 32; after.floor.entities[0].x++;
  const presentation = new TurnPresentationSystem(); presentation.reset(before);
  presentation.begin(before, after, new Set([before.floor.entities[0].id]), 0);
  presentation.sample(50);
  const player = { ...presentation.playerPositionOf(after.player) };
  presentation.settleEnemies(after);
  assert.deepEqual(presentation.positionOf(after.floor.entities[0].id, before.player), { x: after.floor.entities[0].x, y: after.floor.entities[0].y });
  assert.deepEqual(presentation.playerPositionOf(after.player), player);
  presentation.sample(100);
  assert.notDeepEqual(presentation.playerPositionOf(after.player), player);
  assert.deepEqual(presentation.positionOf(after.floor.entities[0].id, before.player), { x: after.floor.entities[0].x, y: after.floor.entities[0].y });
});

test("lazy navigation matches full-grid paths including blockers, pickups, doors and node budgets", () => {
  const state = enemyDiagnosticArena(), floor = state.floor;
  floor.entities = [];
  for (let y = 0; y < 19; y++) if (y !== 3 && y !== 15) setCell(floor, 8, y, { walkable: false });
  floor.entities.push({ id: "gold-shortcut", kind: "gold", x: 8, y: 3, amount: 1 } as Campaign["floor"]["entities"][number]);
  floor.objectSets = [{ id: "locked", kind: "encounter-lockdown", activated: true, completed: false, doors: [{x:8,y:15}] }] as typeof floor.objectSets;
  ensureSemanticCells(floor); markRuntimeGridValid(floor);
  const from = { x: 2, y: 5 }, targets = [{x:14,y:5},{x:3,y:3},{x:8,y:5},{x:18,y:18}];
  for (const to of targets) for (const maxNodes of [1, 20, 400, undefined]) for (const respectObjectSets of [false, true]) {
    const options = { maxNodes, respectObjectSets, isBlocked: ({x,y}: {x:number;y:number}) => x === 5 && y > 4 && y < 17 };
    assert.deepEqual(findCardinalPath(floor, from, to, options), referencePath(floor, from, to, options));
    assert.deepEqual(findCardinalApproachPath(floor, from, to, options), referenceApproach(floor, from, to, options));
  }
  // The next query sees both in-place terrain edits and changing dynamic gates.
  for (const open of [true, false, true]) {
    setCell(floor, 8, 5, { walkable: open });
    assert.deepEqual(findCardinalPath(floor, from, targets[0]), referencePath(floor, from, targets[0]));
  }
});

test("local pursuit checks local nodes rather than whole 100 and 200 cell-wide floors", () => {
  setPerformanceOptions({ enabled: true });
  try {
    for (const size of [100, 200] as const) {
      const floor = generateFloor(1, 17, 1, { size });
      floor.entities = [];
      ensureSemanticCells(floor); markRuntimeGridValid(floor);
      const from = floor.start, to = { x: from.x + 1, y: from.y };
      const expected = referencePath(floor, from, to);
      resetPerformanceMetrics();
      assert.deepEqual(findCardinalPath(floor, from, to), expected);
      assert.ok(expected && expected.length > 1);
      assert.ok(readPerformanceMetrics().counts["navigation cells tested"] < 100);
      floor.cells = structuredClone(floor.cells); floor.map = undefined;
      assert.deepEqual(findCardinalPath(floor, from, to), referencePath(floor, from, to));
    }
  } finally { resetPerformanceOptions(); }
});

test("serial action commits expose complete authoritative state before saving or queued input", () => {
  const source = createCampaign(17);
  const initialTime = source.floor.time;
  const commits: number[] = [];
  const eventOrders: number[][] = [];
  let queued = false;
  const session = createGameSession(source, { onCommit(result) {
    assert.strictEqual(session.getState(), result.state);
    assert.equal(result.events.at(-1)?.type, "action.committed");
    commits.push(result.state.floor.time);
  } });
  session.subscribe(result => {
    eventOrders.push(result.events.map(event => event.sequence!));
    if (!queued) { queued = true; const result = session.dispatch({type:"wait"}); assert.ok(result && "queued" in result && result.queued); }
  });
  session.dispatch({type:"wait"});
  assert.deepEqual(commits,[source.floor.time+1,source.floor.time+2]);
  for(const order of eventOrders) assert.deepEqual(order,order.map((_value,index)=>index+1));
  assert.equal(source.floor.time,initialTime);
});

test("batched enemy paths preserve exact routes, budgets, trap groups and occupancy", () => {
  const source = enemyDiagnosticArena(), floor = source.floor;
  let randomState = 17;
  const random = () => (randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0) / 0x1_0000_0000;
  for (let fixture = 0; fixture < 12; fixture++) {
    floor.cells = createSemanticCells(20, 20, true); floor.map = undefined;
    for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) if (random() < .23) floor.cells[y][x].walkable = false;
    const target = { x: 10, y: 10 }; floor.cells[10][10].walkable = true;
    const enemies = Array.from({ length: 8 }, (_, index) => ({ ...structuredClone(source.floor.entities.find(e => e.kind === "enemy") ?? enemyDiagnosticArena().floor.entities[0]),
      id: `pursuer-${index}`, kind: "enemy", x: 2 + index * 2, y: 3 + index % 3, awareness: 30, nextActionAt: 0, ai: { state: "idle", targetId: null } } as Enemy));
    for (const enemy of enemies) floor.cells[enemy.y][enemy.x].walkable = true;
    floor.entities = [...enemies, { id: "gold", kind: "gold", x: 7, y: 10, amount: 1 }, { id: "pickup", kind: "potion", x: 9, y: 9 } as Campaign["floor"]["entities"][number]];
    ensureSemanticCells(floor); markRuntimeGridValid(floor);
    for (const budget of [1, 7, 512]) {
      const batch = createCardinalPathBatch(floor, target);
      const canEnter = (enemy: Enemy, p: {x:number;y:number}) => !(p.x === 8 && p.y !== (Number(enemy.id.at(-1)) % 2 ? 5 : 14));
      for (const enemy of enemies) {
        const options = { maxNodes: budget, isBlocked: (p: {x:number;y:number}) => !canEnter(enemy, p) };
        assert.deepEqual(batch(enemy, options, String(Number(enemy.id.at(-1)) % 2)), referencePath(floor, enemy, target, options));
      }
      const expected = enemies.map(enemy => {
        const path = referencePath(floor, enemy, target, { maxNodes: budget, isBlocked: p => !canEnter(enemy, p) });
        return path?.[1] ? { enemyId: enemy.id, kind: "move", state: "pursue", to: path[1] } : { enemyId: enemy.id, kind: "blocked", state: "blocked" };
      });
      assert.deepEqual(planEnemyActions({ floor, player: target, time: 10, enemies, effectiveAwareness: () => 30, canAttack: () => false, canEnter, maxPathNodes: budget,
        navigationGroup: enemy => String(Number(enemy.id.at(-1)) % 2) }), expected);
    }
  }
});

test("unreachable pursuers share one reverse search and retry changed gates next turn", () => {
  const source = enemyDiagnosticArena(), floor = source.floor;
  floor.cells = createSemanticCells(100, 100, true); floor.map = undefined; floor.width = 100; floor.height = 100;
  const enemies = Array.from({ length: 12 }, (_, index) => ({ ...structuredClone(floor.entities[0]), kind: "enemy", id: `pursuer-${index}`, x: 48, y: 44 + index,
    awareness: 30, nextActionAt: 0, ai: { state: "idle", targetId: null } } as Enemy));
  floor.entities = enemies; ensureSemanticCells(floor); markRuntimeGridValid(floor);
  let closed = true;
  const input = { floor, player: { x: 52, y: 50 }, time: 10, enemies, effectiveAwareness: () => 30, canAttack: () => false,
    canEnter: (_enemy: Enemy, p: {x:number;y:number}) => !closed || p.x !== 50, navigationGroup: () => "same-traps" };
  setPerformanceOptions({ enabled: true }); resetPerformanceMetrics();
  try {
    assert.ok(planEnemyActions(input).every(intent => intent.kind === "blocked"));
    const counts = readPerformanceMetrics().counts;
    assert.equal(counts["enemy navigation batches"], 1);
    assert.equal(counts["enemy paths rejected"], enemies.length);
    assert.equal(counts["navigation cells tested"], undefined);
    assert.ok(counts["enemy reachability cells"] <= 100 * 100);
    closed = false;
    assert.ok(planEnemyActions(input).every(intent => intent.kind === "move"));
    // An entity occupying the destination blocks every route in a fresh batch.
    floor.entities.push({ ...enemies[0], id: "target-occupant", ...input.player });
    assert.ok(planEnemyActions(input).every(intent => intent.kind === "blocked"));
  } finally { resetPerformanceOptions(); }
});

test("small enemy scenario is deterministic, reachable, temporary and comparable with logic off", () => {
  const reference = createCampaign(17), original = JSON.stringify(reference), perf = new PerformanceSession();
  assert.throws(() => perf.enemyScenario());
  perf.enter(reference);
  const first = perf.enemyScenario(), second = perf.enemyScenario();
  assert.equal(first.floor.width, 50); assert.equal(first.floor.height, 50);
  assert.deepEqual(first, second);
  const enemies = first.floor.entities.filter((e): e is Enemy => e.kind === "enemy");
  assert.equal(enemies.length, 8);
  const occupied = new Set<string>();
  for (const enemy of enemies) {
    const key = `${enemy.x},${enemy.y}`;
    assert.ok(!occupied.has(key)); occupied.add(key);
    assert.ok(first.floor.cells[enemy.y][enemy.x].walkable);
    assert.ok(findCardinalPath({ ...first.floor, entities: [] }, first.player, enemy)?.length);
  }
  const live = createGameSession(first).dispatch({ type: "wait" });
  const paused = createGameSession(second, { getEnemyLogicDisabled: () => true }).dispatch({ type: "wait" });
  assert.ok(live && "state" in live); assert.ok(paused && "state" in paused);
  assert.equal(live.ticks, 1); assert.equal(paused.ticks, 1);
  assert.ok(live.state.floor.entities.some(e => e.kind === "enemy" && (e.x !== enemies.find(prior => prior.id === e.id)!.x || e.y !== enemies.find(prior => prior.id === e.id)!.y)));
  assert.deepEqual(paused.state.floor.entities.filter(e => e.kind === "enemy"), enemies);
  assert.equal(JSON.stringify(reference), original); assert.deepEqual(perf.exit(), reference);
});

test("direction-field prototype returns legal shortest cardinal steps and shares expanded cells", () => {
  const floor = enemyDiagnosticArena().floor;
  floor.entities = [];
  for (let y = 0; y < 19; y++) if (y !== 2) setCell(floor, 10, y, { walkable: false });
  const target = {x:15,y:10};
  const field = createEnemyDirectionField(floor, target, () => false);
  for (const from of [{x:2,y:10},{x:3,y:11},{x:4,y:12},{x:14,y:10}]) {
    const step = field.nextStep(from);
    assert.ok(step);
    assert.equal(Math.abs(step.x-from.x)+Math.abs(step.y-from.y),1);
    assert.equal(findCardinalPath(floor, from, target)!.length, findCardinalPath(floor, step, target)!.length+1);
  }
  assert.ok(field.expanded <= floor.width*floor.height);
});
