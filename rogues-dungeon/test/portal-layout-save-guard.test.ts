import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { Campaign, StorageAccess } from "../src/game/types.ts";
import { compactCampaignForSave, createRunCampaign, LEGACY_PORTAL_LAYOUT_VERSION, PORTAL_LAYOUT_VERSION, resolveCampaignPortalLayouts, restoreCompactCampaign, unresolvedPortalLayoutPaths } from "../src/systems/procedural/world-procedural-system.ts";
import { migrateCampaign, readSlot, readSlotSummary, writeSlot } from "../src/systems/persistence/save-system.ts";
import { PerformanceSession } from "../src/game/performance-session.ts";

class MemoryStorage implements StorageAccess {
  private readonly values: Map<string, string>;
  readonly writes: string[] = [];
  constructor(initial: [string, string][] = []) { this.values = new Map(initial); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.writes.push(key); this.values.set(key, value); }
  removeItem(key: string) { this.writes.push(key); this.values.delete(key); }
  snapshot() { return [...this.values.entries()].sort(([a], [b]) => a.localeCompare(b)); }
}

const oldGraph = (JSON.parse(readFileSync(new URL("./fixtures/pre-portal-graph-generation.json", import.meta.url), "utf8")) as { cases: { record: Campaign }[] }).cases[0].record;
const choose = (campaign: Campaign, version: string) => Object.fromEntries(unresolvedPortalLayoutPaths(campaign).map((path) => [path, version]));

test("unresolved graph records stay unavailable without any storage or campaign mutation", () => {
  const transientPair = compactCampaignForSave(createRunCampaign(1, 2, 1));
  const stripVersions = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    delete (value as Record<string, unknown>).portalLayoutVersion;
    Object.values(value).forEach(stripVersions);
  };
  stripVersions(transientPair);
  for (const record of [oldGraph, transientPair]) {
    const raw = JSON.stringify(record);
    const storage = new MemoryStorage([["rogues-dungeon.slot.2", raw], ["rogues-dungeon.slot.v1-backup.2", "existing backup"]]);
    const original = storage.snapshot();
    assert.equal(readSlotSummary(storage)[1].invalid, true);
    assert.match(readSlotSummary(storage)[1].error!, /explicit resolution/);
    assert.throws(() => readSlot(storage, "2"), /explicit resolution/);
    assert.throws(() => migrateCampaign(record), /explicit resolution/);
    assert.throws(() => restoreCompactCampaign(record), /explicit resolution/);
    assert.throws(() => compactCampaignForSave(record), /explicit resolution/);
    const tagged = createRunCampaign(918, 2, 1);
    const taggedOriginal = JSON.stringify(tagged);
    assert.throws(() => writeSlot(storage, "2", tagged), /explicit resolution/);
    assert.throws(() => writeSlot(new MemoryStorage(), "2", record), /explicit resolution/);
    assert.equal(JSON.stringify(tagged), taggedOriginal);
    assert.equal(JSON.stringify(record), raw);
    assert.deepEqual(storage.snapshot(), original);
    assert.deepEqual(storage.writes, []);
  }
});

test("an unresolved recovery snapshot blocks an otherwise tagged slot without rewriting it", () => {
  for (const recoveryKey of ["adventureBaseline", "journeyCheckpoint"] as const) {
    const campaign = createRunCampaign(221, 2, 1);
    campaign[recoveryKey] = structuredClone(oldGraph);
    const raw = JSON.stringify(campaign);
    const storage = new MemoryStorage([["rogues-dungeon.slot.2", raw]]);
    assert.ok(unresolvedPortalLayoutPaths(campaign).some((path) => path.startsWith(`/${recoveryKey}/`)));
    assert.equal(readSlotSummary(storage)[1].invalid, true);
    assert.throws(() => readSlot(storage, "2"), /explicit resolution/);
    assert.deepEqual(storage.writes, []);
    assert.equal(storage.getItem("rogues-dungeon.slot.2"), raw);
  }
});

