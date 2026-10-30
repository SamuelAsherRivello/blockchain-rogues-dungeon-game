import assert from "node:assert/strict";
import test from "node:test";
import type { EncounterLockdownSet, Enemy } from "../src/game/types.ts";
import { applyAction, createCampaign, createResourcesModel, generateFloor, isObjectSetBlocked } from "../src/systems/procedural/world-procedural-system.ts";
import { DEFAULT_WORLD_ATTRIBUTES } from "../src/systems/procedural/world-attributes.ts";
import { DUNGEON_TOPOLOGY_VERSION } from "../src/systems/procedural/dungeon-topology-system.ts";
import { hasPerceptionLineOfSight } from "../src/game/enemy-detection.ts";

function enemy(id: string, x: number): Enemy {
  return {
    id, kind: "enemy", name: "Rat", x, y: 1, hp: 1, maxHp: 1, damage: 0, xp: 1,
    resources: createResourcesModel({ health: { current: 1, currentMax: 1 }, offense: { current: 0, currentMax: 0 }, xp: { current: 1, currentMax: 1 } }),
    awareness: 0, actionCooldown: 99, nextActionAt: 999, ai: { state: "idle", targetId: null }, encounterId: "arena",
  };
}

function key({ x, y }: { x: number; y: number }) { return `${x},${y}`; }
function isInRoom(room: EncounterLockdownSet["room"], { x, y }: { x: number; y: number }) { return x >= room.x && x < room.x + room.w && y >= room.y && y < room.y + room.h; }
function lockdownThresholds(floor: ReturnType<typeof generateFloor>, room: EncounterLockdownSet["room"]) {
  const exits: { door: { x: number; y: number }; trigger: { x: number; y: number } }[] = [];
  for (let y = room.y; y < room.y + room.h; y++) for (let x = room.x; x < room.x + room.w; x++) for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
    const trigger = { x, y }, door = { x: x + dx, y: y + dy };
    if (!isInRoom(room, door) && floor.cells[door.y]?.[door.x]?.walkable) exits.push({ door, trigger });
  }
  return exits;
}

test("generated encounter rooms seal every one-tile-wide exit and three enemies from the current level pool", () => {
  for (const seed of [1, 93, 1234]) {
    const floor = generateFloor(2, seed, 2, { topologyVersion: DUNGEON_TOPOLOGY_VERSION });
    const encounter = floor.objectSets?.find((set) => set.kind === "encounter-lockdown");
    assert.ok(encounter);
    const exits = lockdownThresholds(floor, encounter.room);
    assert.ok(encounter.doors.length >= 1 && encounter.doors.length <= 4);
    assert.deepEqual(new Set(encounter.doors.map(key)), new Set(exits.map(({ door }) => key(door))));
    for (const { door, trigger } of exits) {
      const neighbors = [[0, -1], [1, 0], [0, 1], [-1, 0]].map(([dx, dy]) => ({ x: door.x + dx, y: door.y + dy })).filter((cell) => floor.cells[cell.y]?.[cell.x]?.walkable);
      assert.equal(neighbors.length, 2);
      assert.deepEqual(neighbors.filter((cell) => isInRoom(encounter.room, cell)), [trigger]);
    }
    assert.equal(floor.entities.filter((entity) => entity.kind === "enemy" && entity.encounterId === encounter.id).length, 3);
  }
});

test("current-version LT adds exactly one World One level-one lockdown example four cells from the start", () => {
  for (const seed of [1, 93, 1234]) {
    const floor = generateFloor(1, seed, 1, { worldAttributes: DEFAULT_WORLD_ATTRIBUTES, level1TestMode: true, topologyVersion: DUNGEON_TOPOLOGY_VERSION });
    const fixtures = floor.objectSets?.filter((set): set is EncounterLockdownSet => set.kind === "encounter-lockdown" && set.id === "encounter-lockdown-fixture-level-1") ?? [];
    assert.equal(fixtures.length, 1);
    const fixture = fixtures[0]!;
    assert.ok(fixture.doors.every((door) => Math.hypot(door.x - floor.start.x, door.y - floor.start.y) <= 4));
    const exits = lockdownThresholds(floor, fixture.room);
    assert.deepEqual(new Set(fixture.doors.map(key)), new Set(exits.map(({ door }) => key(door))));
    for (const { door, trigger } of exits) {
      const neighbors = [[0, -1], [1, 0], [0, 1], [-1, 0]].map(([dx, dy]) => ({ x: door.x + dx, y: door.y + dy })).filter((cell) => floor.cells[cell.y]?.[cell.x]?.walkable);
      assert.equal(neighbors.length, 2);
      assert.deepEqual(neighbors.filter((cell) => isInRoom(fixture.room, cell)), [trigger]);
    }
    assert.equal(floor.entities.filter((entity) => entity.kind === "enemy" && entity.encounterId === fixture.id).length, 3);
  }

  const legacyWorldFloor = generateFloor(1, 93, 1, { worldAttributes: DEFAULT_WORLD_ATTRIBUTES, level1TestMode: true });
  const legacyFixture = legacyWorldFloor.objectSets?.find((set): set is EncounterLockdownSet => set.kind === "encounter-lockdown" && set.id === "encounter-lockdown-fixture-level-1");
  assert.ok(legacyFixture);
  assert.ok(legacyFixture.doors.every((door) => Math.hypot(door.x - legacyWorldFloor.start.x, door.y - legacyWorldFloor.start.y) <= 100));

  const nonWorldFloor = generateFloor(1, 93, 1, { level1TestMode: true });
  assert.equal(nonWorldFloor.objectSets?.some((set) => set.kind === "encounter-lockdown" && set.id === "encounter-lockdown-fixture-level-1"), false);
});

