import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { Campaign, Floor } from "../src/game/types.ts";
import { applyAction, buildDeathRecovery, compactCampaignForSave, createAdventureLevelBaseline, createRunCampaign, generatedFloorForCampaign, generateFloor, initializeWorldCampaign, LEGACY_PORTAL_LAYOUT_VERSION, PORTAL_LAYOUT_VERSION, prepareJourneyCheckpoint, resolveCampaignPortalLayouts, restoreCompactCampaign, unresolvedPortalLayoutPaths, validateCampaignGeneration } from "../src/systems/procedural/world-procedural-system.ts";
import { DUNGEON_TOPOLOGY_VERSION } from "../src/systems/procedural/dungeon-topology-system.ts";
import { DEFAULT_WORLD_ATTRIBUTES } from "../src/systems/procedural/world-attributes.ts";
import { readPerformanceMetrics, resetPerformanceMetrics, resetPerformanceOptions, setPerformanceOptions } from "../src/systems/rendering/performance-system.ts";
import { worldFloorSeed } from "../src/systems/procedural/world-seed-system.ts";

const arrows = (floor: Floor) => floor.entities.filter((entity) => entity.kind === "teleport-arrow");
const layout = (floor: Floor) => ({ cells: floor.cells, entities: floor.entities, objectSets: floor.objectSets, decorations: floor.decorations });
const reload = (campaign: Campaign) => restoreCompactCampaign(JSON.parse(JSON.stringify(compactCampaignForSave(campaign))) as Campaign);
const knownSingle = (campaign: Campaign) => resolveCampaignPortalLayouts(campaign, Object.fromEntries(unresolvedPortalLayoutPaths(campaign).map((path) => [path, LEGACY_PORTAL_LAYOUT_VERSION])));

test("preserved pre-portal graph fixtures retain original generation and exact compact replay", () => {
  const fixture = JSON.parse(readFileSync(new URL("./fixtures/pre-portal-graph-generation.json", import.meta.url), "utf8")) as {
    sourceSha256: string;
    cases: { input: { name: string; worldSeed: number; slot: number; run: number; difficulty: number; level: number; options: Parameters<typeof createRunCampaign>[5] }; record: Campaign; expected: { geometryHash: string; placementHash: string } }[];
  };
  assert.equal(fixture.sourceSha256, "4ea82465725c2eaa2195f16875539080930501712ace0ad53082437c89d1f62e");
  const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
  const original = hash(fixture);
  // Preserved source 4ea824... restores the LT compact record in a different
  // entity order from its original generated floor. Keep that historical order;
  // do not change the fixture's independently captured pre-save hash.
  const legacyLtCompactPlacementHash = "8d043ce5705edb7f1806d4fc26c0b208720929a6de3339c666b1c63bdf4a3eb1";
  for (const entry of fixture.cases) {
    assert.equal(entry.record.portalLayoutVersion, undefined);
    for (const profile of Object.values(entry.record.floorProfiles ?? {})) assert.equal(profile.portalLayoutVersion, undefined);
    const { worldSeed, slot, run, difficulty, level, options } = entry.input;
    const generated = createRunCampaign(worldSeed, slot, run, difficulty, level, { ...options, portalLayoutVersion: LEGACY_PORTAL_LAYOUT_VERSION });
    assert.throws(() => restoreCompactCampaign(structuredClone(entry.record)), /explicit resolution/);
    const restored = restoreCompactCampaign(knownSingle(entry.record));
    for (const campaign of [generated, restored, reload(restored)]) {
      const { width, height, cells, start, startRoom, entities, objectSets, decorations, prefabPlacements } = campaign.floor;
      assert.equal(hash({ width, height, cells, start, startRoom }), entry.expected.geometryHash, `${entry.input.name} terrain`);
      const expectedPlacement = campaign !== generated && entry.input.name === "graph-lt-single-portal" ? legacyLtCompactPlacementHash : entry.expected.placementHash;
      assert.equal(hash({ entities, objectSets, decorations, prefabPlacements }), expectedPlacement, `${entry.input.name} placements`);
    }
  }
  assert.equal(hash(fixture), original);
});

