import assert from "node:assert/strict";
import test from "node:test";
import { applyAction, createCampaign, createRunCampaign, prepareJourneyCheckpoint, buildDeathRecovery } from "../src/systems/procedural/world-procedural-system.ts";
import { readSlot, writeSlot } from "../src/systems/persistence/save-system.ts";
import { createDiscoveryReader, discoveryRealmKey, discoveryRevision, discoveryStatistics, discoveredCoverage, isCellDiscovered, revealDiscovery } from "../src/systems/procedural/map-discovery-system.ts";

test("rounded reveal is bounded, crosses walls, and leaves an unchanged bitmap untouched", () => {
  const c = createCampaign(17); c.discovery = {}; const time = c.floor.time;
  revealDiscovery(c, { x: 0, y: 0 });
  assert.equal(isCellDiscovered(c, { x: 4, y: 0 }), true);
  assert.equal(isCellDiscovered(c, { x: 4, y: 4 }), false);
  assert.equal(isCellDiscovered(c, { x: -1, y: 0 }), false);
  const record = c.discovery;
  for (const rt of [0, 1, 2, 3]) {
    c.player.heading = rt % 2 ? "w" : "e";
    c.progression.attributes.perception = rt;
    revealDiscovery(c, { x: 0, y: 0 });
    assert.equal(c.discovery, record);
  }
  assert.equal(c.floor.time, time);
});

test("world, run, seed and dimensions isolate knowledge; legacy dimensions must match", () => {
  const c = createCampaign(17); c.discovery = {}; revealDiscovery(c, { x: 20, y: 20 }, 0);
  const value = discoveryRevision(c), key = discoveryRealmKey(c);
  for (const changed of [{ world: "Other" }, { run: 123 }, { floor: { ...c.floor, seed: 999 } }]) {
    assert.equal(isCellDiscovered({ ...c, ...changed }, { x: 20, y: 20 }), false);
  }
  c.discovery = { "1": value };
  assert.equal(isCellDiscovered(c, { x: 20, y: 20 }), true);
  assert.equal(isCellDiscovered({ ...c, floor: { ...c.floor, width: 2 } }, { x: 0, y: 0 }), false);
  assert.equal(isCellDiscovered({ ...c, discovery: { [key]: "100x100:???" } }, { x: 20, y: 20 }), false);
  c.activePrefab = { id: "player-home", returnLevel: 1, returnPosition: c.player, prefabPosition: c.player };
  assert.equal(isCellDiscovered(c, { x: 20, y: 20 }), false);
});

test("full coverage counts real cells and cached bytes are never mutated by another campaign", () => {
  const c = createCampaign(17); c.floor = { ...c.floor, width: 3, height: 3 }; c.discovery = {};
  revealDiscovery(c, { x: 1, y: 1 }, 0);
  const copy = structuredClone(c);
  revealDiscovery(copy, { x: 1, y: 1 }, 10);
  assert.equal(discoveredCoverage(copy), 100);
  assert.equal(discoveredCoverage(c), 11);
});

test("new runs reveal arrival; reload and Journey checkpoint preserve their own knowledge", () => {
  const c = createRunCampaign(17, 1, 2, 1, 1, { mode: "journey" });
  assert.equal(isCellDiscovered(c, c.player), true);
  c.journeyCheckpoint = prepareJourneyCheckpoint(c);
  const point = { x: 0, y: 0 }; revealDiscovery(c, point, 0);
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
  writeSlot(storage, "1", c);
  assert.equal(isCellDiscovered(readSlot(storage, "1")!, point), true);
  assert.equal(isCellDiscovered(buildDeathRecovery(c)!, point), false);
  assert.equal(readSlot(storage, "2"), null);
  const legacy = structuredClone(c); legacy.discovery = { "1": discoveryRevision(c) };
  values.delete("rogues-dungeon.slot.v1-backup.1");
  const raw = JSON.stringify(legacy); storage.setItem("rogues-dungeon.slot.1", raw);
  const loaded = readSlot(storage, "1")!;
  assert.equal(isCellDiscovered(loaded, point), true);
  assert.equal(storage.getItem("rogues-dungeon.slot.v1-backup.1"), raw);
});