test("explicit resolution is pure, complete, per profile, and never inferred from save contents", () => {
  const source = structuredClone(oldGraph);
  source.adventureBaseline = structuredClone(oldGraph);
  source.floorProfiles!["2"] = { ...source.floorProfiles!["1"], seed: 8721 };
  const original = JSON.stringify(source);
  const choices = choose(source, LEGACY_PORTAL_LAYOUT_VERSION);
  const floorPath = "/floorProfiles/2/portalLayoutVersion";
  choices[floorPath] = PORTAL_LAYOUT_VERSION;
  const resolved = resolveCampaignPortalLayouts(source, choices);
  assert.equal(resolved.portalLayoutVersion, LEGACY_PORTAL_LAYOUT_VERSION);
  assert.equal(resolved.floorProfiles!["1"].portalLayoutVersion, LEGACY_PORTAL_LAYOUT_VERSION);
  assert.equal(resolved.floorProfiles!["2"].portalLayoutVersion, PORTAL_LAYOUT_VERSION);
  assert.equal(resolved.adventureBaseline!.portalLayoutVersion, LEGACY_PORTAL_LAYOUT_VERSION);
  assert.deepEqual(unresolvedPortalLayoutPaths(resolved), []);
  assert.equal(JSON.stringify(source), original);
  assert.throws(() => resolveCampaignPortalLayouts(source, {}), /every unresolved layout/);
  assert.throws(() => resolveCampaignPortalLayouts(source, { ...choices, "/invented": PORTAL_LAYOUT_VERSION }), /every unresolved layout/);
  assert.throws(() => resolveCampaignPortalLayouts(source, { ...choices, [floorPath]: "unknown" }), /Unsupported explicit/);
  assert.throws(() => resolveCampaignPortalLayouts(source, { ...choices, "/floorProfiles/1/portalLayoutVersion": PORTAL_LAYOUT_VERSION }), /Mirrored portal profiles/);
  assert.equal(JSON.stringify(source), original);
});

test("known tagged single and paired saves use ordinary storage load and save paths", () => {
  for (const portalLayoutVersion of [LEGACY_PORTAL_LAYOUT_VERSION, PORTAL_LAYOUT_VERSION]) {
    const storage = new MemoryStorage();
    const campaign = createRunCampaign(432, 2, 1, 1, 1, { portalLayoutVersion });
    writeSlot(storage, "2", campaign);
    assert.equal(readSlotSummary(storage)[1].invalid, undefined);
    const restored = readSlot(storage, "2")!;
    assert.equal(restored.portalLayoutVersion, portalLayoutVersion);
    assert.equal(restored.floor.entities.filter((entity) => entity.kind === "teleport-arrow").length, portalLayoutVersion === PORTAL_LAYOUT_VERSION ? 2 : 1);
  }
});

test("unversioned chain records remain unambiguous and available", () => {
  const chain = (JSON.parse(readFileSync(new URL("./fixtures/legacy-generation-fixtures.json", import.meta.url), "utf8")) as { compact: { record: Campaign }[] }).compact[0].record;
  assert.deepEqual(unresolvedPortalLayoutPaths(chain), []);
  const raw = JSON.stringify(chain);
  const storage = new MemoryStorage([["rogues-dungeon.slot.2", raw]]);
  assert.equal(readSlotSummary(storage)[1].invalid, undefined);
  assert.ok(readSlot(storage, "2"));
  assert.equal(storage.getItem("rogues-dungeon.slot.2"), raw);
});

test("diagnostic regeneration forwards the frozen portal version instead of the campaign default", () => {
  for (const portalLayoutVersion of [LEGACY_PORTAL_LAYOUT_VERSION, PORTAL_LAYOUT_VERSION]) {
    const source = createRunCampaign(808, 2, 1, 1, 1, { portalLayoutVersion });
    source.portalLayoutVersion = PORTAL_LAYOUT_VERSION;
    const original = JSON.stringify(source);
    const session = new PerformanceSession();
    session.enter(source);
    const regenerated = session.regenerate(100);
    assert.equal(regenerated.floor.generationProfile!.portalLayoutVersion, portalLayoutVersion);
    assert.equal(regenerated.floor.entities.filter((entity) => entity.kind === "teleport-arrow").length, portalLayoutVersion === PORTAL_LAYOUT_VERSION ? 2 : 1);
    assert.equal(JSON.stringify(source), original);
    session.exit();
  }
});