test("unversioned graph generation retains the original single portal independently of topology", () => {
  const seed = worldFloorSeed(1, 2, 1, 1);
  const original = generateFloor(1, seed, 1, { topologyVersion: DUNGEON_TOPOLOGY_VERSION });
  const explicitLegacy = generateFloor(1, seed, 1, { topologyVersion: DUNGEON_TOPOLOGY_VERSION, portalLayoutVersion: LEGACY_PORTAL_LAYOUT_VERSION });
  assert.deepEqual(layout(original), layout(explicitLegacy));
  assert.deepEqual(arrows(original).map(({ x, y }) => ({ x, y })), [{ x: 79, y: 72 }]);
  assert.equal(original.cells[71][79].walkable, false);
  assert.equal(original.cells[71][80].walkable, false);
});

test("new runs pin paired portals on the campaign, current floor, and subsequent floors", () => {
  const campaign = createRunCampaign(1, 2, 1, 1, 1, { worldAttributes: DEFAULT_WORLD_ATTRIBUTES });
  assert.equal(campaign.portalLayoutVersion, PORTAL_LAYOUT_VERSION);
  assert.equal(campaign.floorProfiles!["1"].portalLayoutVersion, PORTAL_LAYOUT_VERSION);
  assert.equal(campaign.floor.generationProfile!.portalLayoutVersion, PORTAL_LAYOUT_VERSION);
  const next = generatedFloorForCampaign(campaign, 2);
  assert.equal(next.generationProfile!.portalLayoutVersion, PORTAL_LAYOUT_VERSION);
  assert.equal(arrows(next).length, 2);
  campaign.portalLayoutVersion = LEGACY_PORTAL_LAYOUT_VERSION;
  assert.equal(arrows(generatedFloorForCampaign(campaign, 2)).length, 2, "an existing floor profile wins over a later campaign default");
  assert.equal(arrows(generatedFloorForCampaign(campaign, 3)).length, 1);
});

test("a missing saved floor portal version cannot inherit the newer campaign default", () => {
  const campaign = createRunCampaign(613, 2, 1, 1, 1, { worldAttributes: DEFAULT_WORLD_ATTRIBUTES, level1TestMode: true });
  delete campaign.floorProfiles!["1"].portalLayoutVersion;
  campaign.floor = generatedFloorForCampaign(campaign, 1);
  const original = layout(campaign.floor);
  assert.equal(arrows(campaign.floor).length, 1);
  initializeWorldCampaign(campaign);
  assert.equal(campaign.floorProfiles!["1"].portalLayoutVersion, undefined);
  assert.throws(() => reload(campaign), /explicit resolution/);
  const resolved = knownSingle(campaign);
  assert.deepEqual(layout(reload(resolved).floor), original);
  const recovery = createAdventureLevelBaseline(resolved);
  assert.equal(recovery.portalLayoutVersion, LEGACY_PORTAL_LAYOUT_VERSION);
  assert.equal(arrows(recovery.floor).length, 1);
});

test("an old campaign default keeps unvisited floors on its single-portal layout", () => {
  const campaign = createRunCampaign(902, 2, 1);
  delete campaign.portalLayoutVersion;
  delete campaign.floorProfiles!["1"].portalLayoutVersion;
  campaign.floor = generatedFloorForCampaign(campaign, 1);
  const next = generatedFloorForCampaign(campaign, 2);
  assert.equal(next.generationProfile!.portalLayoutVersion, undefined);
  assert.equal(arrows(next).length, 1);
});

test("retry retains the floor portal family while applying current world growth and difficulty", () => {
  for (const portalLayoutVersion of [LEGACY_PORTAL_LAYOUT_VERSION, PORTAL_LAYOUT_VERSION]) {
    const campaign = createRunCampaign(804, 2, 1, 1, 1, { worldAttributes: DEFAULT_WORLD_ATTRIBUTES, portalLayoutVersion });
    campaign.worldAttributes!.guidance = 7;
    campaign.worldAttributes!.plenty = 8;
    campaign.progression.difficulty = 4;
    const retry = createAdventureLevelBaseline(campaign);
    assert.equal(retry.floor.generationProfile!.portalLayoutVersion, portalLayoutVersion);
    assert.equal(retry.floor.generationProfile!.difficulty, 4);
    assert.deepEqual(retry.floor.generationProfile!.attributes, campaign.worldAttributes);
    assert.deepEqual(layout(retry.floor), layout(generateFloor(1, campaign.floor.seed, 4, {
      topologyVersion: campaign.topologyVersion, portalLayoutVersion, worldAttributes: campaign.worldAttributes,
    })));
  }
});