test("crossing an encounter trigger locks every doorway until the final enemy is removed", () => {
  const campaign = createCampaign(91);
  campaign.floor.width = 6; campaign.floor.height = 3; campaign.floor.map = undefined; campaign.floor.time = 1;
  campaign.floor.cells = Array.from({ length: 3 }, () => Array.from({ length: 6 }, () => ({ walkable: true, role: "floor" })));
  campaign.floor.decorations = [];
  campaign.player.x = 0; campaign.player.y = 1;
  campaign.floor.entities = [enemy("arena-1", 3), enemy("arena-2", 4), enemy("arena-3", 5)];
  campaign.floor.objectSets = [{
    id: "arena", kind: "encounter-lockdown", barrel: { x: 1, y: 1, hasMass: false }, trigger: { x: 2, y: 1 }, door: { x: 1, y: 1 }, regionRole: "optional-reward",
    doors: [{ x: 1, y: 1 }], triggers: [{ x: 2, y: 1 }], room: { x: 1, y: 0, w: 5, h: 3 }, enemyIds: ["arena-1", "arena-2", "arena-3"], activated: false, completed: false,
  }];
  const throughDoor = applyAction(campaign, { type: "move", direction: "e" });
  const locked = applyAction(throughDoor.state, { type: "move", direction: "e" });
  const encounter = locked.state.floor.objectSets![0]!;
  assert.equal(encounter.kind, "encounter-lockdown");
  assert.equal(encounter.activated, true);
  assert.equal(isObjectSetBlocked(locked.state.floor, locked.state.player, 1, 1), true);
  assert.ok(locked.events.some((event) => event.type === "encounter.locked"));
  locked.state.floor.entities = [];
  const cleared = applyAction(locked.state, { type: "wait" });
  const clearedEncounter = cleared.state.floor.objectSets![0]!;
  assert.equal(clearedEncounter.kind, "encounter-lockdown");
  assert.equal(clearedEncounter.completed, true);
  assert.equal(isObjectSetBlocked(cleared.state.floor, cleared.state.player, 1, 1), false);
  assert.ok(cleared.events.some((event) => event.type === "encounter.cleared"));
});

test("a locked encounter door blocks enemy movement and awareness in both directions", () => {
  const campaign = createCampaign(92);
  campaign.floor.width = 5; campaign.floor.height = 3; campaign.floor.map = undefined; campaign.floor.time = 1;
  campaign.floor.cells = Array.from({ length: 3 }, (_row, y) => Array.from({ length: 5 }, () => ({ walkable: y === 1, role: y === 1 ? "floor" : "wall" })));
  campaign.floor.decorations = [];
  campaign.player.x = 2; campaign.player.y = 1;
  const guard = enemy("arena-guard", 0); guard.awareness = 10; guard.actionCooldown = 0; guard.nextActionAt = 0;
  campaign.floor.entities = [guard];
  campaign.floor.objectSets = [{
    id: "arena", kind: "encounter-lockdown", barrel: { x: 1, y: 1, hasMass: false }, trigger: { x: 2, y: 1 }, door: { x: 1, y: 1 }, regionRole: "optional-reward",
    doors: [{ x: 1, y: 1 }], triggers: [{ x: 2, y: 1 }], room: { x: 2, y: 1, w: 1, h: 1 }, enemyIds: [guard.id], activated: true, completed: false,
  }];
  assert.equal(isObjectSetBlocked(campaign.floor, campaign.player, 1, 1), true);
  assert.equal(hasPerceptionLineOfSight(campaign, guard, campaign.player), false);
  const result = applyAction(campaign, { type: "wait" });
  const after = result.state.floor.entities.find((entity): entity is Enemy => entity.kind === "enemy")!;
  assert.deepEqual({ x: after.x, y: after.y, state: after.ai.state }, { x: 0, y: 1, state: "idle" });
  assert.equal(result.events.some((event) => event.type === "combat.hit"), false);
});