test("home arrival and dungeon return retain separate knowledge without consuming time", () => {
  const c = createRunCampaign(17, 1, 1, 1, 1, { level1TestMode: true });
  const arrow = c.floor.entities.find((e) => e.kind === "teleport-arrow")!;
  c.player.x = arrow.x; c.player.y = arrow.y;
  revealDiscovery(c, c.player);
  const dungeonKey = discoveryRealmKey(c), time = c.floor.time;
  const entered = applyAction(c, { type: "enter-teleport" });
  assert.equal(entered.accepted, true); assert.equal(entered.ticks, 0);
  const home = entered.state;
  assert.notEqual(discoveryRealmKey(home), dungeonKey);
  assert.equal(isCellDiscovered(home, home.player), true);
  const homeKey = discoveryRealmKey(home), homeBits = discoveryRevision(home);
  const back = home.floor.entities.find((e) => e.kind === "teleport-arrow")!;
  home.player.x = back.x; home.player.y = back.y;
  const returned = applyAction(home, { type: "enter-teleport" }).state;
  assert.equal(returned.activePrefab, undefined);
  for (let y = 0; y < c.floor.height; y++) for (let x = 0; x < c.floor.width; x++) {
    if (isCellDiscovered(c, { x, y })) assert.equal(isCellDiscovered(returned, { x, y }), true);
  }
  assert.equal(returned.discovery?.[homeKey], homeBits);
  assert.equal(returned.floor.time, time);
});

test("stairs create independent arrival knowledge and return retains the visited level", () => {
  const c = createRunCampaign(17, 1, 1);
  const remembered = { x: 0, y: 0 }; revealDiscovery(c, remembered, 0);
  const key = discoveryRealmKey(c);
  const down = c.floor.entities.find(e => e.kind === "stairs" && e.direction !== "back")!;
  c.player.x = down.x; c.player.y = down.y;
  const next = applyAction(c, { type: "enter-stairs" }).state;
  assert.notEqual(discoveryRealmKey(next), key);
  assert.equal(isCellDiscovered(next, next.player), true);
  assert.equal(isCellDiscovered(next, remembered), false);
  const back = next.floor.entities.find(e => e.kind === "stairs" && e.direction === "back")!;
  next.player.x = back.x; next.player.y = back.y;
  const returned = applyAction(next, { type: "enter-stairs" }).state;
  assert.equal(discoveryRealmKey(returned), key);
  assert.equal(isCellDiscovered(returned, remembered), true);
});

test("resolved permission readers retain immutable knowledge and statistics fingerprint it", () => {
  const c = createRunCampaign(17, 1, 1), reader = createDiscoveryReader(c), before = discoveryStatistics(c);
  assert.equal(before.count, 69);
  revealDiscovery(c, { x: 0, y: 0 }, 0);
  assert.equal(reader({ x: 0, y: 0 }), false);
  assert.equal(createDiscoveryReader(c)({ x: 0, y: 0 }), true);
  assert.equal(discoveryStatistics(c).count, 70);
  assert.notEqual(discoveryStatistics(c).fingerprint, before.fingerprint);
});

test("first discovery rewrite preserves malformed original bytes without replacing an older migration backup", () => {
  const campaign = createRunCampaign(17, 1, 1);
  campaign.worldSchemaVersion = 1;
  campaign.discovery = { [discoveryRealmKey(campaign)]: "100x100:???" };
  const original = JSON.stringify(campaign), values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
  storage.setItem("rogues-dungeon.slot.1", original);
  storage.setItem("rogues-dungeon.slot.v1-backup.1", "older legacy bytes");
  const loaded = readSlot(storage, "1")!;
  assert.equal(isCellDiscovered(loaded, loaded.player), true);
  writeSlot(storage, "1", loaded);
  assert.equal(storage.getItem("rogues-dungeon.slot.discovery-v2-backup.1"), original);
  assert.equal(storage.getItem("rogues-dungeon.slot.v1-backup.1"), "older legacy bytes");
  revealDiscovery(loaded, { x: 0, y: 0 }, 0);
  writeSlot(storage, "1", loaded);
  assert.equal(storage.getItem("rogues-dungeon.slot.discovery-v2-backup.1"), original);
});