test("old single and new paired portals both survive saves, prefab travel, and recovery", () => {
  for (const portalLayoutVersion of [LEGACY_PORTAL_LAYOUT_VERSION, PORTAL_LAYOUT_VERSION]) {
    const campaign = createRunCampaign(924, 2, 1, 1, 1, { worldAttributes: DEFAULT_WORLD_ATTRIBUTES, portalLayoutVersion });
    const count = portalLayoutVersion === PORTAL_LAYOUT_VERSION ? 2 : 1;
    const original = layout(campaign.floor);
    assert.deepEqual(layout(reload(campaign).floor), original);
    const portal = arrows(campaign.floor).at(-1)!;
    campaign.player.x = portal.x; campaign.player.y = portal.y;
    const entered = applyAction(campaign, { type: "enter-teleport" });
    assert.ok(entered.accepted);
    const home = reload(entered.state);
    const exit = arrows(home.floor)[0];
    home.player.x = exit.x; home.player.y = exit.y;
    const returned = applyAction(home, { type: "enter-teleport" });
    assert.ok(returned.accepted);
    assert.equal(arrows(returned.state.floor).length, count);
    assert.deepEqual(layout(returned.state.floor), original);
    assert.equal(Math.abs(returned.state.player.x - portal.x) + Math.abs(returned.state.player.y - portal.y), 1);

    const retry = createAdventureLevelBaseline(campaign);
    assert.equal(retry.floorProfiles!["1"].portalLayoutVersion, portalLayoutVersion);
    assert.equal(arrows(retry.floor).length, count);
    campaign.adventureBaseline = retry;
    assert.equal(arrows(buildDeathRecovery(campaign)!.floor).length, count);
    campaign.mode = "journey";
    campaign.journeyCheckpoint = prepareJourneyCheckpoint(campaign);
    assert.equal(buildDeathRecovery(campaign)!.portalLayoutVersion, portalLayoutVersion);
  }
});

test("portal versions participate in the existing complete-profile save cache key", () => {
  const campaign = createRunCampaign(0x71820, 2, 1, 1, 1, { worldAttributes: DEFAULT_WORLD_ATTRIBUTES });
  compactCampaignForSave(campaign);
  const oldProfile = structuredClone(campaign);
  oldProfile.floorProfiles!["1"].portalLayoutVersion = LEGACY_PORTAL_LAYOUT_VERSION;
  setPerformanceOptions({ enabled: true }); resetPerformanceMetrics();
  try {
    compactCampaignForSave(oldProfile);
    assert.equal(readPerformanceMetrics().counts["generated baseline floors"], 1);
    compactCampaignForSave(oldProfile);
    assert.equal(readPerformanceMetrics().counts["generated baseline floors"], 1);
  } finally { resetPerformanceOptions(); }
});

test("unknown portal versions fail validation without modifying campaign state", () => {
  const campaign = createRunCampaign(723, 2, 1);
  campaign.floorProfiles!["1"].portalLayoutVersion = "unknown-portal-layout";
  let original = JSON.stringify(campaign);
  assert.throws(() => validateCampaignGeneration(campaign), /Unsupported saved portal layout/);
  assert.throws(() => compactCampaignForSave(campaign), /Unsupported saved portal layout/);
  assert.equal(JSON.stringify(campaign), original);
  campaign.floorProfiles!["1"].portalLayoutVersion = PORTAL_LAYOUT_VERSION;
  campaign.portalLayoutVersion = "unknown-portal-layout";
  original = JSON.stringify(campaign);
  assert.throws(() => generatedFloorForCampaign(campaign, 2), /Unsupported saved portal layout/);
  assert.equal(JSON.stringify(campaign), original);
});
