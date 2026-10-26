import assert from "node:assert/strict";
import test from "node:test";
import { applyAction, buildDeathRecovery, createAdventureLevelBaseline, createCampaign, createGameSession, createRunCampaign, discoveredCoverage, isCellDiscovered, prepareJourneyCheckpoint, REST_GOLD_COST, revealDiscovery } from "../src/systems/procedural/world-procedural-system.ts";
import { migrateCampaign, readSlot, writeSlot } from "../src/systems/persistence/save-system.ts";
import { WorldRender } from "../src/systems/rendering/world-render-system.ts";
import { selectDeathRecapLines } from "../src/game/log-policy.ts";

class MemoryStorage {
  private readonly values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

test("migrates a valid version-five campaign to Adventure without losing its live level", () => {
  const legacy = structuredClone(createCampaign(4, 3, 3));
  legacy.version = 5;
  delete legacy.mode;
  delete legacy.adventureBaseline;
  const migrated = migrateCampaign(legacy);
  assert.equal(migrated.version, 6);
  assert.equal(migrated.mode, "adventure");
  assert.equal(migrated.floor.level, 3);
  assert.ok(migrated.adventureBaseline);
});

test("save normalization keeps a valid Adventure baseline and drops malformed recovery snapshots", () => {
  const campaign = createCampaign(7);
  campaign.adventureBaseline = "not a campaign" as unknown as typeof campaign;
  campaign.journeyCheckpoint = 4 as unknown as typeof campaign;
  const storage = new MemoryStorage();
  writeSlot(storage, "1", campaign);
  const restored = readSlot(storage, "1");
  assert.equal(restored?.mode, "adventure");
  assert.ok(restored?.adventureBaseline);
  assert.equal(restored?.journeyCheckpoint, undefined);
});

test("a selected campaign mode persists with its new save slot", () => {
  const storage = new MemoryStorage();
  for (const [slot, mode] of (["classic", "adventure", "journey"] as const).entries()) {
    const id = String(slot + 1);
    const campaign = createRunCampaign(18, slot + 1, 1, 1, 1, { mode });
    writeSlot(storage, id, campaign);
    assert.equal(readSlot(storage, id)?.mode, mode);
  }
});

test("slot migration saves raw legacy bytes before replacing them with Adventure", () => {
  const legacy = structuredClone(createCampaign(11));
  legacy.version = 5;
  delete legacy.mode;
  const storage = new MemoryStorage();
  const raw = JSON.stringify(legacy);
  storage.setItem("rogues-dungeon.slot.1", raw);
  assert.equal(readSlot(storage, "1")?.mode, "adventure");
  assert.equal(storage.getItem("rogues-dungeon.slot.v1-backup.1"), raw);
});

test("Adventure recovery keeps character growth and resets the current level run", () => {
  const campaign = createRunCampaign(31, 1, 1, 3, 3, { mode: "adventure" });
  campaign.progression.level = 4;
  campaign.progression.xp = 42;
  campaign.progression.attributePoints = 2;
  campaign.player.inventory = [{ id: "sword", name: "Sword", group: "weapons", modifiers: { offense: 3 } }];
  campaign.player.equipment.weapons[0] = campaign.player.inventory[0]!;
  campaign.counters.gold = 9;
  campaign.floor.time = 22;
  campaign.discovery = { "3": "11110000" };
  campaign.adventureBaseline = createAdventureLevelBaseline(campaign);
  const recovered = buildDeathRecovery(campaign)!;
  assert.equal(recovered.floor.level, 3);
  assert.equal(recovered.progression.level, 4);
  assert.equal(recovered.progression.xp, 42);
  assert.equal(recovered.progression.attributePoints, 2);
  assert.deepEqual(recovered.player.inventory, []);
  assert.deepEqual(recovered.player.equipment.weapons, [null, null]);
  assert.equal(recovered.floor.time, 0);
  assert.equal(isCellDiscovered(recovered, recovered.player), true);
  assert.ok(discoveredCoverage(recovered) < 5);
  assert.equal(recovered.counters.gold, 0);
});

test("Adventure restart follows stair travel, including a return to an earlier level", () => {
  let campaign = createRunCampaign(32, 1, 1, 1, 1, { mode: "adventure" });
  campaign.adventureBaseline = createAdventureLevelBaseline(campaign);
  for (const [direction, level] of [["forward", 2], ["forward", 3], ["back", 2]] as const) {
    const stairs = campaign.floor.entities.find((entity) => entity.kind === "stairs" && (direction === "back" ? entity.direction === "back" : entity.direction !== "back"));
    assert.ok(stairs);
    campaign.player.x = stairs.x; campaign.player.y = stairs.y;
    const arrival = applyAction(campaign, { type: "enter-stairs" });
    assert.equal(arrival.accepted, true);
    campaign = arrival.state;
    assert.equal(campaign.adventureBaseline?.floor.level, level);
    campaign.floor.time = 10;
    campaign.player.resources.health.current = 0;
    const result = createGameSession(campaign).dispatch({ type: "trap-strike", hazardElapsedMs: 0 });
    assert.ok(result && !("queued" in result));
    assert.equal(result.recovery?.floor.level, level);
    assert.equal(result.recovery?.realm, `Underground ${level}`);
    assert.equal(result.recovery?.floor.seed, campaign.floor.seed);
    assert.deepEqual(result.recovery?.progression, campaign.progression);
    assert.ok(result.recovery!.player.resources.health.current > 0);
    campaign = result.recovery!;
  }
});

test("Adventure repairs a stale earlier-level recovery snapshot on load and at death", () => {
  const campaign = createRunCampaign(33, 1, 1, 3, 3, { mode: "adventure" });
  campaign.adventureBaseline = createAdventureLevelBaseline(createRunCampaign(33, 1, 1));
  assert.equal(buildDeathRecovery(campaign)?.floor.level, 3);
  const storage = new MemoryStorage();
  writeSlot(storage, "1", campaign);
  const restored = readSlot(storage, "1")!;
  assert.equal(restored.floor.level, 3);
  assert.equal(restored.adventureBaseline?.floor.level, 3);
  assert.equal(buildDeathRecovery(restored)?.floor.level, 3);
});

test("Journey restores the latest checkpoint and Classic has no recovery", () => {
  const journey = createRunCampaign(41, 1, 1, 2, 2, { mode: "journey" });
  journey.player.x += 1;
  journey.counters.gold = 5;
  journey.discovery = { "2": "111" };
  journey.journeyCheckpoint = prepareJourneyCheckpoint(journey);
  journey.player.x += 3;
  journey.counters.gold = 0;
  const restored = buildDeathRecovery(journey)!;
  assert.equal(restored.player.x, journey.journeyCheckpoint.player.x);
  assert.equal(restored.counters.gold, 5);
  assert.deepEqual(restored.discovery, { "2": "111" });
  assert.equal(buildDeathRecovery({ ...createCampaign(9), mode: "classic" }), null);
});

test("a fatal commit retains the fatal state while persisting prepared recovery", () => {
  const storage = new MemoryStorage();
  const campaign = createRunCampaign(51, 1, 1, 2, 2, { mode: "adventure" });
  campaign.player.resources.health.current = 0;
  const session = createGameSession(campaign, { onCommit: (result) => {
    if (result.recovery) writeSlot(storage, "1", result.recovery);
  } });
  const result = session.dispatch({ type: "wait" });
  assert.ok(result && !("queued" in result));
  assert.equal(result.state.player.resources.health.current, 0);
  assert.ok(result.recovery);
  assert.equal(session.getState().player.resources.health.current, 0);
  assert.ok((readSlot(storage, "1")?.player.resources.health.current ?? 0) > 0);
});

test("a Classic fatal commit prepares no resumable recovery", () => {
  const campaign = createCampaign(52);
  campaign.mode = "classic";
  campaign.player.resources.health.current = 0;
  const result = createGameSession(campaign).dispatch({ type: "wait" });
  assert.ok(result && !("queued" in result));
  assert.equal(result.recovery, null);
});

test("discovery reveals a compact persistent local area and Adventure recovery clears it", () => {
  const campaign = createRunCampaign(61, 1, 1, 1, 1, { mode: "adventure" });
  const startCoverage = discoveredCoverage(campaign);
  revealDiscovery(campaign, { x: campaign.player.x + 10, y: campaign.player.y + 10 }, 10);
  assert.ok(discoveredCoverage(campaign) > startCoverage);
  assert.equal(isCellDiscovered(campaign, { x: campaign.player.x + 10, y: campaign.player.y + 10 }), true);
  const storage = new MemoryStorage();
  writeSlot(storage, "1", campaign);
  assert.equal(discoveredCoverage(readSlot(storage, "1")!), discoveredCoverage(campaign));
  campaign.adventureBaseline = createAdventureLevelBaseline(campaign);
  const recovered = buildDeathRecovery(campaign)!;
  assert.ok(discoveredCoverage(recovered) <= startCoverage);
});

test("only Journey commits a checkpoint after a paid rest or stair arrival", () => {
  const journey = createCampaign(71);
  journey.mode = "journey";
  journey.counters.gold = REST_GOLD_COST;
  const rested = applyAction(journey, { type: "rest" });
  assert.equal(rested.accepted, true);
  assert.ok(rested.state.journeyCheckpoint);
  const checkpoint = rested.state.journeyCheckpoint!;
  const stairs = rested.state.floor.entities.find((entity) => entity.kind === "stairs" && entity.direction !== "back")!;
  rested.state.player.x = stairs.x; rested.state.player.y = stairs.y;
  const descended = applyAction(rested.state, { type: "enter-stairs" });
  assert.equal(descended.accepted, true);
  assert.ok(descended.state.journeyCheckpoint);
  assert.notDeepEqual(descended.state.journeyCheckpoint, checkpoint);
  const adventure = createCampaign(72);
  adventure.mode = "adventure";
  adventure.counters.gold = REST_GOLD_COST;
  const adventureRest = applyAction(adventure, { type: "rest" });
  assert.equal(adventureRest.accepted, true);
  assert.equal(adventureRest.state.journeyCheckpoint, undefined);
  const unfunded = createCampaign(73);
  unfunded.mode = "journey";
  const rejected = applyAction(unfunded, { type: "rest" });
  assert.equal(rejected.accepted, false);
  assert.equal(rejected.state.journeyCheckpoint, undefined);
});

test("world projections retain geometry while discovery hides semantic objects and enemies", () => {
  const campaign = createCampaign(81);
  const hiddenEnemy = campaign.floor.entities.find((entity) => entity.kind === "enemy");
  assert.ok(hiddenEnemy);
  const visible = campaign.player;
  const model = WorldRender.Render({
    cells: campaign.floor.cells,
    entities: campaign.floor.entities,
    decorations: campaign.floor.decorations,
    objectSets: campaign.floor.objectSets,
    player: campaign.player,
    isDiscovered: (position) => position.x === visible.x && position.y === visible.y,
  });
  assert.equal(model.actors.some((actor) => actor.id === hiddenEnemy.id), false);
  assert.ok(model.terrain.length > 1, "the renderer masks retained terrain separately");
  assert.equal(model.objects.every((cell) => cell.x === visible.x && cell.y === visible.y), true);
});

test("death recap lines preserve only ordered combat outcomes and the fatal pair", () => {
  const lines = selectDeathRecapLines([
    { type: "player.moved", facts: {} },
    { type: "combat.hit", facts: { target: "Rat", targetId: "rat", sourceName: "You", damage: 2 } },
    { type: "combat.hit", facts: { target: "Player", targetId: "player", source: "rat", sourceName: "Rat", damage: 5 } },
    { type: "enemy.defeated", facts: { name: "Skeleton Warrior" } },
    { type: "combat.hit", facts: { target: "Player", targetId: "player", source: "skeleton", sourceName: "Skeleton Warrior", damage: 10 } },
    { type: "player.died", facts: { source: "skeleton", sourceName: "Skeleton Warrior" } },
  ]);
  assert.deepEqual(lines, ["You hit Rat for 2.", "Rat hits you for 5.", "You defeat Skeleton Warrior.", "Skeleton Warrior hits you for 10.", "Skeleton Warrior defeats you.", "You died."]);
});
