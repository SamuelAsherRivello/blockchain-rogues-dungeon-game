import assert from "node:assert/strict";
import test from "node:test";
import type { StorageCollection } from "../src/game/types.ts";
import { DEFAULT_PREFERENCES, DEVELOPMENT_STORAGE_COMPATIBILITY_EPOCH, DEVELOPMENT_STORAGE_COMPATIBILITY_KEY, readPreferences, readSlot, readSlotSummary, readWorldSeed, resetDevelopmentStorageCompatibility, writePreferences, writeSlot } from "../src/systems/persistence/save-system.ts";
import { compactCampaignForSave, createRunCampaign, PORTAL_LAYOUT_VERSION } from "../src/systems/procedural/world-procedural-system.ts";
import { DEFAULT_WORLD_ATTRIBUTES } from "../src/systems/procedural/world-attributes.ts";
import { WORLD_BALANCE_VERSION } from '../src/systems/procedural/world-balance.ts';
import { compatibleFixtureStorageState } from "./browser/fixture-storage.ts";

class MemoryStorage implements StorageCollection {
  readonly values: Map<string, string>;
  readonly removed: string[] = [];
  readonly written: string[] = [];
  constructor(initial: [string, string][] = []) { this.values = new Map(initial); }
  get length() { return this.values.size; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.written.push(key); this.values.set(key, value); }
  removeItem(key: string) { this.removed.push(key); this.values.delete(key); }
}

test('Jewel generation has its own epoch and refuses stale regenerated balance profiles', () => {
  assert.ok(DEVELOPMENT_STORAGE_COMPATIBILITY_EPOCH.includes('flexible-jewels-1'));
  assert.equal(WORLD_BALANCE_VERSION, 'world-balance-2-jewels');
  const state = compactCampaignForSave(createRunCampaign(875, 1, 1, 1, 2, { worldAttributes: DEFAULT_WORLD_ATTRIBUTES }));
  state.floor.generationProfile!.tuningVersion = 'world-attributes-1:world-balance-1';
  const bytes = JSON.stringify(state);
  const storage = new MemoryStorage([['rogues-dungeon.slot.1', bytes]]);
  assert.equal(readSlot(storage, '1'), null);
  assert.equal(storage.getItem('rogues-dungeon.slot.1'), bytes);
});

function browserStorage<T>(storage: StorageCollection, run: () => T): T {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: storage } });
  try { return run(); }
  finally {
    if (descriptor) Object.defineProperty(globalThis, "window", descriptor);
    else Reflect.deleteProperty(globalThis, "window");
  }
}

test("the development compatibility reset clears every game key and preserves unrelated origin data", () => {
  const gameKeys = [
    "rogues-dungeon.slot.1", "rogues-dungeon.slot.2", "rogues-dungeon.slot.3",
    "rogues-dungeon.slot.v1-backup.1", "rogues-dungeon.slot.discovery-v2-backup.2",
    "rogues-dungeon.world-seed.v1", "rogues-dungeon.preferences.v1", "rogues-dungeon.dev.leveltest",
    "rogues-dungeon.dev.aspect", "rogues-dungeon.future-game-key", DEVELOPMENT_STORAGE_COMPATIBILITY_KEY,
  ];
  const unrelated: [string, string][] = [["other-app.preferences", "keep"], ["rogues-dungeon-other-project", "keep too"], ["rogues-dungeon", "also keep"]];
  const storage = new MemoryStorage([...gameKeys.map((key): [string, string] => [key, "old data"]), ...unrelated]);
  assert.equal(resetDevelopmentStorageCompatibility(storage), true);
  for (const key of gameKeys.filter((key) => key !== DEVELOPMENT_STORAGE_COMPATIBILITY_KEY)) assert.equal(storage.getItem(key), null, key);
  for (const [key, value] of unrelated) assert.equal(storage.getItem(key), value);
  assert.equal(storage.getItem(DEVELOPMENT_STORAGE_COMPATIBILITY_KEY), DEVELOPMENT_STORAGE_COMPATIBILITY_EPOCH);
  assert.deepEqual(storage.removed, gameKeys);
});

test("new saves, preferences, and seed survive every subsequent startup in the same epoch", () => {
  const storage = new MemoryStorage([["rogues-dungeon.slot.2", "obsolete compact record"]]);
  browserStorage(storage, () => {
    assert.deepEqual(readSlotSummary(storage).map(({ occupied }) => occupied), [false, false, false]);
    const campaign = createRunCampaign(421, 2, 1, 1, 1, { worldAttributes: DEFAULT_WORLD_ATTRIBUTES });
    writeSlot(storage, "2", campaign);
    writePreferences(storage, { ...DEFAULT_PREFERENCES, muteAll: true });
    assert.equal(readWorldSeed(storage, 421), 421);
    const saved = storage.getItem("rogues-dungeon.slot.2");
    const removed = storage.removed.length;
    const epochWrites = storage.written.filter((key) => key === DEVELOPMENT_STORAGE_COMPATIBILITY_KEY).length;
    for (let startup = 0; startup < 3; startup++) {
      assert.equal(resetDevelopmentStorageCompatibility(storage), false);
      assert.equal(readSlotSummary(storage)[1].occupied, true);
      assert.equal(readPreferences(storage).muteAll, true);
      assert.equal(readWorldSeed(storage, 999), 421);
      assert.equal(readSlot(storage, "2")!.portalLayoutVersion, PORTAL_LAYOUT_VERSION);
      assert.equal(storage.getItem("rogues-dungeon.slot.2"), saved);
    }
    assert.equal(storage.removed.length, removed);
    assert.equal(storage.written.filter((key) => key === DEVELOPMENT_STORAGE_COMPATIBILITY_KEY).length, epochWrites);
  });
});

test("the existing browser startup readers reset obsolete data before parsing it", () => {
  for (const firstRead of [
    (storage: MemoryStorage) => assert.deepEqual(readSlotSummary(storage).map(({ occupied }) => occupied), [false, false, false]),
    (storage: MemoryStorage) => assert.deepEqual(readPreferences(storage), DEFAULT_PREFERENCES),
    (storage: MemoryStorage) => assert.equal(readWorldSeed(storage, 123), 123),
  ]) {
    const storage = new MemoryStorage([
      ["rogues-dungeon.slot.1", "malformed obsolete save"],
      ["rogues-dungeon.preferences.v1", "malformed obsolete preferences"],
      ["rogues-dungeon.world-seed.v1", "998"],
      ["other-app.key", "unrelated"],
      [DEVELOPMENT_STORAGE_COMPATIBILITY_KEY, "previous epoch"],
    ]);
    browserStorage(storage, () => firstRead(storage));
    assert.equal(storage.getItem("rogues-dungeon.slot.1"), null);
    assert.equal(storage.getItem("other-app.key"), "unrelated");
    assert.equal(storage.getItem(DEVELOPMENT_STORAGE_COMPATIBILITY_KEY), DEVELOPMENT_STORAGE_COMPATIBILITY_EPOCH);
  }
});

test("failed cleanup does not mark the epoch complete and retries on the next startup", () => {
  const storage = new MemoryStorage([
    ["rogues-dungeon.slot.1", "old one"], ["rogues-dungeon.slot.2", "old two"],
    [DEVELOPMENT_STORAGE_COMPATIBILITY_KEY, "previous epoch"], ["other-app.key", "keep"],
  ]);
  const remove = storage.removeItem.bind(storage);
  storage.removeItem = (key) => { if (key === "rogues-dungeon.slot.2") throw new Error("blocked removal"); remove(key); };
  assert.throws(() => resetDevelopmentStorageCompatibility(storage), /blocked removal/);
  assert.notEqual(storage.getItem(DEVELOPMENT_STORAGE_COMPATIBILITY_KEY), DEVELOPMENT_STORAGE_COMPATIBILITY_EPOCH);
  storage.removeItem = remove;
  assert.equal(resetDevelopmentStorageCompatibility(storage), true);
  assert.equal(resetDevelopmentStorageCompatibility(storage), false);
  assert.equal(storage.getItem("rogues-dungeon.slot.2"), null);
  assert.equal(storage.getItem("other-app.key"), "keep");
});

test("shared browser fixture state stamps the current epoch before intentional seeded data", () => {
  for (const port of [4173, 6080]) {
    const state = compatibleFixtureStorageState(`http://127.0.0.1:${port}/blockchain-rogues-dungeon-game/?mute=1`);
    assert.deepEqual(state.cookies, []);
    assert.equal(state.origins[0].origin, `http://127.0.0.1:${port}`);
    const storage = new MemoryStorage(state.origins[0].localStorage.map(({ name, value }) => [name, value]));
    // Simulate an existing spec's addInitScript after context storage creation.
    const saved = JSON.stringify(compactCampaignForSave(createRunCampaign(875, 1, 1, 1, 1, { worldAttributes: DEFAULT_WORLD_ATTRIBUTES })));
    storage.setItem("rogues-dungeon.slot.1", saved);
    storage.setItem("rogues-dungeon.preferences.v1", JSON.stringify({ ...DEFAULT_PREFERENCES, muteAll: true }));
    storage.setItem("rogues-dungeon.dev.aspect", "portrait");
    browserStorage(storage, () => {
      assert.equal(readPreferences(storage).muteAll, true);
      assert.deepEqual(readSlotSummary(storage).map(({ occupied }) => occupied), [true, false, false]);
      assert.equal(readSlot(storage, "1")!.portalLayoutVersion, PORTAL_LAYOUT_VERSION);
    });
    assert.equal(storage.getItem("rogues-dungeon.dev.aspect"), "portrait");
    assert.equal(storage.getItem("rogues-dungeon.slot.1"), saved);
    assert.deepEqual(storage.removed, []);
  }
});
