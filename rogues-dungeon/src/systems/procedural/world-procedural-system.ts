import { copyCampaignMutableState } from "./campaign-copy-system.ts";
import { applyStorageExclusions, consumeItemProvenance, mergeItemProvenance } from "./item-provenance-system.ts";
import { normalizeDiscovery, revealDiscovery } from "./map-discovery-system.ts";
export { revealDiscovery, isCellDiscovered, discoveredCoverage } from "./map-discovery-system.ts";
import { hasPerceptionLineOfSight } from "../../game/enemy-detection.ts";
import { planStartRoomDecoration } from "../../content/world/start-wall-autotile.ts";
import { RESOURCE_WILL_REPLENISH, type AbilityId, type Action, type ActionResult, type Attributes, type AttributeName, type Campaign, type ConsumableResource, type Direction, type EncounterLockdownSet, type Enemy, type Entity, type Equipment, type EquipmentGroup, type EventFacts, type Floor, type FloorTriggerDoorBarrelSet, type GameEvent, type Item, type LevelStateDelta, type MassBearingPosition, type ObjectSet, type ObjectSetRegionRole, type Position, type QuickSlot, type Resource, type ResourceInput, type ResourceName, type Resources, type Room, type WorldDecoration } from "../../game/types.ts";
import { createLevelContext, ensureSemanticCells, isWalkable, markRuntimeGridValid, runLevelPasses, setCell } from "./level-grid-system.ts";
import { HERO_HOUSE_PREFAB, PLAYER_HOME_PREFAB, PLAYER_HOME_LOCKBOXES, prefabPortalEntrances, stampPrefab, type PrefabPlacement } from "./prefab-system.ts";
import { isWallDecorationCell, TRAP_FRAME_DURATION_MS, trapFrameAt, trapIsDangerous, trapStrikeDamage } from "./world-hazards-system.ts";
import { worldFloorSeed } from "./world-seed-system.ts";
import { planEnemyActions } from "../../game/enemy-ai-system.ts";
import { cellCenter, centerCrossings, normalizePlayerPosition, occupiedCell } from "../../game/player-position.ts";
import type { WorldAttributes, FloorGenerationProfile } from '../../game/types.ts';
import { DEFAULT_WORLD_ATTRIBUTES, normalizeWorldAttributes, WORLD_RULES_VERSION, worldRandom, worldTuning, growWorld } from './world-attributes.ts';
import { WORLD_BALANCE_VERSION, eligibleWorldItemNames, selectWorldItemName, worldBalanceProfile } from './world-balance.ts';
import { enemyDefinitionForName, enemyDefinitionsForWorldLevel, type EnemyDefinition } from '../../content/enemies/enemy-catalog.ts';
import { enemyCharacterForName } from '../../content/enemies/enemy-idle-animation.ts';
import { JEWEL_NAMES, jewelItemDefinitions } from '../../content/items/jewel-catalog.ts';

import { countPerformance, measurePerformance } from "../rendering/performance-system.ts";
import { generateDungeonGraphLayout } from "./dungeon-graph-layout-system.ts";
import { DUNGEON_TOPOLOGY_VERSION, corridorOffsets, dungeonGraphRoute } from "./dungeon-topology-system.ts";
import { repairDungeonRoutes, validateDungeonQuality, type DungeonQualityResult } from "./dungeon-quality-system.ts";
import { generateOverworld } from "./overworld-generation-system.ts";
export const LEGACY_DUNGEON_TOPOLOGY_VERSION = "dungeon-chain-1";
export const LEGACY_PORTAL_LAYOUT_VERSION = "prefab-portal-single-1";
export const PORTAL_LAYOUT_VERSION = "prefab-portal-paired-1";
function validateTopologyVersion(version: string | undefined) {
  if (version !== undefined && version !== LEGACY_DUNGEON_TOPOLOGY_VERSION && version !== DUNGEON_TOPOLOGY_VERSION) throw new Error("Unsupported saved dungeon topology. Saved data was left unchanged.");
}
function validatePortalLayoutVersion(version: string | undefined) {
  if (version !== undefined && version !== LEGACY_PORTAL_LAYOUT_VERSION && version !== PORTAL_LAYOUT_VERSION) throw new Error("Unsupported saved portal layout. Saved data was left unchanged.");
}

function unresolvedPortalLayoutTargets(campaign: Campaign) {
  const targets: { owner: { portalLayoutVersion?: string }; path: string }[] = [];
  const visited = new Set<Campaign>();
  const profile = (value: FloorGenerationProfile | undefined, path: string) => {
    if (value?.topologyVersion === DUNGEON_TOPOLOGY_VERSION && value.portalLayoutVersion === undefined) targets.push({ owner: value, path: `${path}/portalLayoutVersion` });
  };
  const visit = (state: Campaign | undefined, path: string) => {
    if (!state || typeof state !== "object" || visited.has(state)) return;
    visited.add(state);
    if (state.topologyVersion === DUNGEON_TOPOLOGY_VERSION && state.portalLayoutVersion === undefined) targets.push({ owner: state, path: `${path}/portalLayoutVersion` });
    profile(state.floor?.generationProfile, `${path}/floor/generationProfile`);
    for (const [level, value] of Object.entries(state.floorProfiles ?? {})) profile(value, `${path}/floorProfiles/${level}`);
    for (const [level, floor] of Object.entries(state.floors ?? {})) profile(floor?.generationProfile, `${path}/floors/${level}/generationProfile`);
    visit(state.adventureBaseline, `${path}/adventureBaseline`);
    visit(state.journeyCheckpoint, `${path}/journeyCheckpoint`);
  };
  visit(campaign, "");
  return targets;
}

/** Missing graph versions can describe either pre-portal or transient paired saves. */
export function unresolvedPortalLayoutPaths(campaign: Campaign): string[] {
  return unresolvedPortalLayoutTargets(campaign).map(({ path }) => path);
}

export function assertCampaignPortalLayoutsResolved(campaign: Campaign) {
  if (unresolvedPortalLayoutPaths(campaign).length) throw new Error("This saved game's portal layout needs an explicit resolution. Its data was left unchanged.");
}

/** Pure, explicit metadata resolution. Callers retain the original record and decide each family. */
export function resolveCampaignPortalLayouts(campaign: Campaign, resolution: Readonly<Record<string, string>>): Campaign {
  const paths = unresolvedPortalLayoutPaths(campaign);
  if (paths.some((path) => !Object.hasOwn(resolution, path)) || Object.keys(resolution).some((path) => !paths.includes(path))) throw new Error("Portal resolution must name every unresolved layout exactly.");
  for (const version of Object.values(resolution)) {
    if (version !== LEGACY_PORTAL_LAYOUT_VERSION && version !== PORTAL_LAYOUT_VERSION) throw new Error("Unsupported explicit portal resolution.");
  }
  const copy = structuredClone(campaign);
  const assigned = new Map<object, string>();
  for (const { owner, path } of unresolvedPortalLayoutTargets(copy)) {
    const version = resolution[path];
    if (assigned.has(owner) && assigned.get(owner) !== version) throw new Error("Aliased portal profiles need the same explicit resolution.");
    assigned.set(owner, version);
    owner.portalLayoutVersion = version;
  }
  const validated = new Set<Campaign>();
  const validate = (state: Campaign | undefined) => {
    if (!state || typeof state !== "object" || validated.has(state)) return;
    validated.add(state);
    validateCampaignGeneration(state);
    const active = state.floor?.generationProfile;
    const frozen = state.floorProfiles?.[String(state.floor?.level ?? state.floor?.depth ?? 1)];
    if (active?.topologyVersion === DUNGEON_TOPOLOGY_VERSION && frozen?.topologyVersion === DUNGEON_TOPOLOGY_VERSION
      && active.seed === frozen.seed && active.portalLayoutVersion !== frozen.portalLayoutVersion) throw new Error("Mirrored portal profiles need the same explicit resolution.");
    validate(state.adventureBaseline);
    validate(state.journeyCheckpoint);
  };
  validate(copy);
  assertCampaignPortalLayoutsResolved(copy);
  return copy;
}
export const FLOOR_WIDTH = 100;
export const FLOOR_HEIGHT = 100;
export const FLOOR_CENTER = Object.freeze({ x: Math.floor(FLOOR_WIDTH / 2), y: Math.floor(FLOOR_HEIGHT / 2) });
export const GENERATOR_VERSION = "rogues-dungeon-floor-v4";
const WORLD_GENERATION_TUNING_VERSION = `${WORLD_RULES_VERSION}:${WORLD_BALANCE_VERSION}`;
const ITEM_CAPACITY = 5;
export const VISIBLE_LANDSCAPE_SCREEN = Object.freeze({ width: 30, height: 17 });
export const PICKUP_DENSITY_DEFAULTS = Object.freeze({
  key: Object.freeze({ min: 0.5, max: 1 }),
  mana: Object.freeze({ min: 0.75, max: 1.5 }),
  stamina: Object.freeze({ min: 0.75, max: 1.5 }),
  health: Object.freeze({ min: 1, max: 1.75 }),
  gold: Object.freeze({ min: 1.25, max: 2 }),
});
export const GAME_TUNING = Object.freeze({
  startingHealth: 3, startingStamina: 3, startingMana: 3, innateDefense: 1,
  attackStaminaCost: 4, moveStaminaRecovery: 2, readinessFloor: 0.75,
  healthPotionRestore: 10, staminaPotionRestore: 8, manaPotionRestore: 8,
  xpPerAttack: 5, xpPerKillBase: 10, xpPerContainer: 10, xpPerDiscovery: 5, xpPerFloor: 20, xpThreshold: 100,
  enemyAwareness: 6, enemyActionCooldown: 2, sneakingAwarenessReduction: 3,
  recoveryMoveBonus: 1,
  luckTierRanks: 2,
});
export const REST_GOLD_COST = 20;
export const EXTRA_SPACE_CAPACITY_BONUS = 6;
export const EXTRA_SPACE_NET_CAPACITY = 5;
const EXTRA_SPACE_ITEM = Object.freeze({ name: "Extra Carrying Capacity +5", group: "weapons" as const, modifiers: {}, category: "capacity" as const, capacityBonus: EXTRA_SPACE_CAPACITY_BONUS, isStackable: false });
export const STAIRS_MAX_DISTANCE_FROM_START = 10;
export const ENEMY_RANKS = Object.freeze(enemyDefinitionsForWorldLevel(99));

const objectSetRoles: readonly ObjectSetRegionRole[] = ["optional-reward", "exit"];

function samePosition(left: Position, right: Position) { return left.x === right.x && left.y === right.y; }
function validPosition(value: unknown): value is Position { return typeof value === "object" && value !== null && Number.isInteger((value as Position).x) && Number.isInteger((value as Position).y); }
function validStartRoom(floor: Floor, room: Room) {
  return Number.isInteger(room.x) && Number.isInteger(room.y) && room.w === 7 && room.h === 7
    && room.x >= 0 && room.y >= 0 && room.x + room.w <= floor.width && room.y + room.h <= floor.height
    && Array.from({ length: room.h }, (_, y) => Array.from({ length: room.w }, (_, x) => floor.cells[room.y + y]?.[room.x + x]?.walkable === true).every(Boolean)).every(Boolean);
}
/** Restores only the known generated-room metadata; it never changes saved geometry. */
export function normalizeStartRoomMetadata(floor: Floor) {
  ensureSemanticCells(floor);
  if (floor.startRoom && validStartRoom(floor, floor.startRoom)) return floor;
  const room = { x: floor.start.x - 3, y: floor.start.y - 3, w: 7, h: 7 };
  if (validStartRoom(floor, room)) floor.startRoom = room;
  else delete floor.startRoom;
  return floor;
}
export function normalizeObjectSets(floor: Floor) {
  const raw = Array.isArray(floor.objectSets) ? floor.objectSets : [];
  floor.objectSets = raw.flatMap((set): ObjectSet[] => {
    if (set?.kind === "floor-trigger-door-barrel" && typeof set.id === "string" && validPosition(set.barrel) && validPosition(set.trigger) && validPosition(set.door) && objectSetRoles.includes(set.regionRole)) {
      return [{ ...set, barrel: { ...set.barrel, hasMass: set.barrel.hasMass !== false }, barrelStart: validPosition(set.barrelStart) ? { ...set.barrelStart } : { ...set.barrel }, barrelReturnUsed: Boolean(set.barrelReturnUsed), trigger: { ...set.trigger }, door: { ...set.door } }];
    }
    if (set?.kind === "encounter-lockdown" && typeof set.id === "string" && Array.isArray(set.doors) && set.doors.length > 0 && set.doors.every(validPosition) && Array.isArray(set.triggers) && set.triggers.length > 0 && set.triggers.every(validPosition) && Array.isArray(set.enemyIds) && set.enemyIds.every((id) => typeof id === "string") && set.room && validPosition(set.room) && Number.isInteger(set.room.w) && Number.isInteger(set.room.h)) {
      return [{ ...set, barrel: validPosition(set.barrel) ? { ...set.barrel, hasMass: false } : { ...set.doors[0], hasMass: false }, trigger: validPosition(set.trigger) ? { ...set.trigger } : { ...set.triggers[0] }, door: validPosition(set.door) ? { ...set.door } : { ...set.doors[0] }, regionRole: objectSetRoles.includes(set.regionRole) ? set.regionRole : "optional-reward", doors: set.doors.map((door) => ({ ...door })), triggers: set.triggers.map((trigger) => ({ ...trigger })), enemyIds: [...set.enemyIds], room: { ...set.room }, activated: Boolean(set.activated), completed: Boolean(set.completed) }];
    }
    return [];
  });
  return floor;
}
export function keyedDoorCountForFloor(floor: Floor) { return floorTriggerDoorSets(floor).filter((set) => set.requiresKey === true).length; }
function hasMassAt(position: Position, object: MassBearingPosition, defaultHasMass = false) { return (object.hasMass ?? defaultHasMass) === true && samePosition(position, object); }
export function isObjectSetDoorOpen(set: Pick<FloorTriggerDoorBarrelSet, "barrel" | "trigger" | "door">, player: MassBearingPosition, entities: Entity[] = []) {
  return hasMassAt(set.trigger, player) || hasMassAt(set.trigger, set.barrel, true) || entities.some((entity) => hasMassAt(set.trigger, entity));
}
function emitFloorTriggerChanges(events: GameEvent[], previous: Campaign, current: Campaign) {
  const previousSets = new Map(floorTriggerDoorSets(previous.floor).map((set) => [set.id, set]));
  for (const set of floorTriggerDoorSets(current.floor)) {
    const previousSet = previousSets.get(set.id);
    if (!previousSet) continue;
    const wasActive = isObjectSetDoorOpen(previousSet, previous.player, previous.floor.entities);
    const active = isObjectSetDoorOpen(set, current.player, current.floor.entities);
    if (active !== wasActive) emit(events, "floor-trigger.changed", { id: set.id, active }, current);
  }
}
function updateEncounterLockdowns(state: Campaign, events: GameEvent[]) {
  for (const set of encounterLockdownSets(state.floor)) {
    if (!set.activated && set.triggers.some((trigger) => samePosition(trigger, state.player))) {
      set.activated = true;
      emit(events, "encounter.locked", { id: set.id, position: { x: state.player.x, y: state.player.y } }, state);
    }
    const stillHasEncounterEnemy = state.floor.entities.some((entity) => entity.kind === "enemy" && (entity.encounterId === set.id || set.enemyIds.includes(entity.id)));
    if (set.activated && !set.completed && !stillHasEncounterEnemy) {
      set.completed = true;
      emit(events, "encounter.cleared", { id: set.id }, state);
    }
  }
}
export function floorTriggerDoorSets(floor: Floor) { return (floor.objectSets ?? []).filter((set): set is FloorTriggerDoorBarrelSet => set.kind === "floor-trigger-door-barrel"); }
export function encounterLockdownSets(floor: Floor) { return (floor.objectSets ?? []).filter((set): set is EncounterLockdownSet => set.kind === "encounter-lockdown"); }
export function isEncounterLockdownDoorOpen(set: EncounterLockdownSet) { return !set.activated || set.completed; }
function barrelSetAt(floor: Floor, x: number, y: number) { return floorTriggerDoorSets(floor).find((set) => set.barrel.x === x && set.barrel.y === y); }
export function isBarrelAdjacentToWall(floor: Parameters<typeof isWalkable>[0], barrel: Position) { return [[0, -1], [1, 0], [0, 1], [-1, 0]].some(([dx, dy]) => !isWalkable(floor, barrel.x + dx, barrel.y + dy)); }
export function isBlockingPathCell(floor: Parameters<typeof isWalkable>[0], cell: Position) {
  return [[0, -1], [1, 0], [0, 1], [-1, 0]].filter(([dx, dy]) => isWalkable(floor, cell.x + dx, cell.y + dy)).length === 2;
}
export function isStairPlacementCell(floor: Parameters<typeof isWalkable>[0], position: Position) {
  return isWalkable(floor, position.x, position.y)
    && [[0, -1], [1, 0], [0, 1], [-1, 0]].every(([dx, dy]) => isWalkable(floor, position.x + dx, position.y + dy));
}

interface EncounterEntrance { door: Position; trigger: Position }
interface EncounterLayout { room: Room; entrances: EncounterEntrance[] }
interface EncounterLayoutOptions { minimumDistance?: number; maximumDistance?: number; excludedRooms?: readonly Room[] }
const CARDINAL_OFFSETS = [[0, -1], [1, 0], [0, 1], [-1, 0]] as const;
function isWalkableMapCell(map: number[][], position: Position) { return map[position.y]?.[position.x] === 0; }
function roomContains(room: Room, position: Position) { return position.x >= room.x && position.x < room.x + room.w && position.y >= room.y && position.y < room.y + room.h; }
function cardinalMapNeighbors(map: number[][], position: Position) { return CARDINAL_OFFSETS.map(([dx, dy]) => ({ x: position.x + dx, y: position.y + dy })).filter((neighbor) => isWalkableMapCell(map, neighbor)); }
/**
 * A lockdown room is sealed only at corridor throats. Every departure from the
 * room must cross a distinct one-cell-wide tile, which becomes its door. This
 * rejects broad room openings even when one edge cell happens to be walkable.
 */
function encounterEntrances(map: number[][], room: Room) {
  const crossings: EncounterEntrance[] = [];
  for (let y = room.y; y < room.y + room.h; y++) for (let x = room.x; x < room.x + room.w; x++) {
    const trigger = { x, y };
    for (const [dx, dy] of CARDINAL_OFFSETS) {
      const door = { x: x + dx, y: y + dy };
      if (roomContains(room, door) || !isWalkableMapCell(map, trigger) || !isWalkableMapCell(map, door)) continue;
      const doorNeighbors = cardinalMapNeighbors(map, door);
      const roomNeighbors = doorNeighbors.filter((neighbor) => roomContains(room, neighbor));
      // The corridor tile has exactly one room-side neighbor and one route-side
      // neighbor. Anything wider is an escape route, not a lockdown doorway.
      if (doorNeighbors.length !== 2 || roomNeighbors.length !== 1 || !samePosition(roomNeighbors[0]!, trigger)) return [];
      crossings.push({ door, trigger });
    }
  }
  return crossings.length >= 1 && crossings.length <= 4 ? crossings : [];
}
function sameRoom(left: Room, right: Room) { return left.x === right.x && left.y === right.y && left.w === right.w && left.h === right.h; }
function chooseEncounterLayout(map: number[][], rooms: readonly Room[], start: Position, random: () => number, options: EncounterLayoutOptions = {}): EncounterLayout | null {
  const minimumDistance = options.minimumDistance ?? 16;
  const choices = rooms.slice(1).map((room) => {
    const dx = room.x + Math.floor(room.w / 2) - start.x;
    const dy = room.y + Math.floor(room.h / 2) - start.y;
    return { room, entries: encounterEntrances(map, room), separation: Math.max(Math.abs(dx), Math.abs(dy)), distance: Math.hypot(dx, dy) };
  }).filter((choice) => choice.entries.length > 0 && choice.room.w >= 5 && choice.room.h >= 4 && choice.separation >= minimumDistance && (options.maximumDistance === undefined || choice.distance <= options.maximumDistance) && !options.excludedRooms?.some((room) => sameRoom(room, choice.room)));
  if (!choices.length) return null;
  const choice = choices[Math.floor(random() * choices.length)]!;
  return { room: { ...choice.room }, entrances: choice.entries.map((entry) => ({ door: { ...entry.door }, trigger: { ...entry.trigger } })) };
}
/** A Level One LT fixture is deliberately four cells from the start, rather
 * than a random valid room elsewhere on the floor. Its only exit is the
 * one-cell north corridor leading straight back to the opening room. */
function carveNearbyLockdownFixture(map: number[][], start: Position): EncounterLayout {
  const room = { x: start.x - 2, y: start.y - 8, w: 5, h: 4 };
  const bounds = { x: start.x - 3, y: start.y - 9, w: 7, h: 6 };
  for (let y = bounds.y; y < bounds.y + bounds.h; y++) for (let x = bounds.x; x < bounds.x + bounds.w; x++) map[y]![x] = 1;
  carveRoom(map, room);
  const door = { x: start.x, y: start.y - 4 }, trigger = { x: start.x, y: start.y - 5 };
  map[door.y]![door.x] = 0;
  return { room, entrances: [{ door, trigger }] };
}
export function isObjectSetBlocked(floor: Floor, player: MassBearingPosition, x: number, y: number) {
  return floorTriggerDoorSets(floor).some((set) => samePosition(set.barrel, { x, y }) || (samePosition(set.door, { x, y }) && !isObjectSetDoorOpen(set, player, floor.entities)))
    || encounterLockdownSets(floor).some((set) => !isEncounterLockdownDoorOpen(set) && set.doors.some((door) => samePosition(door, { x, y })));
}

function stairsForLevel(level: number, start: Position, forward: Position): Extract<Entity, { kind: "stairs" }>[] {
  const forwardStair = { id: "stairs-forward", kind: "stairs" as const, direction: "forward" as const, name: "Stairs up", ...forward };
  return level > 1
    ? [{ id: "stairs-back", kind: "stairs" as const, direction: "back" as const, name: "Stairs down", x: start.x - 2, y: start.y }, forwardStair]
    : [forwardStair];
}

export function ensureNearbyStairs(floor: Floor) {
  const level = floor.level ?? floor.depth ?? 1;
  const forward = floor.entities?.find((entity) => entity.kind === "stairs" && entity.direction !== "back") ?? { x: floor.start.x + 3, y: floor.start.y };
  const expected = stairsForLevel(level, floor.start, forward).filter((stair) => isStairPlacementCell(floor, stair));
  if (!expected.length) {
    floor.entities = (floor.entities ?? []).filter((entity) => entity.kind !== "stairs");
    return floor;
  }
  floor.entities = [...(floor.entities ?? []).filter((entity) => entity.kind !== "stairs"), ...expected];
  return floor;
}

export function generateOverworldFloor(level: number, seed: number): Floor {
  const width = 100;
  const height = 100;
  const start = { x: 50, y: 50 };
  const exit = { x: 68, y: 62 };
  const world = generateOverworld({ width, height, seed, mountainDensity: 0.24, scale: 18, start, exit,
    protectedCells: level > 1 ? [{ x: start.x - 2, y: start.y }] : [] });
  const entities: Entity[] = [
    ...(level > 1 ? [{ id: "stairs-back", kind: "stairs" as const, direction: "back" as const, name: "Return stairs", x: start.x - 2, y: start.y }] : []),
    { id: "stairs-forward", kind: "stairs", direction: "forward", name: "Forward stairs", ...exit },
  ];
  return { seed: seed >>> 0, width, height, cells: world.cells, start, entities, time: 0, level, family: "overworld",
    generatorVersion: GENERATOR_VERSION, generation: { seed: seed >>> 0, generator: "organic-overworld", passes: world.passes },
    generationProfile: { seed: seed >>> 0, difficulty: level, generatorVersion: GENERATOR_VERSION } };
}
const ATTACK_STAMINA_COST = GAME_TUNING.attackStaminaCost;

export const directions = Object.freeze<Record<Direction, [number, number]>>({ n: [0, -1], s: [0, 1], w: [-1, 0], e: [1, 0] });
export function headingFromMovement(dx: number, dy: number, fallback: Direction = "e"): Direction {
  if (dx < 0) return "w";
  if (dx > 0) return "e";
  if (dy < 0) return "n";
  if (dy > 0) return "s";
  return fallback;
}
export const resourceNames: readonly ResourceName[] = Object.freeze(["health", "stamina", "offense", "defense", "mana", "xp"]);
export const EVENT_TYPES = Object.freeze(["action.committed", "action.rejected", "time.advanced", "player.moved", "player.waited", "player.sneak.changed", "combat.hit", "enemy.defeated", "enemy.split", "resource.changed", "item.collected", "item.collection.rejected", "item.dropped", "item.drop.rejected", "potion.consumed", "quick-slot.changed", "quick-slot.use.rejected", "chest.opened", "crate.bumped", "crate.opened", "equipment.changed", "ability.used", "ability.assignment.changed", "barrel.pushed", "floor-trigger.changed", "encounter.locked", "encounter.cleared", "xp.gained", "xp.level.changed", "progression.points.spent", "realm.entered", "player.died", "campaign.save.succeeded", "campaign.save.failed"]);
export const progressionStatNames: readonly AttributeName[] = Object.freeze(["health", "stamina", "offense", "defense", "mana", "perception", "strength", "luck", "recovery", "stealth"]);
export const attributeLabels = Object.freeze({ health: "Health", stamina: "Stamina", offense: "Offense", defense: "Defense", mana: "Mana", perception: "Perception", strength: "Strength", luck: "Luck", recovery: "Recovery", stealth: "Stealth" });
export const statLabels = attributeLabels;
export const abilityCatalog = Object.freeze({
  heal: Object.freeze({ id: "heal", title: "Heal", icon: "✦", manaCost: 5, kind: "heal", amount: 8, target: "self", isStackable: false }),
  wand: Object.freeze({ id: "wand", title: "Wand", icon: "✹", manaCost: 4, kind: "wand", damage: 7, target: "nearest-enemy", range: 8, isStackable: false }),
  "throwing-knives": Object.freeze({ id: "throwing-knives", title: "Throwing Knives", icon: "⌁", manaCost: 0, kind: "wand", damage: 6, target: "nearest-enemy", range: 8, isStackable: true }),
});
export function abilityItemInstance(abilityId: AbilityId, id = `ability-${abilityId}`): Item {
  const ability = abilityCatalog[abilityId];
  return { id, name: ability.title, group: "weapons", modifiers: {}, category: "ability", abilityId, isStackable: false };
}
export const itemCatalog: readonly Omit<Item, "id">[] = Object.freeze([
  { name: "Dagger (Magic)", group: "weapons", modifiers: { offense: 3, mana: 2 }, hitChance: 94, critChance: 4, perks: ["Reliable"], isStackable: false },
  { name: "Sword", group: "weapons", modifiers: { offense: 6 }, hitChance: 76, critChance: 20, perks: ["High CRIT"], isStackable: false },
  { name: "Two-Handed Sword", group: "weapons", slotSpan: 2, modifiers: { offense: 15, defense: 2 }, hitChance: 90, critChance: 8, perks: ["Automatic parry"], isStackable: false },
  { name: "Leg Armor (Magic)", group: "armor", modifiers: { defense: 2, mana: 2 }, perks: ["Mana boost"], isStackable: false },
  { name: "Chest Armor", group: "armor", modifiers: { offense: 1, defense: 5 }, perks: ["Balanced"], isStackable: false },
  { name: "Suit of Armor", group: "armor", slotSpan: 2, modifiers: { offense: 2, defense: 12 }, perks: ["Heavy protection"], isStackable: false },
  { name: "Wooden Vest", group: "armor", modifiers: { defense: 1 }, isStackable: false },
  { name: "Oak Shield 03", group: "weapons", modifiers: { defense: 3 }, perks: ["Shield"], isStackable: false },
  { name: "Wooden Stick", group: "weapons", modifiers: { offense: 1 }, isStackable: false },
  { name: "Throwing Knives", group: "weapons", modifiers: {}, category: "consumable", abilityId: "throwing-knives", quickSlotAction: "throwing-knives", isStackable: true, quantity: 3 },
  ...jewelItemDefinitions,
]);
export const WORLD_DROPPABLE_ITEM_NAMES = Object.freeze([
  "Extra Carrying Capacity +5", "Heal", "Wand", "Dagger (Magic)", "Sword", "Two-Handed Sword",
  "Leg Armor (Magic)", "Chest Armor", "Suit of Armor", "Oak Shield 03", "Wooden Stick", "Wooden Vest",
  ...JEWEL_NAMES,
] as const);
export type WorldDroppableItemName = typeof WORLD_DROPPABLE_ITEM_NAMES[number];
export function worldDroppableItemInstance(name: WorldDroppableItemName, id: string): Item {
  if (name === "Extra Carrying Capacity +5") return extraSpaceInstance(id);
  if (name === "Heal") return abilityItemInstance("heal", id);
  if (name === "Wand") return abilityItemInstance("wand", id);
  const definition = itemCatalog.find((item) => item.name === name);
  if (!definition) throw new Error(`Missing world droppable item definition: ${name}`);
  return { ...itemInstance(definition, id), category: definition.category ?? "equipment" };
}
function worldItemId(name: string) { return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
export const consumableCatalog = Object.freeze({
  health: Object.freeze({ name: "Health Potion", resource: "health" as const }),
  stamina: Object.freeze({ name: "Stamina Potion", resource: "stamina" as const }),
  mana: Object.freeze({ name: "Mana Potion", resource: "mana" as const }),
});
export function quickSlotKey(item: Pick<Item, "consumableResource" | "quickSlotAction" | "id">) {
  return item.consumableResource ?? item.quickSlotAction ?? item.id;
}
export function isQuickSlottableItem(item: Item | null | undefined): item is Item & { category: "consumable"; consumableResource?: ConsumableResource; quickSlotAction?: "restore-resource" | "throwing-knives" } {
  return item?.isStackable === true && item.category === "consumable" && Boolean(item.consumableResource || item.quickSlotAction);
}
function consumableInstance(resource: ConsumableResource, id: string, quantity = 1): Item { return { id, name: consumableCatalog[resource].name, group: "weapons", modifiers: {}, category: "consumable", consumableResource: resource, quickSlotAction: "restore-resource", isStackable: true, quantity }; }

function rng(seed: number) { let value = seed >>> 0; return () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 4294967296; }; }
function budgetCount(random: () => number, range: { min: number; max: number }) { return range.min + Math.floor(random() * (range.max - range.min + 1)); }
function seedNow() { return Math.floor(Math.random() * 0xffffffff) >>> 0; }
function blankMap(width = FLOOR_WIDTH, height = FLOOR_HEIGHT) { return Array.from({ length: height }, () => Array.from({ length: width }, () => 1)); }
function itemInstance(item: Omit<Item, "id">, id: string): Item { return { id, ...item, modifiers: { ...item.modifiers } }; }
export function effectiveInventoryCapacity(campaign: Pick<Campaign, "player">, inventory = campaign.player.inventory) {
  return campaign.player.inventoryCapacity + inventory.filter((item) => item.category === "capacity").reduce((total, item) => total + Math.max(0, Math.floor(item.capacityBonus ?? 0)), 0);
}
export function inventorySlotCount(inventory: readonly Item[]) { return inventory.reduce((total, item) => total + (item.slotSpan ?? 1), 0); }
export function inventoryFitsCapacity(campaign: Pick<Campaign, "player">, inventory = campaign.player.inventory) { return inventorySlotCount(inventory) <= effectiveInventoryCapacity(campaign, inventory); }
export function extraSpaceInstance(id = "starter-extra-space") { return itemInstance(EXTRA_SPACE_ITEM, id); }
export function normalizeQuickSlots(campaign: Campaign) {
  const input = Array.isArray(campaign.player.quickSlots) ? campaign.player.quickSlots : [];
  campaign.player.quickSlots = [0, 1].map((index) => {
    const value = input[index];
    const item = value?.item ? normalizeItem(value.item) : null;
    if (!value || !item || !isQuickSlottableItem(item) || !Number.isInteger(value.quantity) || value.quantity < 1) return null;
    return { item: structuredClone(item), quantity: value.quantity } as QuickSlot;
  }) as [QuickSlot | null, QuickSlot | null];
  return campaign;
}
function normalizeItem(item: Item): Item {
  const stackable = item.category === "consumable" && (item.consumableResource === "health" || item.consumableResource === "stamina" || item.consumableResource === "mana" || item.quickSlotAction === "throwing-knives");
  const legacyCapacity = item.name === "Extra Space";
  const category = item.category === "ability" && item.abilityId ? "ability" : legacyCapacity || item.category === "capacity" && Number.isFinite(item.capacityBonus) ? "capacity" : item.category === "consumable" && (item.consumableResource === "health" || item.consumableResource === "stamina" || item.consumableResource === "mana" || item.quickSlotAction === "throwing-knives") ? "consumable" : "equipment";
  return { ...item, ...(legacyCapacity ? { name: EXTRA_SPACE_ITEM.name } : {}), category, isStackable: stackable, ...(stackable ? { quantity: Math.max(1, Math.floor(item.quantity ?? 1)) } : {}), ...(category === "capacity" ? { capacityBonus: EXTRA_SPACE_CAPACITY_BONUS, quantity: undefined } : {}) };
}
function normalizeEquipmentItem(item: Item): Item { const { quantity: _quantity, ...equipment } = item; return { ...equipment, isStackable: false }; }
export function normalizeStackableLocations(campaign: Campaign) {
  const slots = campaign.player.quickSlots!;
  const inventory: Item[] = [];
  for (const rawItem of campaign.player.inventory ?? []) {
    const item = normalizeItem(rawItem);
    if (!isQuickSlottableItem(item)) { inventory.push(item); continue; }
    const quickIndex = item.keepInInventory ? -1 : slots.findIndex((slot) => slot && quickSlotKey(slot.item) === quickSlotKey(item));
    if (quickIndex >= 0) { mergeItemProvenance(campaign, slots[quickIndex]!.item, item, slots[quickIndex]!.quantity); slots[quickIndex]!.quantity += item.quantity ?? 1; continue; }
    const existing = inventory.find((entry) => isQuickSlottableItem(entry) && quickSlotKey(entry) === quickSlotKey(item));
    if (existing) { mergeItemProvenance(campaign, existing, item); existing.quantity = (existing.quantity ?? 1) + (item.quantity ?? 1); existing.keepInInventory ||= item.keepInInventory; }
    else inventory.push(item);
  }
  campaign.player.inventory = orderedInventory(inventory);
  const normalizeGroup = (raw: (Item | null)[] = []) => {
    const slots = raw.slice(0, 2).map((item) => item ? normalizeEquipmentItem(item) : null);
    while (slots.length < 2) slots.push(null);
    for (const item of uniqueItems(slots)) if (item.slotSpan === 2) { slots[0] = item; slots[1] = item; }
    return slots;
  };
  campaign.player.equipment = { weapons: normalizeGroup(campaign.player.equipment.weapons), armor: normalizeGroup(campaign.player.equipment.armor), jewels: normalizeGroup(campaign.player.equipment.jewels) };
  return campaign;
}
function entityAt(entities: Entity[], x: number, y: number) { return entities.find((entity) => entity.x === x && entity.y === y); }
function dropPosition(state: Campaign, reserved: readonly Position[] = [], expand = false): Position | null {
  const preferred = [{ x: -1, y: -1 }, { x: 1, y: -1 }].map((offset) => ({ x: state.player.x + offset.x, y: state.player.y + offset.y }));
  const immediate = [...preferred, { x: state.player.x, y: state.player.y - 1 }, { x: state.player.x - 1, y: state.player.y }, { x: state.player.x + 1, y: state.player.y }, { x: state.player.x, y: state.player.y + 1 }, { x: state.player.x - 1, y: state.player.y + 1 }, { x: state.player.x + 1, y: state.player.y + 1 }];
  const cardinal = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }];
  const queue = expand ? [...preferred] : [];
  const visited = new Set<string>();
  const occupied = (position: Position) => entityAt(state.floor.entities, position.x, position.y) || reserved.some((other) => samePosition(position, other));
  const usable = (position: Position) => isWalkable(state.floor, position.x, position.y)
    && !isObjectSetBlocked(state.floor, state.player, position.x, position.y)
    && !samePosition(position, state.player)
    && !occupied(position);
  if (!expand) return immediate.find(usable) ?? null;
  while (queue.length) {
    const position = queue.shift()!;
    const key = `${position.x},${position.y}`;
    if (visited.has(key)) continue;
    visited.add(key);
    if (usable(position)) return position;
    for (const direction of cardinal) {
      const next = { x: position.x + direction.x, y: position.y + direction.y };
      if (next.x >= 0 && next.x < state.floor.width && next.y >= 0 && next.y < state.floor.height) queue.push(next);
    }
  }
  return null;
}
function uniqueEntityId(state: Campaign, item: Item) {
  const base = `dropped-${item.id}-${state.floor.time}`;
  let id = base; let suffix = 1;
  while (state.floor.entities.some((entity) => entity.id === id)) id = `${base}-${suffix++}`;
  return id;
}
function isAvailableEntranceCell(floor: Floor, position: Position) {
  return isWalkable(floor, position.x, position.y)
    && !entityAt(floor.entities, position.x, position.y)
    && !isObjectSetBlocked(floor, position, position.x, position.y);
}
export function entrancePosition(floor: Floor): Position {
  const returnStair = floor.entities.find((entity) => entity.kind === "stairs" && entity.direction === "back");
  const preferred = returnStair ? { x: returnStair.x + 1, y: returnStair.y } : { ...floor.start };
  if (isAvailableEntranceCell(floor, preferred)) return preferred;
  for (let distance = 1; distance <= floor.width + floor.height; distance++) {
    for (let dx = -distance; dx <= distance; dx++) {
      const dy = distance - Math.abs(dx);
      for (const yOffset of dy === 0 ? [0] : [-dy, dy]) {
        const candidate = { x: preferred.x + dx, y: preferred.y + yOffset };
        if (isAvailableEntranceCell(floor, candidate)) return candidate;
      }
    }
  }
  throw new Error("The destination floor has no available entrance grid spot.");
}
export function cardinalAdjacentPosition(floor: Floor, anchor: Position): Position {
  const candidates = ([{ x: anchor.x, y: anchor.y - 1 }, { x: anchor.x + 1, y: anchor.y }, { x: anchor.x, y: anchor.y + 1 }, { x: anchor.x - 1, y: anchor.y }] as Position[])
    .filter((candidate) => isAvailableEntranceCell(floor, candidate));
  if (!candidates.length) throw new Error("The destination map has no available cardinal entrance grid spot.");
  const start = Math.abs(Math.imul(floor.seed, 31) + Math.imul(anchor.x, 17) + Math.imul(anchor.y, 13)) % candidates.length;
  return candidates[start]!;
}
function playerHomeFloor(campaign: Campaign): Floor {
  const level = campaign.floor.level ?? campaign.floor.depth ?? 1;
  const cells = PLAYER_HOME_PREFAB.cells.map((row) => row.map((cell) => ({ walkable: Boolean(cell.walkable), role: cell.role ?? (cell.walkable ? "ground" : "wall") })));
  const arrows = PLAYER_HOME_PREFAB.teleportArrows!.map(({ x, y, direction }) => ({ id: `teleport-arrow-player-home-${x}`, kind: "teleport-arrow" as const, destination: "dungeon", direction, name: "Dungeon", x, y }));
  const context = createLevelContext({ levelId: level, seed: campaign.floor.seed, cells, entities: arrows, start: { x: 4, y: 8 } });
  runLevelPasses(context, [{ id: "player-home", run(generation) {
    for (const arrow of arrows) generation.reserveEntityCell(arrow.x, arrow.y);
    generation.reserveEntityCell(4, 8);
    const saved = campaign.playerHomeEntities?.[String(level)];
    if (saved) { generation.entities = structuredClone(saved); return; }
    const random = worldRandom(campaign.floor.seed, "player-home-rewards");
    const choices: Entity[] = [
      ...(["health", "stamina", "mana"] as const).map((resource) => ({ id: "", kind: "potion" as const, resource, x: 0, y: 0 })),
      ...eligibleWorldItemNames(level, WORLD_DROPPABLE_ITEM_NAMES).map((name) => ({ id: "", kind: "item" as const, item: worldDroppableItemInstance(name as WorldDroppableItemName, ""), x: 0, y: 0 })),
    ];
    for (const x of [4, 5]) {
      if (!generation.reserveEntityCell(x, 5)) throw new Error("Playroom reward space below a table is blocked.");
      const reward = choices.splice(Math.floor(random() * choices.length), 1)[0]!;
      reward.id = `player-home-reward-${level}-${x}`;
      reward.x = x; reward.y = 5;
      if (reward.kind === "item") reward.item.id = reward.id;
      generation.entities.push(reward);
    }
  } }]);
  return { lockboxes: PLAYER_HOME_LOCKBOXES.map(box => ({ ...box })), seed: campaign.floor.seed, width: PLAYER_HOME_PREFAB.width, height: PLAYER_HOME_PREFAB.height, cells, start: { x: 4, y: 8 }, entities: context.entities, time: campaign.floor.time, level, generatorVersion: campaign.floor.generatorVersion, tiledGrounds: PLAYER_HOME_PREFAB.tiledGrounds?.slice(), tiledWalls: PLAYER_HOME_PREFAB.tiledWalls?.slice(), tiledDecorations: PLAYER_HOME_PREFAB.tiledDecorations?.map((decoration) => ({ ...decoration })), generation: { seed: campaign.floor.seed, generator: "player-home" } };
}
function emit(events: GameEvent[], type: string, facts: EventFacts, state: Campaign, source = type.split(".")[0]) { events.push({ type, facts, source, gameTime: state.floor.time, sequence: events.length + 1 }); }
function carveRoom(map: number[][], room: Room) { for (let y = room.y; y < room.y + room.h; y++) for (let x = room.x; x < room.x + room.w; x++) map[y][x] = 0; }
function roomCenter(room: Room) { return { x: room.x + Math.floor(room.w / 2), y: room.y + Math.floor(room.h / 2) }; }
function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }
function roomSocket(room: Room, target: Position) {
  const center = roomCenter(room); const horizontal = Math.abs(target.x - center.x) >= Math.abs(target.y - center.y);
  if (horizontal) return { x: target.x < center.x ? room.x : room.x + room.w - 1, y: clamp(target.y, room.y + 1, room.y + room.h - 2) };
  return { x: clamp(target.x, room.x + 1, room.x + room.w - 2), y: target.y < center.y ? room.y : room.y + room.h - 1 };
}
function carveCorridorCell(map: number[][], x: number, y: number, width: number, axis = "horizontal") {
  const half = Math.floor(width / 2);
  for (let offset = -half; offset < width - half; offset++) {
    if (map[y]?.[x] == null) continue;
    if (axis === "horizontal" && map[y]?.[x + offset] !== undefined) map[y][x + offset] = 0;
    if (axis === "vertical" && map[y + offset]?.[x] !== undefined) map[y + offset][x] = 0;
  }
}
function connectRooms(map: number[][], from: Position, to: Position, width = 1) {
  const corridorWidth = Math.max(1, Math.floor(width)); let { x, y } = from;
  while (x !== to.x) { carveCorridorCell(map, x, y, corridorWidth, "horizontal"); x += Math.sign(to.x - x); }
  while (y !== to.y) { carveCorridorCell(map, x, y, corridorWidth, "vertical"); y += Math.sign(to.y - y); }
  carveCorridorCell(map, x, y, corridorWidth, "vertical");
}

function shuffledWalkableCells(cells: ReturnType<typeof createLevelContext>["cells"], random: () => number) {
  const candidates: Position[] = [];
  for (let y = 1; y < cells.length - 1; y++) for (let x = 1; x < (cells[y]?.length ?? 1) - 1; x++) if (cells[y]?.[x]?.walkable) candidates.push({ x, y });
  for (let index = candidates.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [candidates[index], candidates[other]] = [candidates[other], candidates[index]];
  }
  return candidates;
}

function isSolidObjectPlacementCell(cells: ReturnType<typeof createLevelContext>["cells"], cell: Position) {
  const walkable = (x: number, y: number) => Boolean(cells[y]?.[x]?.walkable);
  return (walkable(cell.x, cell.y - 1) || walkable(cell.x, cell.y + 1))
    && (walkable(cell.x - 1, cell.y) || walkable(cell.x + 1, cell.y));
}

// Any object that blocks movement may use an alcove, but it must not split a
// route between its neighbouring floor cells. Existing blocking objects count
// as walls, so a later placement cannot complete a blockage that an earlier
// placement left open.
export function isNonBlockingObjectPlacementCell(cells: ReturnType<typeof createLevelContext>["cells"], cell: Position, blockingCells: readonly Position[] = []) {
  const blocked = new Set(blockingCells.map(({ x, y }) => `${x},${y}`));
  blocked.add(`${cell.x},${cell.y}`);
  const neighbours = [[0, -1], [1, 0], [0, 1], [-1, 0]]
    .map(([dx, dy]) => ({ x: cell.x + dx, y: cell.y + dy }))
    .filter(({ x, y }) => Boolean(cells[y]?.[x]?.walkable) && !blocked.has(`${x},${y}`));
  if (neighbours.length === 2) return false;
  if (neighbours.length < 2) return true;

  const visited = new Set<string>([`${neighbours[0].x},${neighbours[0].y}`]);
  const queue = [neighbours[0]];
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index];
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const next = { x: current.x + dx, y: current.y + dy };
      const key = `${next.x},${next.y}`;
      if (visited.has(key) || blocked.has(key) || !cells[next.y]?.[next.x]?.walkable) continue;
      visited.add(key);
      queue.push(next);
    }
  }
  return neighbours.every(({ x, y }) => visited.has(`${x},${y}`));
}

// Kept for callers that specifically ask about chests. The same rule applies
// to every movement-blocking object.
export const isNonBlockingChestPlacementCell = isNonBlockingObjectPlacementCell;

function shuffledWallDecorationCells(map: number[][], random: () => number) {
  const candidates: Position[] = [];
  for (let y = 1; y < map.length - 1; y++) for (let x = 1; x < (map[y]?.length ?? 1) - 1; x++) if (isWallDecorationCell(map, { x, y })) candidates.push({ x, y });
  for (let index = candidates.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [candidates[index], candidates[other]] = [candidates[other], candidates[index]];
  }
  return candidates;
}

function structuralRoute(map: number[][], from: Position, to: Position) {
  const queue = [from]; const previous = new Map<string, Position | null>([[`${from.x},${from.y}`, null]]);
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index]; if (current.x === to.x && current.y === to.y) break;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = { x: current.x + dx, y: current.y + dy }; const key = `${next.x},${next.y}`;
      if (map[next.y]?.[next.x] !== 0 || previous.has(key)) continue;
      previous.set(key, current); queue.push(next);
    }
  }
  const route: Position[] = []; let current: Position | undefined = to;
  while (current && previous.has(`${current.x},${current.y}`)) { route.push(current); current = previous.get(`${current.x},${current.y}`) ?? undefined; }
  return route;
}

export function createResourcesModel(values: Partial<Record<ResourceName, Partial<Resource>>> = {}): Resources {
  return Object.fromEntries(resourceNames.map((name) => {
    const value = values[name] ?? {};
    return [name, { current: Number(value.current ?? 0), currentMax: Number(value.currentMax ?? 0), ...(value.level == null ? {} : { level: Number(value.level) }) }];
  })) as Resources;
}

export function isResourcesModel(value: unknown): value is Resources {
  return typeof value === "object" && value !== null && resourceNames.every((name) => { const resource = (value as Record<string, unknown>)[name]; return typeof resource === "object" && resource !== null && "current" in resource && "currentMax" in resource && Number.isFinite(resource.current) && Number.isFinite(resource.currentMax); });
}

function playerResourcesFromCampaign(campaign: Campaign, previous: ResourceInput = campaign.player.resources) {
  const attributes = effectiveAttributes(campaign);
  const current = (name: ResourceName, fallback = 0): number => { const resource = previous[name]; return resource != null && typeof resource === "object" && Number.isFinite(resource.current) ? resource.current! : typeof resource === "number" && Number.isFinite(resource) ? resource : fallback; };
  const stamina = Math.max(0, Math.min(attributes.stamina, current("stamina")));
  const readiness = combatReadiness(stamina, attributes.stamina);
  return createResourcesModel({
    health: { current: Math.max(0, Math.min(attributes.health, current("health", attributes.health))), currentMax: attributes.health },
    stamina: { current: stamina, currentMax: attributes.stamina },
    offense: { current: Math.round(attributes.offense * readiness), currentMax: attributes.offense },
    defense: { current: Math.round(attributes.defense * readiness), currentMax: attributes.defense },
    mana: { current: Math.max(0, Math.min(attributes.mana, current("mana", attributes.mana))), currentMax: attributes.mana },
    xp: { current: campaign.progression.xp, currentMax: campaign.progression.nextXp, level: campaign.progression.level },
  });
}

export function combatReadiness(currentStamina: number, maximumStamina: number) {
  if (maximumStamina <= 0) return 0;
  const ratio = Math.max(0, Math.min(1, currentStamina / maximumStamina));
  return GAME_TUNING.readinessFloor + (1 - GAME_TUNING.readinessFloor) * ratio;
}

function statRank(attributes: Partial<Attributes>, name: AttributeName) { return Math.max(0, Number(attributes?.[name] ?? 0)); }
function lootTier(campaign: Campaign) { return Math.floor(statRank(campaign.progression.attributes, "luck") / GAME_TUNING.luckTierRanks); }
function recoveryAmount(campaign: Campaign) { return GAME_TUNING.moveStaminaRecovery + statRank(campaign.progression.attributes, "recovery") * GAME_TUNING.recoveryMoveBonus; }
export function effectiveAwareness(campaign: Campaign, enemy: Enemy) {
  const base = Number(enemy.awareness ?? GAME_TUNING.enemyAwareness);
  const stealthReduction = 0;
  return Math.max(1, base - stealthReduction - (campaign.player.sneaking ? GAME_TUNING.sneakingAwarenessReduction : 0));
}

function enemyResources(enemy: Pick<Enemy, "hp" | "maxHp" | "damage" | "xp"> & { resources?: Resources }, level = 1) {
  const healthMax = Number(enemy.resources?.health?.currentMax ?? enemy.maxHp ?? enemy.hp ?? 0);
  const healthCurrent = Number(enemy.resources?.health?.current ?? enemy.hp ?? healthMax);
  const offense = Number(enemy.resources?.offense?.current ?? enemy.damage ?? 0);
  const xp = Number(enemy.resources?.xp?.current ?? enemy.xp ?? 0);
  return createResourcesModel({
    health: { current: healthCurrent, currentMax: healthMax },
    stamina: { current: 0, currentMax: 0 },
    offense: { current: offense, currentMax: offense },
    defense: { current: 0, currentMax: 0 },
    mana: { current: 0, currentMax: 0 },
    xp: { current: xp, currentMax: xp, level },
  });
}

function enemyFromDefinition(id: string, definition: EnemyDefinition, position: Position, level: number, threatScale = 1, awarenessBonus = 0, actionDelay = 0): Omit<Enemy, "resources"> {
  const health = Math.max(1, Math.round(definition.hp * threatScale));
  const damage = Math.max(1, Math.round(definition.damage * threatScale));
  const actionCooldown = Math.max(1, definition.actionCooldown + actionDelay);
  return { id, kind: "enemy", x: position.x, y: position.y, hasMass: true, hp: health, maxHp: health, damage, awareness: definition.awareness + awarenessBonus, actionCooldown, nextActionAt: actionCooldown, name: definition.name, character: definition.character, graphic: definition.graphic, idle: definition.idle, attackKind: definition.attackKind, attackRange: definition.attackRange, xp: Math.max(1, Math.round(definition.xp * threatScale)), generation: 1, heading: "e", ai: { state: "idle", targetId: null } };
}

export function slimeSplitDenominator(generation = 1) { return 20 * 2 ** Math.max(0, Math.trunc(generation) - 1); }
export function slimeSplitChance(generation = 1) { return 1 / slimeSplitDenominator(generation); }

export function upgradeCampaignResources(campaign: Campaign, { normalizeStatic = true }: { normalizeStatic?: boolean } = {}) {
  normalizePlayerPosition(campaign.player);
  const attributes = campaign.progression.attributes as Attributes & { vitality?: number };
  attributes.perception ??= attributes.vitality ?? 1;
  delete attributes.vitality;
  for (const item of [...campaign.player.inventory, ...Object.values(campaign.player.equipment).flat(), ...(campaign.floor.entities ?? []).flatMap((entity) => entity.kind === "item" ? [entity.item] : [])]) {
    if (!item) continue;
    const modifiers = item.modifiers as Partial<Attributes> & { vitality?: number };
    if (modifiers.vitality !== undefined) { modifiers.perception ??= modifiers.vitality; delete modifiers.vitality; }
  }
  campaign.worldSeed ??= campaign.floor.seed;
  campaign.slot = Number.isInteger(campaign.slot) && campaign.slot! > 0 ? campaign.slot : 1;
  campaign.run = Number.isInteger(campaign.run) && campaign.run! > 0 ? campaign.run : 1;
  if (normalizeStatic) {
    ensureSemanticCells(campaign.floor);
    if (campaign.activePrefab?.id === "player-home") {
      campaign.floor.lockboxes = PLAYER_HOME_LOCKBOXES.map(box => ({ ...box }));
      campaign.floor.tiledDecorations = PLAYER_HOME_PREFAB.tiledDecorations?.map(tile => ({ ...tile }));
      for (let y = 0; y < PLAYER_HOME_PREFAB.height; y++) for (let x = 0; x < PLAYER_HOME_PREFAB.width; x++) {
        setCell(campaign.floor, x, y, PLAYER_HOME_PREFAB.cells[y][x]);
      }
    }
  }
  normalizeObjectSets(campaign.floor);
  campaign.levelStates ??= {};
  normalizeQuickSlots(campaign);
  normalizeStackableLocations(campaign);
  campaign.player.hasMass = campaign.player.hasMass !== false;
  campaign.player.heading = campaign.player.heading ?? "e";
  campaign.player.encumberedDirection ??= null;
  campaign.combatRollState = Number.isInteger(campaign.combatRollState) ? campaign.combatRollState! >>> 0 : campaign.floor.seed >>> 0;
  campaign.floor.projectiles = Array.isArray(campaign.floor.projectiles) ? campaign.floor.projectiles : [];
  campaign.floor.entities = (campaign.floor.entities ?? []).map((entity) => entity.kind === "item" ? { ...entity, item: normalizeItem(entity.item) } : entity);
  campaign.player.resources = playerResourcesFromCampaign(campaign);
  const level = campaign.floor.level ?? campaign.floor.depth ?? 1;
  for (const entity of campaign.floor.entities ?? []) if (entity.kind === "enemy") {
    entity.hasMass = entity.hasMass !== false;
    if (entity.name === "Cave Rat") entity.name = "Rat";
    const definition = enemyDefinitionForName(entity.name);
    entity.character ??= entity.name === "Skeleton" ? "skeleton-warrior" : enemyCharacterForName(entity.name);
    entity.graphic ??= entity.character;
    entity.idle ??= definition.idle ?? "idle";
    entity.resources = enemyResources(entity, level);
    entity.hp = entity.resources.health.current;
    entity.maxHp = entity.resources.health.currentMax;
    entity.damage = entity.resources.offense.current;
    entity.xp = entity.resources.xp.current;
    entity.generation = Math.max(1, Math.trunc(Number(entity.generation) || 1));
    entity.awareness = Number(entity.awareness ?? GAME_TUNING.enemyAwareness);
    entity.actionCooldown = Math.max(1, Number(entity.actionCooldown ?? GAME_TUNING.enemyActionCooldown));
    entity.attackKind ??= "melee";
    entity.attackRange = Math.max(1, Number(entity.attackRange ?? 1));
    entity.nextActionAt = Math.max(0, Number(entity.nextActionAt ?? campaign.floor.time + entity.actionCooldown));
    entity.heading = entity.heading ?? "e";
    entity.ai = entity.ai && ["idle", "pursue", "attack", "blocked"].includes(entity.ai.state)
      ? { state: entity.ai.state, targetId: entity.ai.targetId === "player" ? "player" : null }
      : { state: "idle", targetId: null };
  }
  campaign.progression.level = Math.max(1, Math.min(99, Math.trunc(Number(campaign.progression.level) || 1)));
  campaign.progression.xp = Math.max(0, Math.trunc(Number(campaign.progression.xp) || 0));
  campaign.progression.nextXp = GAME_TUNING.xpThreshold;
  campaign.progression.attributePoints = Math.max(0, Math.trunc(Number(campaign.progression.attributePoints) || 0));
  for (const name of progressionStatNames) { const value = Number(campaign.progression.attributes[name]); campaign.progression.attributes[name] = Math.max(name === "perception" ? 0 : 1, Math.min(99, Math.trunc(Number.isFinite(value) ? value : 1))); }
  return campaign;
}

export function generateFloor(level: number, seed = seedNow(), difficulty = level, options: { topologyVersion?: string; portalLayoutVersion?: string; size?: 50 | 100 | 200; corridorWidth?: number; pickupDensity?: Partial<Record<keyof typeof PICKUP_DENSITY_DEFAULTS, { min: number; max: number }>>; level1TestMode?: boolean; level1ObjectTestMode?: boolean; level1EnemyTestMode?: boolean; worldAttributes?: WorldAttributes; playerHouse?: boolean } = {}): Floor {
  validateTopologyVersion(options.topologyVersion);
  validatePortalLayoutVersion(options.portalLayoutVersion);
  // The opening floor is deliberately compact: it lets a new player discover
  // the starter pack, nearby threats, and the exit without a long empty walk.
  // Passing an explicit size keeps the generator's diagnostic/test variants
  // unchanged, as do player-home maps.
  // 70×70 is roughly half the original 100×100 tile area. It is compact
  // enough to remove the opening dead space while still accommodating the
  // normal Level One encounter and pickup budgets.
  const isLevelOneFixture = options.level1TestMode === true || options.level1ObjectTestMode === true || options.level1EnemyTestMode === true;
  const defaultSize = level === 1 && options.worldAttributes !== undefined && !options.playerHouse && !isLevelOneFixture ? 70 : FLOOR_WIDTH;
  const width = options.size ?? defaultSize, height = options.size ?? defaultSize;
  const center = { x: Math.floor(width / 2), y: Math.floor(height / 2) };
  const areaScale = width * height / (FLOOR_WIDTH * FLOOR_HEIGHT);
  const world = options.worldAttributes ? normalizeWorldAttributes(options.worldAttributes) : null;
  const tuning = world ? worldTuning(world) : null;
  const balance = worldBalanceProfile(level, difficulty, world ?? DEFAULT_WORLD_ATTRIBUTES);
  const random = world ? worldRandom(seed, 'topology') : rng(seed);
  // Keep the encounter's choices isolated from legacy placement streams so a
  // new room does not reroll unrelated content for an existing seed.
  const encounterRandom = world ? worldRandom(seed, 'encounters') : rng(seed ^ 0x45d9f3b);
  const rewardRandom = world ? worldRandom(seed, 'rewards') : random;
  const pickupRandom = world ? worldRandom(seed, 'pickups') : random;
  const hazardRandom = world ? worldRandom(seed, 'hazards') : random;
  const traitRandom = world ? worldRandom(seed, 'enemy-traits') : random;
  const map = blankMap(width, height); const rooms: Room[] = [];
  const corridorWidth = Math.max(1, Math.floor(Number(options?.corridorWidth ?? tuning?.corridorWidth ?? 1)));
  const startRoom = { x: center.x - 3, y: center.y - 3, w: 7, h: 7 };
  const graphLayout = options.topologyVersion === DUNGEON_TOPOLOGY_VERSION ? generateDungeonGraphLayout({
    width, height, seed, startRoom, roomCount: 1 + Math.max(2, Math.round((tuning?.roomCount ?? 9) * areaScale)),
    corridorWidth, extraLinks: tuning ? tuning.extraLinks + Math.floor(tuning.discoveries / 3) : 1,
    levelOneChamber: level === 1, levelOneLockdownFixture: level === 1 && options.level1TestMode === true && world !== null, homeFootprint: level === 1 && options.playerHouse ? startRoom : undefined,
  }) : null;
  if (graphLayout) { map.splice(0, map.length, ...graphLayout.map); rooms.push(...graphLayout.rooms); }
  else {
  carveRoom(map, startRoom); rooms.push(startRoom);
  for (let i = 0; i < Math.max(2, Math.round((tuning?.roomCount ?? 9) * areaScale)); i++) {
    const room = { x: 0, y: 0, w: 5 + Math.floor(random() * 5), h: 4 + Math.floor(random() * 4) };
    room.x = 2 + Math.floor(random() * (width - room.w - 3));
    room.y = 2 + Math.floor(random() * (height - room.h - 3));
    carveRoom(map, room);
    const previous = rooms.at(-1)!; const previousSocket = roomSocket(previous, roomCenter(room)); const nextSocket = roomSocket(room, roomCenter(previous));
    connectRooms(map, previousSocket, nextSocket, corridorWidth);
    rooms.push(room);
  }
  if (tuning) {
    const optionalRandom = worldRandom(seed, 'optional-routes');
    const links = tuning.extraLinks + Math.floor(tuning.discoveries / 3);
    for (let i = 0; i < links; i++) {
      const from = rooms[1 + Math.floor(optionalRandom() * (rooms.length - 1))];
      const to = rooms[1 + Math.floor(optionalRandom() * (rooms.length - 1))];
      connectRooms(map, roomSocket(from, roomCenter(to)), roomSocket(to, roomCenter(from)), corridorWidth);
    }
  }
  }
  const start = { ...center };
  const level1ObjectTestMode = level === 1 && options.level1ObjectTestMode === true;
  const level1EnemyTestMode = level === 1 && options.level1EnemyTestMode === true;
  const level1TeleportTestMode = level === 1 && options.level1TestMode === true;
  const regionRole = level === 1 ? world ? "optional-reward" : objectSetRoles[Math.floor(random() * objectSetRoles.length)] : null;
  const sealedDoor = { x: start.x + 4, y: start.y };
  const sealedGoal = { x: start.x + 6, y: start.y };
  if (level === 1) {
    for (let y = start.y - 2; y <= start.y + 2; y++) for (let x = start.x + 4; x <= start.x + 8; x++) map[y][x] = 1;
    carveRoom(map, { x: start.x + 5, y: start.y - 1, w: 3, h: 3 });
    map[sealedDoor.y][sealedDoor.x] = 0;
  }
  const exitCandidates: Position[] = [];
  const exitDistance = tuning?.exitDistance ?? 20;
  const distances = new Map<string, number>();
  if (world || graphLayout) {
    const queue = [start]; distances.set(`${start.x},${start.y}`, 0);
    for (let i = 0; i < queue.length; i++) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const cell = { x: queue[i].x + dx, y: queue[i].y + dy }; const key = `${cell.x},${cell.y}`;
      if (map[cell.y]?.[cell.x] !== 0 || distances.has(key)) continue;
      distances.set(key, distances.get(`${queue[i].x},${queue[i].y}`)! + 1); queue.push(cell);
    }
  }
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
    const distance = world || graphLayout ? distances.get(`${x},${y}`) ?? -1 : Math.hypot(x - start.x, y - start.y);
    const graphRoom = graphLayout?.topology.rooms.find(room => room.id !== 0 && x >= room.x && y >= room.y && x < room.x + room.w && y < room.y + room.h);
    if (map[y][x] === 0 && (graphLayout ? graphRoom && distance >= 6 : distance >= exitDistance && (!world || distance <= exitDistance + 8))) exitCandidates.push({ x, y });
  }
  if (graphLayout) exitCandidates.sort((left, right) => Math.abs((distances.get(`${left.x},${left.y}`) ?? 0) - exitDistance) - Math.abs((distances.get(`${right.x},${right.y}`) ?? 0) - exitDistance) || left.y - right.y || left.x - right.x);
  const distantExit = (graphLayout ? exitCandidates[0] : exitCandidates[Math.floor(random() * exitCandidates.length)]) ?? { x: start.x + 3, y: start.y };
  // Keep the nearby test-mode stair one clear tile away from the sealed door.
  // A stair beside a door makes its interaction hard to distinguish from opening
  // the door and violates the shared object-placement spacing rule.
  const routeForward = regionRole === "exit" ? sealedGoal : distantExit;
  if (!graphLayout && level === 1 && regionRole !== "exit") {
    const bypass = { x: start.x, y: start.y + 4 };
    connectRooms(map, start, bypass, corridorWidth);
    connectRooms(map, bypass, routeForward, corridorWidth);
  }
  const isClearStairMapCell = (position: Position) => map[position.y]?.[position.x] === 0
    && [map[position.y - 1]?.[position.x], map[position.y]?.[position.x + 1], map[position.y + 1]?.[position.x], map[position.y]?.[position.x - 1]].every((cell) => cell === 0);
  // The Level One test fixture deliberately keeps its sole forward stair in
  // the opening room. It is a fixture-only interaction target, distinct from
  // production's distant exit and starter-pack distribution.
  const fixtureForward = { x: start.x + 2, y: start.y };
  const forward = level1TeleportTestMode ? fixtureForward : isClearStairMapCell(routeForward) ? routeForward : exitCandidates.find(isClearStairMapCell) ?? { x: start.x + 3, y: start.y };
  let repairs = 0;
  if (!graphLayout && world && !structuralRoute(map, start, forward).length) { connectRooms(map, start, forward, Math.max(3, corridorWidth)); repairs++; }
  if (graphLayout) {
    const exitRoom = graphLayout.topology.rooms.find(room => forward.x >= room.x && forward.y >= room.y && forward.x < room.x + room.w && forward.y < room.y + room.h) ?? graphLayout.topology.rooms[0]!;
    graphLayout.topology.exitRoomId = exitRoom.id;
    graphLayout.topology.route = dungeonGraphRoute(rooms.length, graphLayout.topology.edges, 0, exitRoom.id);
  }
  const stairs = stairsForLevel(level, start, forward);
  const exit = stairs.find((stair) => stair.direction === "forward")!;
  // These rooms stay part of the ordinary dungeon until an interior trigger is
  // crossed. The entrance cells are intentionally one tile wide.
  const encounterLayout = level1EnemyTestMode ? null : chooseEncounterLayout(map, rooms, start, encounterRandom);
  // Current graph layouts reserve a deterministic example four cells from
  // the start. Unversioned saves keep the historical seeded fixture selection.
  const encounterFixtureLayout = world && level1TeleportTestMode
    ? options.topologyVersion === DUNGEON_TOPOLOGY_VERSION
      ? graphLayout?.lockdownFixture
        ? { room: { ...graphLayout.lockdownFixture.room }, entrances: [{ door: { ...graphLayout.lockdownFixture.door }, trigger: { ...graphLayout.lockdownFixture.trigger } }] }
        : carveNearbyLockdownFixture(map, start)
      : chooseEncounterLayout(map, rooms, start, worldRandom(seed, "level-one-encounter-fixture"), {
        maximumDistance: 100,
        excludedRooms: encounterLayout ? [encounterLayout.room] : [],
      })
    : null;
  const encounterLayouts = [
    ...(encounterLayout ? [{ id: `encounter-lockdown-${level}`, layout: encounterLayout, random: encounterRandom }] : []),
    ...(encounterFixtureLayout ? [{ id: "encounter-lockdown-fixture-level-1", layout: encounterFixtureLayout, random: worldRandom(seed, "level-one-encounter-fixture-enemies") }] : []),
  ];
  if (options.size && options.size !== 100) {
    const reference = generateFloor(level, seed, difficulty, { ...options, size: 100 });
    const usable = map.reduce((n, row) => n + row.filter(cell => cell === 0).length, 0);
    const referenceUsable = reference.cells.reduce((n, row) => n + row.filter(cell => cell.walkable).length, 0);
    const ratio = usable / Math.max(1, referenceUsable);
    for (const budget of Object.values(balance.budgets)) { budget.min = Math.max(0, Math.round(budget.min * ratio)); budget.max = Math.max(budget.min, Math.round(budget.max * ratio)); }
  }
  const context = createLevelContext({ worldId: "One", realmId: `Underground ${level}`, levelId: level, seed, width, height, start, exit });
  const prefabPlacements: PrefabPlacement[] = [];
  // Capture required walkable markers before terrain passes. Authored home
  // walls reserve writes, but are not required-walkable gameplay markers.
  const requiredWalkable: Position[] = [start, ...stairs,
    ...(graphLayout?.chamber ? [graphLayout.chamber.door, graphLayout.chamber.goal] : []),
    ...encounterLayouts.flatMap(({ layout }) => layout.entrances.flatMap(entry => [entry.door, entry.trigger])),
    ...(graphLayout?.homeEntrance ? corridorOffsets(corridorWidth).map(offset => ({ x: graphLayout.homeEntrance!.x + offset, y: graphLayout.homeEntrance!.y })) : []),
  ];
  let quality: DungeonQualityResult | undefined;
  const qualityRepairs: { issues: DungeonQualityResult["issues"]; changed: Position[]; passes: number }[] = [];
  const qualityInput = () => ({ width, height, cells: context.cells, start, exit, rooms,
    corridors: graphLayout?.corridors.flatMap(corridor => corridor.segments), protectedCells: requiredWalkable,
    minimumRoomWidth: 5, minimumRoomHeight: 4, minimumRouteLength: isLevelOneFixture ? 0 : 6 });
  const requireQuality = () => {
    quality = validateDungeonQuality(qualityInput());
    if (!quality.valid) throw new Error(`Dungeon generation rejected: ${JSON.stringify(quality.issues)}`);
  };
  if (level === 1 && options.playerHouse) {
    const origin = { x: start.x - 3, y: start.y - 3 };
    const placement = stampPrefab(context, HERO_HOUSE_PREFAB, origin);
    prefabPlacements.push(placement);
    if (graphLayout?.homeEntrance) for (const offset of corridorOffsets(corridorWidth)) context.writeCell(graphLayout.homeEntrance.x + offset, graphLayout.homeEntrance.y, { walkable: true, role: "ground" });
    for (let y = 0; y < HERO_HOUSE_PREFAB.height; y++) for (let x = 0; x < HERO_HOUSE_PREFAB.width; x++) context.reserveCell(origin.x + x, origin.y + y);
  }
  runLevelPasses(context, [{ id: "structured-dungeon", run: (generation) => {
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (map[y][x] === 0) generation.writeCell(x, y, graphLayout ? { walkable: true, role: "ground" } : { walkable: true });
    return {};
  } }, { id: "reserve-semantic-cells", run: (generation) => {
    generation.reserveCell(start.x, start.y);
    stairs.forEach((stair) => generation.reserveCell(stair.x, stair.y));
    if (graphLayout) requiredWalkable.forEach(marker => generation.reserveCell(marker.x, marker.y));
    return {};
  } }, ...(graphLayout ? [{ id: "validate-dungeon-structure", run: () => {
    quality = validateDungeonQuality(qualityInput());
    if (!quality.valid && quality.issues.every(issue => ["exit-unreachable", "room-unreachable"].includes(issue.code))) {
      const repaired = repairDungeonRoutes(context.cells, start, [exit, ...rooms.map(roomCenter)], context.protectedCells);
      qualityRepairs.push({ issues: quality.issues, changed: repaired.changed, passes: repaired.passes });
      context.cells = repaired.cells;
      repairs += repaired.passes;
      map.splice(0, map.length, ...context.cells.map(row => row.map(cell => cell.walkable ? 0 : 1)));
    }
    requireQuality();
    return {};
  } }] : []), { id: "place-dungeon-objects", run: (generation) => {
    // Placement is intentionally a later pass. Every object claims its cell
    // through one shared reservation map, so a seed cannot overlap actors,
    // chests, pickups, the start, or the exit.
    generation.reserveEntityCell(start.x, start.y);
    stairs.forEach((stair) => generation.reserveEntityCell(stair.x, stair.y));
    // The linked puzzle is placed after ordinary objects. Keep every possible
    // role-set cell out of the common pool so changes to unrelated RNG streams
    // cannot steal its barrel, trigger, door, or sealed reward destination.
    const floorTriggerReservation = new Set(level === 1 && regionRole ? [
      { x: start.x - 2, y: start.y }, { x: start.x - 1, y: start.y },
      { x: start.x, y: start.y - 2 }, { x: start.x, y: start.y - 1 },
      { x: start.x - 2, y: start.y + 2 }, { x: start.x - 1, y: start.y + 2 },
      sealedDoor, sealedGoal,
    ].map(({ x, y }) => `${x},${y}`) : []);
    const candidates = shuffledWalkableCells(generation.cells, world ? worldRandom(seed, 'placement') : random)
      .filter((cell) => !floorTriggerReservation.has(`${cell.x},${cell.y}`));
    const route = new Set(structuralRoute(map, start, exit).map((cell) => `${cell.x},${cell.y}`));
    const claim = (cell: Position) => generation.occupiedCells.some((occupied) => occupied.x === cell.x && occupied.y === cell.y) || !isWalkable(generation, cell.x, cell.y) ? false : generation.reserveEntityCell(cell.x, cell.y);
    const blockingCells: Position[] = [];
    const encounterCells = new Set<string>();
    for (const { layout } of encounterLayouts) for (let y = layout.room.y; y < layout.room.y + layout.room.h; y++) for (let x = layout.room.x; x < layout.room.x + layout.room.w; x++) encounterCells.add(`${x},${y}`);
    const blocksMovement = (entity: Entity) => ["chest", "crate", "campfire", "enemy"].includes(entity.kind) && (entity.kind !== "chest" || !entity.opened) && (entity.kind !== "crate" || !entity.opened);
    const nextCell = () => candidates.find((cell) => !route.has(`${cell.x},${cell.y}`) && !encounterCells.has(`${cell.x},${cell.y}`) && claim(cell)) ?? null;
    const roleScore = (cell: Position, roles: readonly string[]) => graphLayout?.topology.rooms.some(room => room.roles.some(role => roles.includes(role)) && cell.x >= room.x && cell.y >= room.y && cell.x < room.x + room.w && cell.y < room.y + room.h) ? 1 : 0;
    const roleCandidates = (roles: readonly string[]) => graphLayout ? [...candidates].sort((left, right) => roleScore(right, roles) - roleScore(left, roles)) : candidates;
    const nextBlockingCell = (roles: readonly string[] = []) => roleCandidates(roles).find((cell) => !route.has(`${cell.x},${cell.y}`) && !encounterCells.has(`${cell.x},${cell.y}`) && isSolidObjectPlacementCell(generation.cells, cell) && isNonBlockingObjectPlacementCell(generation.cells, cell, blockingCells) && claim(cell)) ?? null;
    const isLevelOneStartArea = (cell: Position) => level === 1 && Math.max(Math.abs(cell.x - start.x), Math.abs(cell.y - start.y)) <= Math.floor(VISIBLE_LANDSCAPE_SCREEN.width / 2);
    const nextEnemyCell = () => roleCandidates(["arena", "hub"]).find((cell) => !isLevelOneStartArea(cell) && !route.has(`${cell.x},${cell.y}`) && !encounterCells.has(`${cell.x},${cell.y}`) && isSolidObjectPlacementCell(generation.cells, cell) && isNonBlockingObjectPlacementCell(generation.cells, cell, blockingCells) && claim(cell)) ?? null;
    const add = (entity: Entity) => { generation.entities.push(entity); if (blocksMovement(entity)) blockingCells.push(entity); };
    const productionStarterPack = level === 1 && !level1TeleportTestMode && !level1ObjectTestMode && !level1EnemyTestMode;
    const starterRadius = (cell: Position) => Math.hypot(cell.x - start.x, cell.y - start.y) <= 10;
    const nextOrdinaryPickupCell = () => candidates.find((cell) => !starterRadius(cell) && !route.has(`${cell.x},${cell.y}`) && !encounterCells.has(`${cell.x},${cell.y}`) && claim(cell)) ?? null;
    if (productionStarterPack) {
      // The opening pack is a visual first-run cue, not general floor loot.
      // Prefer the closest legal cells so both objects arrive in the opening
      // view at Native scale; retain the requested ten-tile search fallback
      // for uncommon entrance layouts with blocked neighbouring cells.
      const protectedEncounterCells = new Set([
        `${start.x - 2},${start.y}`, `${start.x - 1},${start.y}`,
        `${start.x},${start.y - 2}`, `${start.x},${start.y - 1}`,
        `${start.x - 2},${start.y + 2}`, `${start.x - 1},${start.y + 2}`,
      ]);
      const starterCandidates = candidates.filter((cell) => starterRadius(cell) && !protectedEncounterCells.has(`${cell.x},${cell.y}`)).sort((left, right) => {
        const leftDistance = Math.hypot(left.x - start.x, left.y - start.y);
        const rightDistance = Math.hypot(right.x - start.x, right.y - start.y);
        return leftDistance - rightDistance;
      });
      const nextStarterCell = () => starterCandidates.find((cell) => Math.hypot(cell.x - start.x, cell.y - start.y) <= 3 && claim(cell))
        ?? starterCandidates.find((cell) => claim(cell))
        ?? null;
      const stickCell = nextStarterCell();
      const potionCell = nextStarterCell();
      if (!stickCell || !potionCell) throw new Error("Level One starter pack could not be placed within ten tiles of the start.");
      add({ id: "starter-wooden-stick", kind: "item", item: worldDroppableItemInstance("Wooden Stick", "starter-wooden-stick"), ...stickCell });
      const resource: ConsumableResource = pickupRandom() < .5 ? "health" : "mana";
      add({ id: `starter-${resource}-potion`, kind: "potion", resource, ...potionCell });
    }
    // Missing portal versions retain original placements for both graph and chain saves.
    if (options.portalLayoutVersion !== PORTAL_LAYOUT_VERSION) {
      const teleportArrowCell = level1TeleportTestMode
        ? candidates.find((cell) => Math.hypot(cell.x - start.x, cell.y - start.y) <= 8 && !route.has(`${cell.x},${cell.y}`) && !encounterCells.has(`${cell.x},${cell.y}`) && claim(cell))
          ?? candidates.find((cell) => Math.hypot(cell.x - start.x, cell.y - start.y) <= 50 && !route.has(`${cell.x},${cell.y}`) && !encounterCells.has(`${cell.x},${cell.y}`) && claim(cell))
        : candidates.find((cell) => !route.has(`${cell.x},${cell.y}`) && !encounterCells.has(`${cell.x},${cell.y}`) && claim(cell));
      if (teleportArrowCell) add({ id: `teleport-arrow-${level}`, kind: "teleport-arrow", destination: "player-home", direction: "n", name: "Home", ...teleportArrowCell });
    } else {
      const isClearPortalCell = (cell: Position) => !floorTriggerReservation.has(`${cell.x},${cell.y}`)
        && !route.has(`${cell.x},${cell.y}`) && !encounterCells.has(`${cell.x},${cell.y}`)
        && !generation.occupiedCells.some((occupied) => samePosition(occupied, cell))
        && !generation.protectedCells.some((protectedCell) => samePosition(protectedCell, cell));
      const portalCandidates = candidates.flatMap((approach) => {
        if (!isClearPortalCell(approach)) return [];
        return [{ x: approach.x, y: approach.y - 1 }, { x: approach.x + 1, y: approach.y }, { x: approach.x, y: approach.y + 1 }, { x: approach.x - 1, y: approach.y }].flatMap((position) => {
          const entrances = prefabPortalEntrances(generation.cells, PLAYER_HOME_PREFAB, position);
          return entrances?.every((entrance) => isClearPortalCell(entrance) && isClearPortalCell(entrance.approach)) ? [entrances] : [];
        });
      });
      const portalWithin = (entrances: NonNullable<ReturnType<typeof prefabPortalEntrances>>, radius: number) => entrances.every((cell) => Math.hypot(cell.x - start.x, cell.y - start.y) <= radius);
      const teleportEntrance = level1TeleportTestMode
        ? portalCandidates.find((entrances) => portalWithin(entrances, 8))
          ?? portalCandidates.find((entrances) => portalWithin(entrances, 50))
        : portalCandidates[0];
      if (!teleportEntrance) throw new Error("No wall opening fits the player-home prefab's teleport arrows.");
      // Validate the whole footprint before cutting any of its wall cells.
      teleportEntrance.forEach(({ x, y, direction, approach }, index) => {
        generation.writeCell(x, y, { walkable: true, role: "ground" });
        map[y][x] = 0;
        generation.reserveCell(x, y);
        generation.reserveEntityCell(x, y);
        generation.reserveEntityCell(approach.x, approach.y);
        add({ id: `teleport-arrow-${level}${index === 0 ? "" : `-${index + 1}`}`, kind: "teleport-arrow", destination: "player-home", direction, name: "Home", x, y });
      });
    }
    const objectSets: ObjectSet[] = [];
    if (level === 1 && regionRole) {
      const layouts = [
        { barrel: { x: start.x - 2, y: start.y }, trigger: { x: start.x - 1, y: start.y } },
        { barrel: { x: start.x, y: start.y - 2 }, trigger: { x: start.x, y: start.y - 1 } },
        { barrel: { x: start.x - 2, y: start.y + 2 }, trigger: { x: start.x - 1, y: start.y + 2 } },
      ];
      const layout = layouts[Math.floor(random() * layouts.length)];
      const claimSetCell = (cell: Position) => generation.reserveEntityCell(cell.x, cell.y);
      if (!isBlockingPathCell(generation, layout.barrel) && !isBarrelAdjacentToWall(generation, layout.barrel) && claimSetCell(layout.barrel) && claimSetCell(layout.trigger) && claimSetCell(sealedDoor)) {
        objectSets.push({ id: "floor-trigger-door-barrel-1", kind: "floor-trigger-door-barrel", barrel: { ...layout.barrel, hasMass: true }, barrelStart: { ...layout.barrel }, trigger: layout.trigger, door: sealedDoor, regionRole });
        blockingCells.push(layout.barrel, sealedDoor);
        if (regionRole === "optional-reward" && claimSetCell(sealedGoal)) add({ id: "sealed-reward", kind: "chest", opened: false, ...sealedGoal });
      }
    }
    for (const { id: encounterId, layout: encounterLayout, random: layoutRandom } of encounterLayouts) {
      // Lockdown encounters are a deliberate, dramatic three-enemy battle;
      // ordinary level-density tuning must not thin this scripted set.
      const encounterEnemyCount = 3;
      const enemyCells = Array.from({ length: Math.max(0, encounterLayout.room.h - 2) }, (_, row) => row + encounterLayout.room.y + 1)
        .flatMap((y) => Array.from({ length: Math.max(0, encounterLayout.room.w - 2) }, (_, column) => ({ x: column + encounterLayout.room.x + 1, y })))
        .filter((cell) => !encounterLayout.entrances.some((entry) => samePosition(entry.trigger, cell)) && !route.has(`${cell.x},${cell.y}`) && isSolidObjectPlacementCell(generation.cells, cell) && isNonBlockingObjectPlacementCell(generation.cells, cell, blockingCells) && !generation.occupiedCells.some((occupied) => samePosition(occupied, cell)))
        .sort(() => layoutRandom() - .5)
        .slice(0, encounterEnemyCount);
      if (enemyCells.length === encounterEnemyCount && encounterLayout.entrances.every((entry) => generation.reserveEntityCell(entry.door.x, entry.door.y)) && enemyCells.every((cell) => generation.reserveEntityCell(cell.x, cell.y))) {
        const definitions = enemyDefinitionsForWorldLevel(level);
        const enemies = enemyCells.map((cell, index) => {
          const definition = definitions[Math.floor(layoutRandom() * definitions.length)] ?? definitions[0]!;
          const enemy = enemyFromDefinition(`${encounterId}-enemy-${index + 1}`, definition, cell, level, tuning?.threatScale ?? 1, tuning ? tuning.awareness + traitRandom() * .5 - definition.awareness : 0, tuning?.engagementDelay ?? 0);
          return { ...enemy, encounterId, resources: enemyResources(enemy, level) };
        });
        objectSets.push({ id: encounterId, kind: "encounter-lockdown", barrel: { ...encounterLayout.entrances[0]!.door, hasMass: false }, trigger: { ...encounterLayout.entrances[0]!.trigger }, door: { ...encounterLayout.entrances[0]!.door }, regionRole: "optional-reward", doors: encounterLayout.entrances.map((entry) => ({ ...entry.door })), triggers: encounterLayout.entrances.map((entry) => ({ ...entry.trigger })), room: { ...encounterLayout.room }, enemyIds: enemies.map((enemy) => enemy.id), activated: false, completed: false });
        encounterLayout.entrances.forEach((entry) => blockingCells.push(entry.door));
        enemies.forEach(add);
      }
    }
    const addCounterPickup = (kind: "key" | "gold", index: number) => {
      const cell = nextCell(); if (!cell) return;
      const amount = kind === "gold" ? Math.round((5 + Math.floor(pickupRandom() * 16)) * balance.rewardMultiplier) : tuning?.supplyQuantity ?? 1;
      add({ id: `${kind}-${index}`, kind, amount, x: cell.x, y: cell.y });
    };
    // Item-test mode places only the approved inventory/world items near the
    // level-one entrance. Other object and enemy distributions remain normal.
    const nearStart = (offsets: readonly Position[]) => offsets.map(({ x, y }) => ({ x: start.x + x, y: start.y + y })).find((cell) => !route.has(`${cell.x},${cell.y}`) && claim(cell));
    const nearStartBlocking = (offsets: readonly Position[]) => offsets.map(({ x, y }) => ({ x: start.x + x, y: start.y + y })).find((cell) => !route.has(`${cell.x},${cell.y}`) && isSolidObjectPlacementCell(generation.cells, cell) && isNonBlockingObjectPlacementCell(generation.cells, cell, blockingCells) && claim(cell));
    // Level-test mode gets one deterministic crate beside the entrance. This
    // augments, rather than replaces, the normal per-room crate distribution.
    if (level1TeleportTestMode) {
      const fixtureCrateCell = nearStartBlocking([{ x: -1, y: 1 }, { x: -1, y: -1 }, { x: 1, y: 1 }, { x: 1, y: -1 }]);
      if (fixtureCrateCell) add({ id: "test-crate", kind: "crate", health: 100, ...fixtureCrateCell });
    }
    if (level1ObjectTestMode) {
      const healthCell = nearStart([{ x: 0, y: 1 }, { x: -1, y: 1 }, { x: 1, y: 1 }, { x: 0, y: 2 }]);
      const manaCell = nearStart([{ x: 2, y: 0 }, { x: 2, y: 1 }, { x: 1, y: 2 }, { x: -1, y: 2 }]);
      const staminaCell = nearStart([{ x: -2, y: 0 }, { x: -2, y: 1 }, { x: -1, y: 2 }, { x: 0, y: 2 }]);
      const starterKey = nearStart([{ x: -2, y: 2 }, { x: -2, y: -2 }, { x: 2, y: 2 }]);
      const starterGold = nearStart([{ x: 2, y: -2 }, { x: 2, y: 2 }, { x: -2, y: -2 }]);
      if (healthCell) add({ id: "health-potion", kind: "potion", resource: "health", ...healthCell });
      if (manaCell) add({ id: "mana-potion", kind: "potion", resource: "mana", ...manaCell });
      if (staminaCell) add({ id: "stamina-potion", kind: "potion", resource: "stamina", ...staminaCell });
      if (starterKey) add({ id: "starter-key", kind: "key", amount: 1, ...starterKey });
      if (starterGold) add({ id: "starter-gold", kind: "gold", amount: 10, ...starterGold });
      // Item-test mode puts one copy of every approved inventory representation
      // in the opening area. The fallback search follows the enemy-test rule:
      // it stays within 50 cells of the player while respecting reservations.
      const nearbyItemCells = Array.from({ length: 101 }, (_, dx) => dx - 50)
        .flatMap((x) => Array.from({ length: 101 }, (_, dy) => ({ x: start.x + x, y: start.y + dy - 50 })))
        .sort((left, right) => (left.x - start.x) ** 2 + (left.y - start.y) ** 2 - ((right.x - start.x) ** 2 + (right.y - start.y) ** 2));
      const testItemCell = (offsets: readonly Position[]) => nearStart(offsets) ?? nearbyItemCells.find((cell) => Math.hypot(cell.x - start.x, cell.y - start.y) <= 50 && !route.has(`${cell.x},${cell.y}`) && claim(cell));
      WORLD_DROPPABLE_ITEM_NAMES.forEach((name, index) => {
        const cell = testItemCell([{ x: index % 4 - 2, y: Math.floor(index / 4) + 3 }]);
        const id = index === 4 ? "test-item" : `test-item-${worldItemId(name)}`;
        if (cell) add({ id, kind: "item", item: worldDroppableItemInstance(name, id), ...cell });
      });
    }
    if (!level1ObjectTestMode) {
      const worldItemCount = Math.max(0, budgetCount(pickupRandom, balance.budgets.worldItems) - (productionStarterPack ? 1 : 0));
      for (let index = 0; index < worldItemCount; index++) {
        const name = selectWorldItemName(level, WORLD_DROPPABLE_ITEM_NAMES, pickupRandom) as WorldDroppableItemName;
        const cell = nextOrdinaryPickupCell();
        if (cell && name) {
          const id = `world-item-${level}-${index + 1}-${worldItemId(name)}`;
          add({ id, kind: "item", item: worldDroppableItemInstance(name, id), ...cell });
        }
      }
    }
    const availableEnemies = enemyDefinitionsForWorldLevel(level);
    const enemyTargetCount = Math.max(1, Math.min(balance.budgets.enemies.max, Math.round(budgetCount(encounterRandom, balance.budgets.enemies) * (tuning?.enemyChance ?? .76))));
    let enemyCount = generation.entities.filter((entity) => entity.kind === "enemy" && entity.encounterId !== undefined).length;
    let chestCount = 0;
    let crateCount = 0;
    const chestTargetCount = budgetCount(rewardRandom, balance.budgets.chests);
    const crateTargetCount = budgetCount(rewardRandom, balance.budgets.crates);
    const placementRoomOrder = Array.from({ length: rooms.length - 1 }, (_, index) => index + 1);
    if (graphLayout) placementRoomOrder.sort((left, right) => Number(graphLayout.topology.rooms[right]!.roles.some(role => role === "arena" || role === "hub")) - Number(graphLayout.topology.rooms[left]!.roles.some(role => role === "arena" || role === "hub")) || left - right);
    for (const i of placementRoomOrder) {
      const room = rooms[i]; const preferred = { x: room.x + 2, y: room.y + 2 };
      if (encounterLayouts.some(({ layout }) => sameRoom(room, layout.room))) continue;
      const enemyCell = !isLevelOneStartArea(preferred) && !route.has(`${preferred.x},${preferred.y}`) && isSolidObjectPlacementCell(generation.cells, preferred) && isNonBlockingObjectPlacementCell(generation.cells, preferred, blockingCells) && claim(preferred) ? preferred : nextEnemyCell();
      if (!level1EnemyTestMode && enemyCount < enemyTargetCount && enemyCell) {
        const definition = availableEnemies[Math.floor(encounterRandom() * availableEnemies.length)] ?? availableEnemies[0];
        const threatScale = tuning?.threatScale ?? 1;
        const enemy = enemyFromDefinition(`enemy-${i}`, definition, enemyCell, level, threatScale, tuning ? tuning.awareness + traitRandom() * .5 - definition.awareness : 0, tuning?.engagementDelay ?? 0);
        add({ ...enemy, resources: enemyResources(enemy, level) });
        enemyCount++;
      }
      if (!level1ObjectTestMode && chestCount < chestTargetCount) {
        const chestCell = nextBlockingCell(["treasure", "dead-end"]); if (chestCell) { add({ id: `chest-${i}`, kind: "chest", x: chestCell.x, y: chestCell.y, opened: false }); chestCount++; }
      }
      if (crateCount < crateTargetCount) {
        const crateCell = nextBlockingCell(["treasure", "dead-end"]); if (crateCell) { add({ id: `crate-${i}`, kind: "crate", x: crateCell.x, y: crateCell.y, health: 100 }); crateCount++; }
      }
    }
    const campfireCount = budgetCount(rewardRandom, balance.budgets.campfires);
    for (let index = 0; index < campfireCount; index++) {
      const cell = nextBlockingCell();
      if (cell) add({ id: `campfire-${index + 1}`, kind: "campfire", name: "CampFire", ...cell });
    }
    if (level1EnemyTestMode) {
      const testEnemy = (id: string, definition: EnemyDefinition, offsets: readonly Position[]) => {
        const cell = nearStartBlocking(offsets) ?? Array.from({ length: 101 }, (_, index) => index - 50)
          .flatMap((x) => Array.from({ length: 101 }, (_, index) => ({ x: start.x + x, y: start.y + index - 50 })))
          .sort((left, right) => Math.max(Math.abs(left.x - start.x), Math.abs(left.y - start.y)) - Math.max(Math.abs(right.x - start.x), Math.abs(right.y - start.y)))
          .find((candidate) => Math.max(Math.abs(candidate.x - start.x), Math.abs(candidate.y - start.y)) <= 50 && !route.has(`${candidate.x},${candidate.y}`) && isSolidObjectPlacementCell(generation.cells, candidate) && isNonBlockingObjectPlacementCell(generation.cells, candidate, blockingCells) && claim(candidate));
        if (!cell) return;
        const enemy = enemyFromDefinition(id, definition, cell, level);
        add({ ...enemy, resources: enemyResources(enemy, level) });
      };
      const testOffsets: readonly (readonly Position[])[] = [
        [{ x: -1, y: 0 }, { x: -1, y: -1 }], [{ x: 0, y: -1 }, { x: 1, y: -1 }], [{ x: 1, y: -2 }, { x: 2, y: -1 }],
        [{ x: -2, y: 1 }, { x: -3, y: 1 }], [{ x: 2, y: 1 }, { x: 3, y: 1 }], [{ x: -2, y: 3 }, { x: -3, y: 3 }],
        [{ x: 2, y: 3 }, { x: 3, y: 3 }], [{ x: 0, y: 4 }, { x: 1, y: 4 }],
      ];
      ENEMY_RANKS.forEach((definition, index) => testEnemy(`test-${definition.character}`, definition, testOffsets[index]));
    }
    // Ordinary content uses bounded floor budgets rather than full-map density.
    const potionOverride = options.pickupDensity && Object.values(options.pickupDensity).every(range => range?.max === 0);
    const potionCount = potionOverride ? 0 : Math.max(0, budgetCount(pickupRandom, balance.budgets.potions) - (productionStarterPack ? 1 : 0));
    const potionKinds: readonly ConsumableResource[] = ['health', 'mana', 'stamina'];
    for (let index = 0; index < potionCount; index++) {
      const cell = nextOrdinaryPickupCell();
      if (cell) add({ id: `${potionKinds[index % potionKinds.length]}-potion-${index + 1}`, kind: "potion", resource: potionKinds[index % potionKinds.length], ...(tuning ? { quantity: tuning.supplyQuantity ?? 1 } : {}), ...cell });
    }
    const keyedDoorCount = objectSets.filter((set): set is FloorTriggerDoorBarrelSet => set.kind === "floor-trigger-door-barrel" && set.requiresKey === true).length;
    const baseKeyCount = budgetCount(pickupRandom, balance.budgets.keys);
    const surplusKeyCount = pickupRandom() < balance.surplusKeyChance ? 1 : 0;
    const keyCount = Math.max(keyedDoorCount, baseKeyCount) + surplusKeyCount;
    for (let index = 0; index < keyCount; index++) addCounterPickup("key", index + 1);
    const goldCount = budgetCount(pickupRandom, balance.budgets.gold);
    for (let index = 0; index < goldCount; index++) addCounterPickup("gold", index + 1);
    if (tuning) {
      const discoveryRandom = worldRandom(seed, 'discoveries');
      const count = Math.floor(tuning.discoveries) + (discoveryRandom() < tuning.discoveries % 1 ? 1 : 0);
      for (let i = 0; i < count; i++) {
        const cell = nextCell();
        if (cell) add({ id: `discovery-${i}`, kind: 'discovery', name: 'Hidden cache', ...cell });
      }
      // Rewards are rolled at generation, and remain fixed even if the world grows.
      let rewardBudget = 200;
      for (const entity of generation.entities) if (entity.kind === 'chest' || entity.kind === 'crate') {
        entity.rewardAmount = Math.min(rewardBudget, Math.max(1, Math.round((2 + rewardRandom() * 4) * tuning.rewardScale)));
        rewardBudget -= entity.rewardAmount;
        entity.rewardQuality = tuning.rewardQuality;
        if (rewardRandom() < tuning.rewardChance) {
          const rewardName = selectWorldItemName(level, WORLD_DROPPABLE_ITEM_NAMES, rewardRandom) as WorldDroppableItemName;
          entity.rewardItem = worldDroppableItemInstance(rewardName, `${entity.id}-reward`);
          if (entity.rewardItem.group !== 'jewels') entity.rewardItem.modifiers = Object.fromEntries(Object.entries(entity.rewardItem.modifiers).map(([name, amount]) => [name, Math.max(1, Math.round(amount! * (1 + tuning.rewardQuality * .15)))]));
        }
      }
    }
    stairs.forEach(add);
    (generation as typeof generation & { objectSets?: ObjectSet[] }).objectSets = objectSets;
    return {};
  } }]);
  const torchCells = shuffledWallDecorationCells(map, hazardRandom);
  const protectedRoute = new Set(world ? structuralRoute(map, start, exit).map(cell => `${cell.x},${cell.y}`) : []);
  const trapCells = shuffledWalkableCells(context.cells, hazardRandom).filter((cell) => !protectedRoute.has(`${cell.x},${cell.y}`) && !context.occupiedCells.some((occupied) => occupied.x === cell.x && occupied.y === cell.y));
  const torchCount = Math.max(3, Math.floor(context.cells.flat().filter((cell) => cell.walkable).length / 180));
  const trapCount = balance.budgets.traps.max;
  const placedTrapCells = trapCells.slice(0, trapCount);
  const decorations: WorldDecoration[] = [
    ...planStartRoomDecoration(context.cells, startRoom).map((decoration) => ({ ...decoration, kind: "start-room-wall" as const, wallMounted: true })),
    ...torchCells.slice(0, torchCount).map((cell, index) => ({ id: `wall-torch-${index + 1}`, kind: "torch" as const, wallMounted: true, ...cell })),
    ...placedTrapCells.map((cell, index) => ({ id: `floor-trap-${index + 1}`, kind: "trap" as const, wallMounted: false, ...cell })),
  ];
  const floor: Floor = { seed, width, height, cells: context.cells, start, startRoom, entities: context.entities, decorations, objectSets: (context as typeof context & { objectSets?: ObjectSet[] }).objectSets ?? [], prefabPlacements, time: 1, level, generatorVersion: GENERATOR_VERSION, generation: { ...context.generation, passes: context.passes } };
  if (world) {
    floor.generatorVersion = WORLD_RULES_VERSION;
    for (const cell of structuralRoute(map, start, exit)) floor.cells[cell.y][cell.x].protected = true;
    floor.generationProfile = { seed, difficulty, attributes: world, generatorVersion: WORLD_RULES_VERSION, tuningVersion: WORLD_GENERATION_TUNING_VERSION, level1TestMode: level1TeleportTestMode, level1ObjectTestMode, level1EnemyTestMode };
    floor.worldDiagnostics = {
      repairs,
      shortfall: Math.max(0, Math.floor(tuning!.discoveries) - floor.entities.filter(e => e.kind === 'discovery').length),
      routeLength: structuralRoute(map, start, exit).length,
      rewardBudget: Math.min(200, floor.entities.reduce((sum, e) => sum + (e.kind === 'chest' || e.kind === 'crate' ? e.rewardAmount ?? 0 : 0), 0)),
      balanceVersion: balance.version,
      contentCounts: {
        potions: floor.entities.filter(e => e.kind === 'potion').length,
        gold: floor.entities.filter(e => e.kind === 'gold').length,
        keys: floor.entities.filter(e => e.kind === 'key').length,
        worldItems: floor.entities.filter(e => e.kind === 'item').length,
        enemies: floor.entities.filter(e => e.kind === 'enemy').length,
        traps: floor.decorations?.filter(e => e.kind === 'trap').length ?? 0,
        chests: floor.entities.filter(e => e.kind === 'chest').length,
        crates: floor.entities.filter(e => e.kind === 'crate').length,
        campfires: floor.entities.filter(e => e.kind === 'campfire').length,
        keyedDoors: keyedDoorCountForFloor(floor),
      },
    };
  }
  if (graphLayout) {
    requireQuality();
    const occupied = floor.entities.map(entity => ({ id: entity.id, x: entity.x, y: entity.y }));
    for (const set of floor.objectSets ?? []) {
      if (set.kind === "floor-trigger-door-barrel") occupied.push({ id: `${set.id}-barrel`, ...set.barrel }, { id: `${set.id}-door`, ...set.door });
    }
    quality = validateDungeonQuality({ ...qualityInput(), entities: occupied });
    if (!quality.valid) throw new Error(`Dungeon generation rejected before activation: ${JSON.stringify(quality.issues)}`);
    const anchor = graphLayout.topology.rooms[graphLayout.topology.exitRoomId]!;
    const exitAttachment = { position: { x: exit.x, y: exit.y }, roomId: anchor.id,
      kind: level === 1 && graphLayout.chamber && samePosition(exit, graphLayout.chamber.goal) ? "sealed-chamber" as const : isLevelOneFixture ? "fixture" as const : "room" as const,
      path: structuralRoute(map, anchor.center, exit).reverse().map(({ x, y }) => ({ x, y })) };
    if (!exitAttachment.path.length) throw new Error("Dungeon exit attachment is disconnected from its graph room.");
    floor.generation = { ...floor.generation!, topology: { ...graphLayout.topology, exitAttachment }, quality, repairs, qualityRepairs };
    floor.generationProfile = { ...(floor.generationProfile ?? { seed, difficulty, generatorVersion: GENERATOR_VERSION }), topologyVersion: DUNGEON_TOPOLOGY_VERSION };
  }
  if (options.portalLayoutVersion !== undefined) floor.generationProfile = { ...(floor.generationProfile ?? { seed, difficulty, generatorVersion: GENERATOR_VERSION }), portalLayoutVersion: options.portalLayoutVersion };
  return normalizeStartRoomMetadata(normalizeObjectSets(ensureSemanticCells(floor)));
}

export function effectiveAttributesFor(base: Attributes, equipment: Equipment): Attributes {
  const seen = new Set<string>(); const mods = Object.values(equipment).flat().filter((item): item is Item => item !== null && !seen.has(item.id) && (seen.add(item.id), true)).reduce<Partial<Attributes>>((all, item) => {
    for (const [key, value] of Object.entries(item.modifiers ?? {}) as [AttributeName, number][]) all[key] = (all[key] ?? 0) + value;
    return all;
  }, {});
  const perception = Math.max(0, Math.min(99, statRank(base, "perception") + Number(mods.perception ?? 0))); const strength = statRank(base, "strength");
  return {
    health: Math.max(1, Number(base.health ?? GAME_TUNING.startingHealth) * 10 + Number(mods.health ?? 0)),
    stamina: Math.max(0, Number(base.stamina ?? GAME_TUNING.startingStamina) * 10 + Number(mods.stamina ?? 0)),
    offense: Math.max(1, Number(base.offense ?? 1) + Number(mods.offense ?? 0)),
    defense: Math.max(0, Number(base.defense ?? GAME_TUNING.innateDefense) + Number(mods.defense ?? 0)),
    mana: Math.max(0, Number(base.mana ?? GAME_TUNING.startingMana) * 10 + Number(mods.mana ?? 0)),
    perception, strength, luck: statRank(base, "luck"), recovery: statRank(base, "recovery"), stealth: statRank(base, "stealth"),
  };
}

export function effectiveAttributes(campaign: Campaign, equipment: Equipment = campaign.player.equipment): Attributes {
  return effectiveAttributesFor(campaign.progression.attributes, equipment);
}

export function resourceState(campaign: Campaign) {
  return playerResourcesFromCampaign(campaign);
}

export function rollStartingAttributes(random = Math.random): Attributes {
  const attributes = Object.fromEntries(progressionStatNames.map((name) => [name, 1])) as Attributes;
  for (let point = 0; point < 20; point++) {
    const choices = progressionStatNames.filter((name) => attributes[name] < 5);
    attributes[choices[Math.floor(random() * choices.length)]]++;
  }
  return attributes;
}
export function createCampaign(seed = seedNow(), difficulty = 1, level = 1, options: { topologyVersion?: string; portalLayoutVersion?: string; level1TestMode?: boolean; level1ObjectTestMode?: boolean; level1EnemyTestMode?: boolean; attributes?: Attributes; worldAttributes?: WorldAttributes; mode?: Campaign["mode"]; worldFamily?: Campaign["worldFamily"] } = {}): Campaign {
  const floor = options.worldFamily === "overworld" ? generateOverworldFloor(level, seed) : generateFloor(level, seed, difficulty, { level1TestMode: options.level1TestMode, level1ObjectTestMode: options.level1ObjectTestMode, level1EnemyTestMode: options.level1EnemyTestMode, worldAttributes: options.worldAttributes, topologyVersion: options.topologyVersion, portalLayoutVersion: options.portalLayoutVersion }); const attributes = options.attributes ? { ...options.attributes } : rollStartingAttributes(rng(seed));
  const family = options.worldFamily ?? "dungeon";
  const campaign: Campaign = { version: 6, mode: options.mode ?? "adventure", world: "One", worldFamily: family, realm: `${family === "overworld" ? "Overworld" : "Underground"} ${floor.level}`, floor, combatRollState: seed >>> 0, generatorVersion: GENERATOR_VERSION, levelStates: {}, floors: { [level]: structuredClone(floor) }, progression: { attributes, level: 1, xp: 0, nextXp: GAME_TUNING.xpThreshold, totalKills: 0, difficulty, attributePoints: 0 }, player: { x: floor.start.x, y: floor.start.y, hasMass: true, heading: "e", resources: createResourcesModel(), equipment: { weapons: [null, null], armor: [null, null], jewels: [null, null] }, inventory: [], inventoryCapacity: ITEM_CAPACITY, abilities: [null, null, null], quickSlots: [null, null], sneaking: false, encumberedDirection: null }, counters: { keys: 0, gold: 0 }, objective: "Find the exit", quest: { id: "my-first-quest", title: "My First Quest", items: [{ id: "walk-through-stairs", title: "Walk through the stairs", complete: false }, { id: "collect-health-potion", title: "Collect a Health Potion", complete: false }, { id: "collect-coin", title: "Collect a coin", complete: false }], activeItemId: "walk-through-stairs" }, log: [] };
  if (options.topologyVersion !== undefined) campaign.topologyVersion = options.topologyVersion;
  if (options.portalLayoutVersion !== undefined) campaign.portalLayoutVersion = options.portalLayoutVersion;
  if (options.worldAttributes) { campaign.worldAttributes = normalizeWorldAttributes(options.worldAttributes); campaign.worldGrowth = []; campaign.worldSchemaVersion = 1; }
  campaign.player.resources = playerResourcesFromCampaign(campaign, { health: effectiveAttributes(campaign).health, stamina: effectiveAttributes(campaign).stamina, mana: effectiveAttributes(campaign).mana });
  revealDiscovery(campaign, campaign.player);
  return campaign;
}



// Diagnostic action context is not serialized or inherited by the next copy.
const enemyLogicDisabledStates = new WeakSet<Campaign>();
function tick(state: Campaign, events: GameEvent[], restTime = false) { countPerformance("ticks"); return measurePerformance("tick (inclusive)", () => { updateEncounterLockdowns(state, events); const previous = state.floor.time; state.floor.time++; state.floor.projectiles = (state.floor.projectiles ?? []).filter((projectile) => projectile.createdAt >= state.floor.time); emit(events, "time.advanced", { previous, current: state.floor.time }, state); if (!restTime) { if (enemyLogicDisabledStates.has(state)) countPerformance("enemy turns suppressed"); else measurePerformance("AI (inclusive)", () => enemyPhase(state, events)); } updateEncounterLockdowns(state, events); }); }
function normalizeResources(state: Campaign, events: GameEvent[], cause: string, previousCaps: Attributes) { const caps = effectiveAttributes(state); for (const key of ["health", "stamina", "mana"] as const) { const prior = state.player.resources[key].current; const oldMax = previousCaps[key]; const ratio = oldMax > 0 ? prior / oldMax : 0; const next = Math.max(0, Math.min(caps[key], ratio * caps[key])); state.player.resources[key] = { current: next, currentMax: caps[key] }; if (prior !== next) emit(events, "resource.changed", { resource: key, previous: prior, current: next, previousMax: oldMax, currentMax: caps[key], cause }, state); } state.player.resources = playerResourcesFromCampaign(state, state.player.resources); }
function changeResource(state: Campaign, events: GameEvent[], key: "health" | "stamina" | "mana", value: number, cause: string) { const cap = effectiveAttributes(state)[key]; const previous = state.player.resources[key].current; const current = Math.max(0, Math.min(cap, value)); state.player.resources[key] = { current, currentMax: cap }; state.player.resources = playerResourcesFromCampaign(state, state.player.resources); if (current !== previous) emit(events, "resource.changed", { resource: key, previous, current, currentMax: cap, cause, ...(key === "health" ? { position: { x: state.player.x, y: state.player.y } } : {}) }, state); }
function applyTrapOnEntry(state: Campaign, events: GameEvent[], elapsedMs: number) {
  const trap = state.floor.decorations?.find((decoration) => decoration.kind === "trap" && decoration.x === state.player.x && decoration.y === state.player.y);
  if (!trap || !trapIsDangerous(trapFrameAt(elapsedMs))) return;
  const damage = trapStrikeDamage(resourceState(state).defense.current);
  changeResource(state, events, "health", state.player.resources.health.current - damage, "trap");
}
function applyActiveTrapStrikes(state: Campaign, events: GameEvent[], elapsedMs: number) {
  if (!trapIsDangerous(trapFrameAt(elapsedMs))) return;
  applyTrapOnEntry(state, events, elapsedMs);
  const defeatedEnemyIds = new Set<string>();
  for (const enemy of state.floor.entities.filter((entity): entity is Enemy => entity.kind === "enemy")) {
    if (!floorTrapAt(state.floor, enemy)) continue;
    const health = enemy.resources.health;
    const previousHealth = health.current;
    const damage = trapStrikeDamage(enemy.resources.defense.current);
    health.current = Math.max(0, health.current - damage);
    enemy.hp = health.current;
    emit(events, "combat.hit", { target: enemy.name, targetId: enemy.id, targetPosition: { x: enemy.x, y: enemy.y }, damage, previousHealth, currentHealth: health.current, source: "trap" }, state);
    if (health.current === 0) defeatedEnemyIds.add(enemy.id);
  }
  if (defeatedEnemyIds.size > 0) state.floor.entities = state.floor.entities.filter((entity) => entity.kind !== "enemy" || !defeatedEnemyIds.has(entity.id));
}
function floorTrapAt(floor: Floor, position: Position) {
  return floor.decorations?.some((decoration) => decoration.kind === "trap" && decoration.x === position.x && decoration.y === position.y) ?? false;
}
function enemyAvoidsTrap(enemy: Enemy, target: Position, time: number) {
  let hash = time;
  for (const value of [enemy.id, `${target.x},${target.y}`]) for (let index = 0; index < value.length; index++) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  return (hash >>> 0 & 1) === 0;
}
function resetPlayerAfterDeath(state: Campaign, events: GameEvent[]) {
  if (state.player.resources.health.current > 0) return;
  if (events.some((event) => event.type === "player.died")) return;
  const fatalHit = [...events].reverse().find((event) => event.type === "combat.hit" && event.facts.targetId === "player");
  emit(events, "player.died", { realm: state.realm, source: fatalHit?.facts.source, sourceName: fatalHit?.facts.sourceName }, state);
}
function gainXp(state: Campaign, events: GameEvent[], amount: number, cause: string) {
  if (amount <= 0 || state.progression.level >= 99) return;
  const previous = state.progression.xp; state.progression.xp += amount;
  emit(events, "xp.gained", { amount, cause, previous, current: state.progression.xp }, state);
  while (state.progression.level < 99 && state.progression.xp >= state.progression.nextXp) {
    state.progression.xp -= state.progression.nextXp; state.progression.level++;
    state.progression.attributePoints += 3;
    if (state.worldAttributes) {
      state.worldGrowth ??= [];
      state.worldGrowth.push({ id: `world-growth-${state.progression.level}`, seed: state.floor.seed, difficulty: state.floor.generationProfile?.difficulty ?? state.progression.difficulty, level: state.progression.level, spent: 0, rulesVersion: WORLD_RULES_VERSION, earningProfile: structuredClone(state.floor.generationProfile), identity: { worldSeed: state.worldSeed ?? state.floor.seed, slot: state.slot ?? 1, run: state.run ?? 1, dungeonLevel: state.floor.level } });
    }
    emit(events, "xp.level.changed", { level: state.progression.level, current: state.progression.xp, threshold: state.progression.nextXp }, state);
  }
  if (state.progression.level >= 99) state.progression.xp = Math.min(state.progression.xp, state.progression.nextXp - 1);
  state.player.resources = playerResourcesFromCampaign(state, state.player.resources);
}
function integerDamage(amount: number) { return Math.max(0, Math.round(amount)); }
function cardinalDistance(from: Position, to: Position) { return Math.abs(from.x - to.x) + Math.abs(from.y - to.y); }
function cardinalDirection(from: Position, to: Position): Direction | null { if (from.x === to.x && from.y !== to.y) return to.y < from.y ? "n" : "s"; if (from.y === to.y && from.x !== to.x) return to.x < from.x ? "w" : "e"; return null; }
function hasClearCardinalLine(floor: Floor, from: Position, to: Position) { const direction = cardinalDirection(from, to); if (!direction) return false; const [dx, dy] = directions[direction]; for (let x = from.x + dx, y = from.y + dy; x !== to.x || y !== to.y; x += dx, y += dy) if (!isWalkable(floor, x, y)) return false; return true; }
function nextCombatRoll(state: Campaign) { const prior = state.combatRollState ?? state.floor.seed; state.combatRollState = (Math.imul(prior >>> 0, 1664525) + 1013904223) >>> 0; return state.combatRollState % 100 + 1; }
function hasPerk(state: Campaign, perk: string) { return uniqueItems(Object.values(state.player.equipment).flat()).some((item) => item.perks?.includes(perk)); }
function incomingDefense(state: Campaign, enemy: Enemy) { const direction = cardinalDirection(state.player, enemy) ?? "n"; const heading = state.player.heading ?? "e"; const side = direction === "n" || direction === "s" ? ["e", "w"] : ["n", "s"]; const multiplier = direction === heading ? 1 : side.includes(heading) ? .7 : .4; return { direction, multiplier, defense: resourceState(state).defense.current * multiplier }; }
function enemyCanAttack(enemy: Enemy, player: Position) {
  const distance = cardinalDistance(enemy, player);
  if (enemy.attackKind === "ranged") return distance <= (enemy.attackRange ?? 1) && cardinalDirection(enemy, player) !== null;
  return cardinalDistance(enemy, player) === 1;
}
function projectileKindForEnemy(enemy: Enemy): "arrow" | "magic" | "web" {
  if (enemy.name === "Skeleton Archer") return "arrow";
  if (enemy.name === "Skeleton Mage") return "magic";
  return "web";
}
function isSplittingSlime(enemy: Enemy) { return enemy.name === "Green Slime" || enemy.name === "Blue Slime"; }
function slimeSplitRandom(state: Campaign, enemy: Enemy, salt: number) {
  let hash = (state.floor.seed ^ Math.imul(state.floor.time + 1, 374761393) ^ salt) >>> 0;
  for (const character of enemy.id) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0;
  hash = Math.imul(hash ^ (enemy.generation ?? 1), 2246822519) >>> 0;
  return hash / 0x1_0000_0000;
}
function slimeSplitChildren(state: Campaign, enemy: Enemy, occupied: Set<string>, canEnter: (enemy: Enemy, position: Position) => boolean) {
  if (!isSplittingSlime(enemy) || cardinalDistance(enemy, state.player) > effectiveAwareness(state, enemy)) return null;
  if (slimeSplitRandom(state, enemy, 0) >= slimeSplitChance(enemy.generation ?? 1)) return null;
  const desiredCount = slimeSplitRandom(state, enemy, 1) < 0.5 ? 1 : 2;
  const candidates = ([{ x: enemy.x - 1, y: enemy.y }, { x: enemy.x + 1, y: enemy.y }, { x: enemy.x, y: enemy.y - 1 }, { x: enemy.x, y: enemy.y + 1 }] as Position[])
    .filter((position) => !occupied.has(`${position.x},${position.y}`) && canEnter(enemy, position));
  if (!candidates.length) return null;
  const generation = (enemy.generation ?? 1) + 1;
  const children: Enemy[] = candidates.slice(0, desiredCount).map((position, index) => ({
    ...enemy,
    id: `slime-split-${enemy.id}-${state.floor.time}-${index}`,
    x: position.x,
    y: position.y,
    hp: enemy.maxHp,
    maxHp: enemy.maxHp,
    generation,
    nextActionAt: state.floor.time + enemy.actionCooldown,
    resources: enemyResources({ ...enemy, hp: enemy.maxHp, maxHp: enemy.maxHp }, state.floor.level),
    ai: { state: "idle", targetId: null },
  }));
  for (const child of children) { state.floor.entities.push(child); occupied.add(`${child.x},${child.y}`); }
  return children;
}
function headingToward(from: Position, to: Position, fallback: Direction) {
  const dx = Math.sign(to.x - from.x); const dy = Math.sign(to.y - from.y);
  return Math.abs(to.x - from.x) >= Math.abs(to.y - from.y) ? headingFromMovement(dx, 0, fallback) : headingFromMovement(0, dy, fallback);
}
function enemyPhase(state: Campaign, events: GameEvent[]) {
  if (state.floor.time === 1) return;
  const player = state.player;
  const enemies = state.floor.entities.filter((entity): entity is Enemy => entity.kind === "enemy");
  countPerformance("enemy visits", enemies.length);
  const canEnter = (enemy: Enemy, position: Position) => !isObjectSetBlocked(state.floor, state.player, position.x, position.y)
    && !(floorTrapAt(state.floor, position) && enemyAvoidsTrap(enemy, position, state.floor.time));
  // Planning reads one snapshot. Index gates and traps once, instead of scanning
  // every decoration/object set for every explored path node of every enemy.
  const key = (position: Position) => position.y * state.floor.width + position.x;
  const blockedObjects = new Set<number>();
  for (const set of state.floor.objectSets ?? []) {
    if (set.kind === "floor-trigger-door-barrel") {
      blockedObjects.add(key(set.barrel));
      if (!isObjectSetDoorOpen(set, player, state.floor.entities)) blockedObjects.add(key(set.door));
    } else if (set.kind === "encounter-lockdown" && !isEncounterLockdownDoorOpen(set)) {
      for (const door of set.doors) blockedObjects.add(key(door));
    }
  }
  const traps = (state.floor.decorations ?? []).filter(decoration => decoration.kind === "trap");
  const trapKeys = new Set(traps.map(key));
  const intents = planEnemyActions({ floor: state.floor, player, time: state.floor.time, enemies, effectiveAwareness: (enemy) => effectiveAwareness(state, enemy), canSee: (enemy, target) => hasPerceptionLineOfSight(state, enemy, target), canAttack: (enemy, target) => enemyCanAttack(enemy, target) && (enemy.attackKind !== "ranged" || hasClearCardinalLine(state.floor, enemy, target)),
    canEnter: (enemy, position) => !blockedObjects.has(key(position)) && !(trapKeys.has(key(position)) && enemyAvoidsTrap(enemy, position, state.floor.time)),
    navigationGroup: enemy => traps.map(trap => enemyAvoidsTrap(enemy, trap, state.floor.time) ? "1" : "0").join(""),
  });
  const occupied = new Set(state.floor.entities.map((entity) => `${entity.x},${entity.y}`));
  const enemiesById = new Map(enemies.map(enemy => [enemy.id, enemy]));
  for (const intent of intents) {
    const enemy = enemiesById.get(intent.enemyId);
    if (!enemy) continue;
    if (intent.kind === "idle") { enemy.ai = { state: "idle", targetId: null }; continue; }
    if (intent.kind === "wait") { enemy.ai = { state: intent.state, targetId: intent.state === "idle" ? null : "player" }; continue; }
    if (intent.kind === "attack") {
      enemy.ai = { state: "attack", targetId: "player" };
      enemy.nextActionAt = state.floor.time + enemy.actionCooldown;
      enemy.heading = headingToward(enemy, player, enemy.heading ?? "e");
      const defense = incomingDefense(state, enemy);
      const parried = hasPerk(state, "Automatic parry");
      const damage = parried ? 0 : Math.max(1, integerDamage(enemy.resources.offense.current - defense.defense));
      if (enemy.attackKind === "ranged") {
        const projectileId = `projectile-${state.floor.time}-${enemy.id}`;
        const projectileKind = projectileKindForEnemy(enemy);
        state.floor.projectiles = [...(state.floor.projectiles ?? []), { id: projectileId, sourceId: enemy.id, from: { x: enemy.x, y: enemy.y }, to: { x: player.x, y: player.y }, direction: defense.direction, createdAt: state.floor.time, kind: projectileKind }];
        emit(events, "projectile.fired", { projectileId, source: enemy.id, from: { x: enemy.x, y: enemy.y }, targetPosition: { x: player.x, y: player.y }, attackDirection: defense.direction, action: projectileKind }, state);
      }
      if (damage > 0) changeResource(state, events, "health", player.resources.health.current - damage, "enemy-attack");
      emit(events, "combat.hit", { target: "Player", targetId: "player", source: enemy.id, sourceName: enemy.name, targetPosition: { x: player.x, y: player.y }, damage, attackDirection: defense.direction, mitigation: defense.multiplier, outcome: parried ? "PARRY" : "HIT" }, state);
      continue;
    }
    if (intent.kind === "blocked") { enemy.ai = { state: "blocked", targetId: "player" }; continue; }
    const splitChildren = slimeSplitChildren(state, enemy, occupied, canEnter);
    if (splitChildren) {
      enemy.ai = { state: "pursue", targetId: "player" };
      enemy.nextActionAt = state.floor.time + enemy.actionCooldown;
      emit(events, "enemy.split", { id: enemy.id, position: { x: enemy.x, y: enemy.y }, childIds: splitChildren.map((child) => child.id), generation: enemy.generation ?? 1 }, state);
      continue;
    }
    const origin = `${enemy.x},${enemy.y}`; const destination = `${intent.to.x},${intent.to.y}`;
    occupied.delete(origin);
    if (occupied.has(destination) || !canEnter(enemy, intent.to)) {
      occupied.add(origin); enemy.ai = { state: "blocked", targetId: "player" }; continue;
    }
    enemy.heading = headingFromMovement(intent.to.x - enemy.x, intent.to.y - enemy.y, enemy.heading ?? "e");
    enemy.x = intent.to.x; enemy.y = intent.to.y; enemy.ai = { state: "pursue", targetId: "player" };
    enemy.nextActionAt = state.floor.time + enemy.actionCooldown; occupied.add(destination);
  }
  resetPlayerAfterDeath(state, events);
}
function sameSerializedValue(left: unknown, right: unknown) { return JSON.stringify(left) === JSON.stringify(right); }

/** Captures only changes from a deterministic base floor. Runtime floors remain complete. */
export function createLevelStateDelta(base: Floor, current: Floor): LevelStateDelta {
  const baseEntities = new Map(base.entities.map((entity) => [entity.id, entity]));
  const currentEntities = new Map(current.entities.map((entity) => [entity.id, entity]));
  const removedGeneratedIds = [...baseEntities.keys()].filter((id) => !currentEntities.has(id)).sort();
  const entityOverrides: Record<string, Entity> = {};
  const spawnedEntities: Entity[] = [];
  for (const entity of current.entities) {
    const generated = baseEntities.get(entity.id);
    if (!generated) spawnedEntities.push(structuredClone(entity));
    else if (!sameSerializedValue(generated, entity)) entityOverrides[entity.id] = structuredClone(entity);
  }
  const baseSets = new Map((base.objectSets ?? []).map((set) => [set.id, set]));
  const objectSetOverrides: Record<string, ObjectSet> = {};
  for (const set of current.objectSets ?? []) if (!sameSerializedValue(baseSets.get(set.id), set)) objectSetOverrides[set.id] = structuredClone(set);
  return { time: current.time, removedGeneratedIds, entityOverrides, spawnedEntities: spawnedEntities.sort((left, right) => left.id.localeCompare(right.id)), objectSetOverrides };
}

export function applyLevelStateDelta(base: Floor, delta: LevelStateDelta | undefined): Floor {
  if (!delta) return structuredClone(base);
  const removed = new Set(delta.removedGeneratedIds);
  const entities = base.entities.filter((entity) => !removed.has(entity.id)).map((entity) => structuredClone(delta.entityOverrides[entity.id] ?? entity));
  entities.push(...delta.spawnedEntities.map((entity) => structuredClone(entity)));
  const objectSets = (base.objectSets ?? []).map((set) => structuredClone(delta.objectSetOverrides[set.id] ?? set));
  return normalizeObjectSets(ensureSemanticCells({ ...structuredClone(base), time: delta.time, entities, objectSets }));
}

type GenerationCampaign = Pick<Campaign, "worldSeed" | "slot" | "run" | "progression" | "worldAttributes" | "floorProfiles" | "topologyVersion" | "portalLayoutVersion" | "worldFamily"> & { floor?: Pick<Floor, "seed"> };
function validateGenerationProfile(profile: FloorGenerationProfile) {
  validateTopologyVersion(profile.topologyVersion);
  validatePortalLayoutVersion(profile.portalLayoutVersion);
  if (![GENERATOR_VERSION, WORLD_RULES_VERSION].includes(profile.generatorVersion) || profile.tuningVersion && ![WORLD_RULES_VERSION, WORLD_GENERATION_TUNING_VERSION].includes(profile.tuningVersion)) throw new Error('Unsupported saved world generator. Saved data was left unchanged.');
}
function generationProfileForCampaign(campaign: GenerationCampaign, level: number) {
  validateTopologyVersion(campaign.topologyVersion);
  validatePortalLayoutVersion(campaign.portalLayoutVersion);
  const profile = campaign.floorProfiles?.[String(level)] ?? {
    seed: worldFloorSeed(campaign.worldSeed ?? campaign.floor?.seed ?? 0, campaign.slot ?? 1, campaign.run ?? 1, level),
    difficulty: Math.max(campaign.progression.difficulty ?? 1, level),
    attributes: campaign.worldAttributes ? { ...campaign.worldAttributes } : undefined,
    generatorVersion: campaign.worldAttributes ? WORLD_RULES_VERSION : GENERATOR_VERSION,
    tuningVersion: campaign.worldAttributes ? WORLD_RULES_VERSION : undefined,
    ...(campaign.topologyVersion !== undefined ? { topologyVersion: campaign.topologyVersion } : {}),
    ...(campaign.portalLayoutVersion !== undefined ? { portalLayoutVersion: campaign.portalLayoutVersion } : {}),
  };
  validateGenerationProfile(profile);
  campaign.floorProfiles ??= {};
  campaign.floorProfiles[String(level)] ??= structuredClone(profile);
  return profile;
}
export function generatedFloorForCampaign(campaign: GenerationCampaign, level: number) {
  const profile = generationProfileForCampaign(campaign, level);
  countPerformance("generated baseline floors");
  const floor = campaign.worldFamily === "overworld" ? generateOverworldFloor(level, profile.seed) : generateFloor(level, profile.seed, profile.difficulty, { worldAttributes: profile.attributes, level1TestMode: profile.level1TestMode, level1ObjectTestMode: profile.level1ObjectTestMode, level1EnemyTestMode: profile.level1EnemyTestMode, topologyVersion: profile.topologyVersion, portalLayoutVersion: profile.portalLayoutVersion });
  floor.generationProfile = structuredClone(profile);
  return floor;
}

/** Check saved generator metadata without reconstructing any terrain. */
export function validateCampaignGeneration(campaign: Pick<Campaign, "worldSchemaVersion" | "generatorVersion" | "worldGrowth" | "floorProfiles" | "topologyVersion" | "portalLayoutVersion">) {
  validateTopologyVersion(campaign.topologyVersion);
  validatePortalLayoutVersion(campaign.portalLayoutVersion);
  if (campaign.worldSchemaVersion && campaign.worldSchemaVersion !== 1) throw new Error('Unsupported world save version.');
  if (campaign.generatorVersion && ![GENERATOR_VERSION, WORLD_RULES_VERSION].includes(campaign.generatorVersion)) throw new Error('Unsupported saved world generator.');
  if (campaign.worldGrowth?.some(event => event.rulesVersion && event.rulesVersion !== WORLD_RULES_VERSION)) throw new Error('Unsupported world growth rules.');
  for (const profile of Object.values(campaign.floorProfiles ?? {})) validateGenerationProfile(profile);
}

// Save-only baselines never escape as playable floors. A full serialized profile
// includes future fields such as topologyVersion, not just today's seed/flags.
const saveBaselines = new Map<string, Floor>();
const MAX_SAVE_BASELINES = 8;
function baselineForSave(campaign: GenerationCampaign, level: number) {
  const profile = generationProfileForCampaign(campaign, level);
  const key = JSON.stringify([level, profile], (_name, value: unknown) => value && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))) : value);
  const cached = saveBaselines.get(key);
  if (cached) {
    saveBaselines.delete(key); saveBaselines.set(key, cached);
    countPerformance("save baseline cache hits");
    return cached;
  }
  const floor = measurePerformance("save baseline generation", () => generatedFloorForCampaign(campaign, level));
  saveBaselines.set(key, floor);
  if (saveBaselines.size > MAX_SAVE_BASELINES) saveBaselines.delete(saveBaselines.keys().next().value!);
  return floor;
}

/** Pay cold baseline work during saved-game startup, before accepting input. */
export function prepareCampaignSave(campaign: Campaign) {
  normalizeCampaignRecovery(campaign);
  const warm = (state: Campaign) => {
    if (state.activePrefab?.id !== "player-home") baselineForSave(state, state.floor.level ?? state.floor.depth ?? 1);
    if (state.adventureBaseline) warm(state.adventureBaseline);
    if (state.journeyCheckpoint) warm(state.journeyCheckpoint);
  };
  warm(campaign);
}

/** Pin legacy bases before assigning a neutral profile for future growth. */
export function initializeWorldCampaign(campaign: Campaign) {
  validateCampaignGeneration(campaign);
  if (!campaign.worldAttributes) {
    campaign.floorProfiles ??= {};
    const active = campaign.floor.level ?? 1;
    for (const level of new Set([active, ...Object.keys(campaign.levelStates ?? {}).map(Number)])) {
      campaign.floorProfiles[String(level)] ??= { seed: worldFloorSeed(campaign.worldSeed ?? campaign.floor.seed, campaign.slot ?? 1, campaign.run ?? 1, level), difficulty: Math.max(campaign.progression.difficulty ?? 1, level), generatorVersion: GENERATOR_VERSION };
    }
    campaign.worldAttributes = { ...DEFAULT_WORLD_ATTRIBUTES };
    campaign.worldGrowth = [];
    campaign.worldLegacyPoints = campaign.progression.attributePoints;
  }
  campaign.worldAttributes = normalizeWorldAttributes(campaign.worldAttributes);
  campaign.worldSchemaVersion = 1;
  return campaign;
}

export function rebuildCampaignFloor(campaign: Campaign, level: number) {
  return applyLevelStateDelta(generatedFloorForCampaign(campaign, level), campaign.levelStates?.[String(level)]);
}

/** Produces a JSON-safe campaign record without a generated terrain grid. */
export function compactCampaignForSave(campaign: Campaign): Campaign {
  assertCampaignPortalLayoutsResolved(campaign);
  const copy = copyCampaignMutableState(campaign);
  const adventureBaseline = copy.adventureBaseline ? recoverySnapshot(copy.adventureBaseline) : undefined;
  const journeyCheckpoint = copy.journeyCheckpoint ? recoverySnapshot(copy.journeyCheckpoint) : undefined;
  delete copy.adventureBaseline;
  delete copy.journeyCheckpoint;
  if (copy.activePrefab?.id === "player-home") {
    copy.version = 6;
    copy.floors = undefined;
    if (adventureBaseline) copy.adventureBaseline = compactCampaignForSave(adventureBaseline);
    if (journeyCheckpoint) copy.journeyCheckpoint = compactCampaignForSave(journeyCheckpoint);
    return copy;
  }
  const level = copy.floor.level ?? copy.floor.depth ?? 1;
  const base = baselineForSave(copy, level);
  copy.levelStates = { ...(copy.levelStates ?? {}), [String(level)]: createLevelStateDelta(base, copy.floor) };
  copy.generatorVersion = campaign.generatorVersion ?? GENERATOR_VERSION;
  copy.version = 6;
  copy.floors = undefined;
  copy.floor = { seed: base.seed, width: base.width, height: base.height, cells: [], start: { ...base.start }, entities: [], time: copy.floor.time, level, generatorVersion: base.generatorVersion, generationProfile: structuredClone(base.generationProfile) };
  if (adventureBaseline) copy.adventureBaseline = compactCampaignForSave(adventureBaseline);
  if (journeyCheckpoint) copy.journeyCheckpoint = compactCampaignForSave(journeyCheckpoint);
  return copy;
}

export function restoreCompactCampaign(campaign: Campaign) {
  assertCampaignPortalLayoutsResolved(campaign);
  const level = campaign.floor.level ?? campaign.floor.depth ?? 1;
  campaign.floor = rebuildCampaignFloor(campaign, level);
  campaign.realm = campaign.realm || `Underground ${level}`;
  if (campaign.adventureBaseline?.floor.cells.length === 0) campaign.adventureBaseline = restoreCompactCampaign(campaign.adventureBaseline);
  if (campaign.journeyCheckpoint?.floor.cells.length === 0) campaign.journeyCheckpoint = restoreCompactCampaign(campaign.journeyCheckpoint);
  return upgradeCampaignResources(campaign);
}

export function createRunCampaign(worldSeed: number, slot: number, run: number, difficulty = 1, level = 1, options: { topologyVersion?: string; portalLayoutVersion?: string; level1TestMode?: boolean; level1ObjectTestMode?: boolean; level1EnemyTestMode?: boolean; attributes?: Attributes; worldAttributes?: WorldAttributes; mode?: Campaign["mode"]; worldFamily?: Campaign["worldFamily"] } = {}) {
  const topologyVersion = options.topologyVersion ?? DUNGEON_TOPOLOGY_VERSION;
  const portalLayoutVersion = options.portalLayoutVersion ?? PORTAL_LAYOUT_VERSION;
  const campaign = createCampaign(worldFloorSeed(worldSeed, slot, run, level), difficulty, level, { ...options, topologyVersion, portalLayoutVersion });
  campaign.worldSeed = worldSeed >>> 0;
  campaign.worldFamily = options.worldFamily ?? "dungeon";
  campaign.slot = slot;
  campaign.run = run;
  campaign.generatorVersion = GENERATOR_VERSION;
  if (options.worldAttributes) {
    const profile: FloorGenerationProfile = { seed: campaign.floor.seed, difficulty, attributes: { ...campaign.worldAttributes! }, generatorVersion: WORLD_RULES_VERSION, tuningVersion: WORLD_GENERATION_TUNING_VERSION, topologyVersion, portalLayoutVersion, level1TestMode: options.level1TestMode === true, level1ObjectTestMode: options.level1ObjectTestMode === true, level1EnemyTestMode: options.level1EnemyTestMode === true };
    campaign.generatorVersion = WORLD_RULES_VERSION;
    campaign.floorProfiles = { [String(level)]: profile };
    campaign.floor.generationProfile = structuredClone(profile);
  }
  campaign.floorProfiles ??= {};
  campaign.floorProfiles[String(level)] ??= { seed: campaign.floor.seed, difficulty, generatorVersion: GENERATOR_VERSION, topologyVersion, portalLayoutVersion };
  campaign.floors = undefined;
  campaign.discovery = {};
  revealDiscovery(campaign, campaign.player);
  return campaign;
}
function recoverySnapshot(campaign: Campaign) { const snapshot = copyCampaignMutableState(campaign); delete snapshot.adventureBaseline; delete snapshot.journeyCheckpoint; return snapshot; }
function isRecoverySnapshot(value: unknown): value is Campaign {
  return typeof value === "object" && value !== null
    && typeof (value as Campaign).floor === "object"
    && typeof (value as Campaign).player === "object"
    && typeof (value as Campaign).progression === "object";
}
export function createAdventureLevelBaseline(campaign: Campaign) {
  const level = campaign.floor.level ?? campaign.floor.depth ?? 1;
  const profile = campaign.floorProfiles?.[String(level)] ?? campaign.floor.generationProfile;
  const baseline = createRunCampaign(campaign.worldSeed ?? campaign.floor.seed, campaign.slot ?? 1, campaign.run ?? 1, campaign.progression.difficulty ?? level, level, { worldAttributes: campaign.worldAttributes, mode: campaign.mode, worldFamily: campaign.worldFamily, topologyVersion: profile ? profile.topologyVersion ?? LEGACY_DUNGEON_TOPOLOGY_VERSION : campaign.topologyVersion ?? LEGACY_DUNGEON_TOPOLOGY_VERSION, portalLayoutVersion: profile ? profile.portalLayoutVersion ?? LEGACY_PORTAL_LAYOUT_VERSION : campaign.portalLayoutVersion ?? LEGACY_PORTAL_LAYOUT_VERSION });
  baseline.world = campaign.world;
  baseline.worldGrowth = structuredClone(campaign.worldGrowth);
  baseline.worldLegacyPoints = campaign.worldLegacyPoints;
  baseline.floor.time = 0;
  baseline.discovery = {};
  return recoverySnapshot(baseline);
}
export function normalizeCampaignRecovery(campaign: Campaign) {
  campaign.version = 6;
  if (!(["classic", "adventure", "journey"] as const).includes(campaign.mode ?? "adventure")) campaign.mode = "adventure";
  campaign.mode ??= "adventure";
  normalizeDiscovery(campaign);
  if (campaign.adventureBaseline && !isRecoverySnapshot(campaign.adventureBaseline)) delete campaign.adventureBaseline;
  if (campaign.mode === "adventure" && (!campaign.adventureBaseline || campaign.adventureBaseline.floor.level !== campaign.floor.level)) campaign.adventureBaseline = createAdventureLevelBaseline(campaign);
  if (campaign.journeyCheckpoint && !isRecoverySnapshot(campaign.journeyCheckpoint)) delete campaign.journeyCheckpoint;
  if (campaign.adventureBaseline) {
    campaign.adventureBaseline = recoverySnapshot(campaign.adventureBaseline);
    campaign.adventureBaseline.mode = campaign.mode;
    campaign.adventureBaseline.discovery = {};
  }
  if (campaign.journeyCheckpoint) campaign.journeyCheckpoint = normalizeDiscovery(recoverySnapshot(campaign.journeyCheckpoint));
  return campaign;
}
export function prepareJourneyCheckpoint(campaign: Campaign) { return recoverySnapshot(campaign); }
export function buildDeathRecovery(campaign: Campaign): Campaign | null {
  if (campaign.mode === "classic") return null;
  const restoreSnapshot = (snapshot: Campaign) => {
    const copy = structuredClone(snapshot);
    return copy.floor.cells.length === 0 ? restoreCompactCampaign(copy) : copy;
  };
  if (campaign.mode === "journey" && campaign.journeyCheckpoint) return restoreSnapshot(campaign.journeyCheckpoint);
  const baseline = campaign.adventureBaseline?.floor.level === campaign.floor.level ? restoreSnapshot(campaign.adventureBaseline) : createAdventureLevelBaseline(campaign);
  baseline.mode = campaign.mode;
  baseline.progression = structuredClone(campaign.progression);
  baseline.worldGrowth = structuredClone(campaign.worldGrowth);
  baseline.worldLegacyPoints = campaign.worldLegacyPoints;
  baseline.worldAttributes = structuredClone(campaign.worldAttributes);
  baseline.discovery = {};
  baseline.adventureBaseline = createAdventureLevelBaseline(baseline);
  revealDiscovery(baseline, baseline.player);
  return baseline;
}
function orderedInventory(inventory: Item[]) { return [...inventory].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)); }
function occupiedIndexes(slots: (Item | null)[], item: Item) { return slots.flatMap((entry, index) => entry?.id === item.id ? [index] : []); }
function targetIndexes(slots: (Item | null)[], item: Item, index: number) {
  if (item.slotSpan === 2) return [0, 1];
  const target = slots[index];
  return target?.slotSpan === 2 ? [index, ...occupiedIndexes(slots, target).filter((occupied) => occupied !== index)] : [index];
}
function uniqueItems(items: (Item | null | undefined)[]) { const seen = new Set<string>(); return items.filter((item): item is Item => { if (!item || seen.has(item.id)) return false; seen.add(item.id); return true; }); }
function applyEquipmentItem(slots: (Item | null)[], item: Item, indexes: number[]) {
  for (const target of indexes) slots[target] = null;
  if (item.slotSpan === 2) { slots[0] = item; slots[1] = item; }
  else slots[indexes[0]!] = item;
}
export function projectEquipmentSwap(campaign: Campaign, itemId: string, group: EquipmentGroup, index: number) {
  if (!campaign.player.equipment[group] || !Number.isInteger(index) || index < 0 || index > 1) return null;
  const projected = copyCampaignMutableState(campaign);
  const itemIndex = projected.player.inventory.findIndex((item) => item.id === itemId);
  const item = projected.player.inventory[itemIndex];
  if (!item || item.category === "consumable" || item.group !== group) return null;
  const slots = projected.player.equipment[group];
  const indexes = targetIndexes(slots, item, index);
  const displaced = uniqueItems(indexes.map((target) => slots[target]));
  const projectedInventory = [...projected.player.inventory.slice(0, itemIndex), ...projected.player.inventory.slice(itemIndex + 1), ...displaced];
  if (!inventoryFitsCapacity(projected, projectedInventory)) return null;
  projected.player.inventory.splice(itemIndex, 1);
  applyEquipmentItem(slots, item, indexes);
  projected.player.inventory = orderedInventory([...projected.player.inventory, ...displaced]);
  return { campaign: projected, item, indexes, displaced };
}
export function hasAssignedWeapon(campaign: Campaign) { return uniqueItems(campaign.player.equipment.weapons).length > 0; }
function attack(state: Campaign, events: GameEvent[], enemy: Enemy) {
  if (!hasAssignedWeapon(state)) return;
  const weapon = uniqueItems(state.player.equipment.weapons).find((item) => Number.isFinite(item.hitChance)) ?? null;
  const hitChance = Math.min(100, Math.max(0, (weapon?.hitChance ?? 100) + effectiveAttributes(state).luck));
  const critChance = Math.min(hitChance, Math.max(0, weapon?.critChance ?? 0));
  const roll = nextCombatRoll(state); const outcome = roll <= critChance ? "CRIT" : roll <= hitChance ? "HIT" : "MISS";
  const normalDamage = Math.max(1, integerDamage(resourceState(state).offense.current));
  const damage = outcome === "CRIT" ? Math.ceil(normalDamage * 1.5) : outcome === "HIT" ? normalDamage : 0;
  const health = enemy.resources.health; const before = health.current; health.current = Math.max(0, health.current - damage); enemy.hp = health.current;
  emit(events, "combat.hit", { target: enemy.name, targetId: enemy.id, source: "player", sourceName: "You", targetPosition: { x: enemy.x, y: enemy.y }, damage, previousHealth: before, currentHealth: health.current, hitChance, critChance, outcome, roll }, state);
  changeResource(state, events, "stamina", state.player.resources.stamina.current - ATTACK_STAMINA_COST, "attack"); gainXp(state, events, GAME_TUNING.xpPerAttack, "attack");
  if (health.current <= 0) { state.floor.entities = state.floor.entities.filter((entry) => entry.id !== enemy.id); state.progression.totalKills++; gainXp(state, events, enemy.resources.xp.current, "kill"); emit(events, "enemy.defeated", { name: enemy.name, xp: enemy.resources.xp.current }, state); }
}
const chestCoinOffsets: readonly Position[] = [{ x: 0, y: -1 }, { x: 1, y: -1 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }, { x: -1, y: 1 }, { x: -1, y: 0 }, { x: -1, y: -1 }];
function releaseContainerGold(state: Campaign, container: Extract<Entity, { kind: 'chest' | 'crate' }>) {
  const cells = chestCoinOffsets.map(offset => ({ x: container.x + offset.x, y: container.y + offset.y }))
    .filter(cell => isWalkable(state.floor, cell.x, cell.y) && !isObjectSetBlocked(state.floor, state.player, cell.x, cell.y) && !samePosition(cell, state.player) && !entityAt(state.floor.entities, cell.x, cell.y)).slice(0, 3);
  const total = container.rewardAmount ?? cells.length;
  const count = Math.min(cells.length, total);
  for (let index = 0; index < count; index++) {
    const amount = Math.floor(total / count) + (index < total % count ? 1 : 0);
    state.floor.entities.push({ id: `${container.kind}-gold-${container.id}-${index + 1}`, kind: 'gold', amount, ...cells[index] });
  }
  return count;
}
function releaseWorldReward(state: Campaign, container: Extract<Entity, { kind: 'chest' | 'crate' }>) {
  if (!container.rewardItem) return;
  const cell = chestCoinOffsets.map(offset => ({ x: container.x + offset.x, y: container.y + offset.y })).find(cell => isWalkable(state.floor, cell.x, cell.y) && !isObjectSetBlocked(state.floor, state.player, cell.x, cell.y) && !entityAt(state.floor.entities, cell.x, cell.y) && !samePosition(cell, state.player));
  if (cell) {
    const item = structuredClone(container.rewardItem);
    const luckBonus = lootTier(state);
    if (item.group !== 'jewels') for (const name of Object.keys(item.modifiers) as AttributeName[]) item.modifiers[name] = (item.modifiers[name] ?? 0) + luckBonus;
    state.floor.entities.push({ id: `${container.id}-equipment`, kind: 'item', item, ...cell });
  }
}
function openChest(state: Campaign, events: GameEvent[], chest: Extract<Entity, { kind: "chest" }>) {
  chest.opened = true;
  const coinsCreated = releaseContainerGold(state, chest);
  emit(events, "chest.opened", { id: chest.id, position: { x: chest.x, y: chest.y }, item: "Gold", amount: coinsCreated, lootTier: lootTier(state) }, state);
  gainXp(state, events, GAME_TUNING.xpPerContainer, "chest");
  releaseWorldReward(state, chest);
}
function openCrate(state: Campaign, events: GameEvent[], crate: Extract<Entity, { kind: "crate" }>) {
  crate.opened = true;
  crate.openFrame = ((state.floor.seed ^ (crate.x * 73856093) ^ (crate.y * 19349663)) >>> 0) % 2 === 0 ? 1 : 5;
  const coinsCreated = releaseContainerGold(state, crate);
  emit(events, "crate.opened", { id: crate.id, position: { x: crate.x, y: crate.y }, item: "Gold", amount: coinsCreated, lootTier: lootTier(state) }, state);
  gainXp(state, events, GAME_TUNING.xpPerContainer, "crate");
  releaseWorldReward(state, crate);
}

export const BATTLE_SIGHT_GRACE_MS = 750;
// Session-only state: reloading cannot resurrect an encounter behind a wall.
const battleSightGrace = new WeakMap<Campaign, number>();

export function battleGraceRemainingMs(campaign: Campaign, now = Date.now()): number {
  const deadline = battleSightGrace.get(campaign) ?? 0;
  return campaign.floor.entities.some(enemy => enemy.kind === "enemy" && isBattleThreat(campaign, enemy))
    ? Math.max(0, deadline - now) : 0;
}

export function gameMode(campaign: Campaign, now = Date.now()): "General" | "Battle" {
  const visibleThreat = campaign.floor.entities.some(enemy => enemy.kind === "enemy" && isBattleThreat(campaign, enemy) && hasPerceptionLineOfSight(campaign, campaign.player, enemy));
  return visibleThreat || battleGraceRemainingMs(campaign, now) > 0 ? "Battle" : "General";
}

export function isBattleThreat(campaign: Campaign, enemy: Enemy): boolean {
  const range = Math.max(effectiveAwareness(campaign, enemy), 1, 2 * effectiveAttributes(campaign).perception);
  return enemy.hp > 0 && Math.max(Math.abs(enemy.x - campaign.player.x), Math.abs(enemy.y - campaign.player.y)) <= range;
}

/** Temporary diagnostic movement. No turns, interactions, hazards or rewards. */
export function applyFrozenMovement(campaign: Campaign, action: Action, normalizeStatic = true): ActionResult {
  const reject = (): ActionResult => ({ state: campaign, events: [{ type: "action.rejected", facts: { reason: "Simulation frozen: movement only" }, gameTime: campaign.floor.time, sequence: 1 }], accepted: false, ticks: 0 });
  const origin = campaign.player.pixel ?? cellCenter(campaign.player);
  let target: Position;
  if (action.type === "move-pixels") target = action.to;
  else if (action.type === "center-player") target = cellCenter(campaign.player);
  else if (action.type === "move") { const offset = directions[action.direction as Direction]; if (!offset) return reject(); target = { x: origin.x + offset[0] * 32, y: origin.y + offset[1] * 32 }; }
  else return reject();
  if (![target.x, target.y].every(Number.isSafeInteger)) return reject();
  const steps = Math.max(Math.abs(target.x - origin.x), Math.abs(target.y - origin.y));
  if (steps > 4096) return reject();
  const blocked = (x: number, y: number) => !isWalkable(campaign.floor, x, y)
    || isObjectSetBlocked(campaign.floor, campaign.player, x, y)
    || campaign.floor.entities.some(e => e.x === x && e.y === y && ["enemy", "campfire", "chest", "crate", "stairs", "teleport-arrow"].includes(e.kind));
  let pixel = origin;
  for (let step = 1; step <= steps; step++) {
    const next = { x: origin.x + Math.round((target.x - origin.x) * step / steps), y: origin.y + Math.round((target.y - origin.y) * step / steps) };
    const a = occupiedCell(pixel), b = occupiedCell(next);
    if (blocked(b.x, b.y) || (a.x !== b.x && a.y !== b.y && (blocked(a.x, b.y) || blocked(b.x, a.y)))) break;
    pixel = next;
  }
  if (pixel.x === origin.x && pixel.y === origin.y) return reject();
  const cell = occupiedCell(pixel);
  const fast = action.type === "move-pixels" && campaign.player.pixel && gameMode(campaign) === "General"
    && cell.x === campaign.player.x && cell.y === campaign.player.y && !centerCrossings(origin, pixel).length;
  const state = fast ? { ...campaign } : cloneActionCampaign(campaign, normalizeStatic);
  state.player = { ...state.player, ...cell, pixel, heading: pixel.x < origin.x ? "w" : pixel.x > origin.x ? "e" : pixel.y < origin.y ? "n" : "s" };
  return { state, events: [], accepted: true, ticks: 0 };
}

function cloneActionCampaign(campaign: Campaign, normalizeStatic = true) {
  return measurePerformance("clone/upgrade (inclusive)", () => upgradeCampaignResources(copyCampaignMutableState(campaign), { normalizeStatic }));
}

export function applyAction(campaign: Campaign, action: Action, options: { freeEntry?: boolean; staticWorldReady?: boolean; enemyLogicDisabled?: boolean } = {}): ActionResult {
  const result = applyDomainAction(campaign, action, options);
  if (result.accepted) {
    const next = result.state;
    const sameFloor = next.floor.seed === campaign.floor.seed && next.floor.level === campaign.floor.level
      && next.realm === campaign.realm && next.activePrefab?.id === campaign.activePrefab?.id;
    const now = Date.now();
    const visibleBefore = campaign.floor.entities.some(enemy => enemy.kind === "enemy" && isBattleThreat(campaign, enemy) && hasPerceptionLineOfSight(campaign, campaign.player, enemy));
    const visibleAfter = next.floor.entities.some(enemy => enemy.kind === "enemy" && isBattleThreat(next, enemy) && hasPerceptionLineOfSight(next, next.player, enemy));
    if (sameFloor && !visibleAfter && gameMode(campaign, now) === "Battle") {
      const deadline = visibleBefore ? now + BATTLE_SIGHT_GRACE_MS : battleSightGrace.get(campaign);
      if (deadline) battleSightGrace.set(next, deadline);
    } else battleSightGrace.delete(next);
  }
  if (result.accepted && !options.freeEntry) {
    normalizePlayerPosition(result.state.player);
    if (gameMode(result.state) === "Battle") result.state.player.pixel = cellCenter(result.state.player);
  }
  return result;
}

function applyDomainAction(campaign: Campaign, action: Action, options: { freeEntry?: boolean; staticWorldReady?: boolean; enemyLogicDisabled?: boolean }): ActionResult {
  // Most free-motion frames stay inside one cell and cross no center line.
  // Copy only the player in that case; terrain and navigation are unchanged.
  if (action.type === "move-pixels" && campaign.player.pixel && [action.to.x, action.to.y].every(Number.isSafeInteger) && gameMode(campaign) === "General") {
    const cell = occupiedCell(action.to); const origin = campaign.player.pixel;
    if (cell.x === campaign.player.x && cell.y === campaign.player.y && !centerCrossings(origin, action.to).length && (origin.x !== action.to.x || origin.y !== action.to.y)) {
      return { state: { ...campaign, player: { ...campaign.player, pixel: { ...action.to } } }, events: [], accepted: true, ticks: 0 };
    }
  }
  const state = cloneActionCampaign(campaign, !options.staticWorldReady);
  if (options.enemyLogicDisabled) enemyLogicDisabledStates.add(state);
  const events: GameEvent[] = []; const reject = (reason: string, facts: EventFacts = {}, type = "action.rejected"): ActionResult => ({ state: campaign, events: [{ type, facts: { reason, actionType: action.type, ...facts, ...(type === "item.drop.rejected" ? { outcome: "rejected" } : {}) }, gameTime: campaign.floor.time, sequence: 1 }], accepted: false, ticks: 0 });
  if (action.type === "center-player") {
    state.player.pixel = cellCenter(state.player);
    return { state, events, accepted: true, ticks: 0 };
  }
  if (action.type === "drop-item") {
    const source = action.source;
    let item: Item | null = null;
    if (source.kind === "inventory") {
      const index = state.player.inventory.findIndex((entry) => entry.id === source.itemId);
      if (index >= 0) item = structuredClone(state.player.inventory[index]);
      if (!item) return reject("empty-inventory-item", { source, itemId: source.itemId }, "item.drop.rejected");
      state.player.inventory.splice(index, 1);
    } else if (source.kind === "slot") {
      const itemAtSlot = state.player.equipment[source.group]?.[source.index];
      if (!itemAtSlot) return reject("empty-equipment-slot", { source, group: source.group, index: source.index }, "item.drop.rejected");
      item = structuredClone(itemAtSlot);
      for (const slotIndex of occupiedIndexes(state.player.equipment[source.group], itemAtSlot)) state.player.equipment[source.group][slotIndex] = null;
    } else if (source.kind === "quick-slot") {
      const quickSlot = state.player.quickSlots?.[source.index];
      if (!quickSlot) return reject("empty-quick-slot", { source, index: source.index }, "item.drop.rejected");
      item = { ...structuredClone(quickSlot.item), quantity: quickSlot.quantity };
      state.player.quickSlots![source.index] = null;
    } else {
      const abilityId = state.player.abilities[source.index];
      if (!abilityId) return reject("empty-ability-slot", { source, index: source.index }, "item.drop.rejected");
      item = abilityItemInstance(abilityId, `ability-${abilityId}-${source.index}`);
      state.player.abilities[source.index] = null;
    }
    const overflow: Item[] = [];
    if (item.category === "capacity") {
      const random = rng((state.floor.seed ^ state.floor.time ^ item.id.length * 2654435761) >>> 0);
      while (!inventoryFitsCapacity(state, state.player.inventory)) {
        const candidates = state.player.inventory.filter((entry) => entry.category !== "capacity");
        const fallback = candidates.length ? candidates : state.player.inventory;
        if (!fallback.length) return reject("inventory-capacity-overflow", { source, itemId: item.id, name: item.name }, "item.drop.rejected");
        const selected = fallback[Math.floor(random() * fallback.length)]!;
        const index = state.player.inventory.findIndex((entry) => entry.id === selected.id);
        if (index < 0) return reject("inventory-capacity-overflow", { source, itemId: item.id, name: item.name }, "item.drop.rejected");
        overflow.push(structuredClone(selected));
        state.player.inventory.splice(index, 1);
      }
    }
    const droppedItems = [item, ...overflow];
    const positions: Position[] = [];
    const expandDropSearch = item.category === "capacity" && overflow.length > 0;
    for (const droppedItem of droppedItems) {
      const position = dropPosition(state, positions, expandDropSearch);
      if (!position) return reject("no-valid-drop-cell", { source, itemId: droppedItem.id, name: droppedItem.name }, "item.drop.rejected");
      positions.push(position);
    }
    droppedItems.forEach((droppedItem, index) => {
      const position = positions[index]!;
      const entity = { id: uniqueEntityId(state, droppedItem), kind: "item" as const, x: position.x, y: position.y, item: normalizeItem(droppedItem) };
      state.floor.entities.push(entity);
      emit(events, "item.dropped", { itemId: droppedItem.id, name: droppedItem.name, quantity: droppedItem.quantity ?? 1, source: index === 0 ? source : { kind: "inventory", itemId: droppedItem.id }, destination: position, position, outcome: "dropped", ...(index > 0 ? { cause: "capacity-overflow" } : {}) }, state);
    });
    tick(state, events);
    return { state, events, accepted: true, ticks: 1 };
  }
  if (action.type === "move-pixels") {
    if (gameMode(state) === "Battle") return reject("battle-requires-grid-step");
    if (![action.to.x, action.to.y].every(Number.isSafeInteger)) return reject("invalid-pixel-position");
    const origin = state.player.pixel!; const dx = action.to.x - origin.x; const dy = action.to.y - origin.y;
    const steps = Math.max(Math.abs(dx), Math.abs(dy));
    if (!steps || steps > 4096) return reject("invalid-pixel-distance");
    let current = state; let ticks = 0; let moved = false;
    const floorKey = `${state.floor.seed}:${state.floor.level}:${state.run}`;
    for (let step = 1; step <= steps; step++) {
      const pixel = { x: origin.x + Math.round(dx * step / steps), y: origin.y + Math.round(dy * step / steps) };
      const previousPixel = current.player.pixel!; const cell = occupiedCell(pixel);
      const cx = cell.x - current.player.x; const cy = cell.y - current.player.y;
      if (cx || cy) {
        const blockedCorner = (x: number, y: number) => !isWalkable(current.floor, x, y) || isObjectSetBlocked(current.floor, current.player, x, y) || current.floor.entities.some((entity) => entity.x === x && entity.y === y && (entity.kind === "enemy" || entity.kind === "campfire" || entity.kind === "chest" || entity.kind === "crate" && !entity.opened));
        if (!isWalkable(current.floor, cell.x, cell.y) || isObjectSetBlocked(current.floor, current.player, cell.x, cell.y)) break;
        if (cx && cy && (blockedCorner(current.player.x + cx, current.player.y) || blockedCorner(current.player.x, current.player.y + cy))) break;
        const occupant = entityAt(current.floor.entities, cell.x, cell.y);
        if (occupant?.kind === "enemy" || occupant?.kind === "campfire" || occupant?.kind === "chest" || occupant?.kind === "crate" && !occupant.opened) break;
        // Reuse entry effects, but tactical time belongs to center crossings.
        if (cx && cy) {
          if (current.floor.entities.some((entity) => entity.x === cell.x && entity.y === current.player.y)) break;
          current.player.x = cell.x;
        }
        const entry = applyAction(current, { type: "move", direction: cy ? cy > 0 ? "s" : "n" : cx > 0 ? "e" : "w", hazardElapsedMs: action.hazardElapsedMs }, { ...options, freeEntry: true });
        if (entry.accepted && entry.events.some((event) => event.type === "player.died" || event.type === "realm.entered")) { current = entry.state; events.push(...entry.events); moved = true; break; }
        if (!entry.accepted) break;
        if (entry.state.player.x !== cell.x || entry.state.player.y !== cell.y) { current = entry.state; events.push(...entry.events); moved = true; break; }
        current = entry.state; events.push(...entry.events);
      }
      current.player.pixel = pixel; moved = true;
      for (const _crossing of centerCrossings(previousPixel, pixel)) {
        tick(current, events); ticks++;
        if (`${current.floor.seed}:${current.floor.level}:${current.run}` !== floorKey || gameMode(current) === "Battle") break;
      }
      if (`${current.floor.seed}:${current.floor.level}:${current.run}` !== floorKey || gameMode(current) === "Battle" || current.floor.entities.some((entity) => entity.kind === "stairs" && entity.x === current.player.x && entity.y === current.player.y)) break;
    }
    if (!moved) return reject("blocked-pixel-movement");
    if (gameMode(current) === "Battle") current.player.pixel = cellCenter(current.player);
    return { state: current, events, accepted: true, ticks };
  }
  if (action.type === "trap-strike") {
    applyActiveTrapStrikes(state, events, action.hazardElapsedMs);
    resetPlayerAfterDeath(state, events);
    return { state, events, accepted: true, ticks: 0 };
  }
  if (action.type === "spend-attribute-points") {
    const entries = progressionStatNames.map((name) => [name, Math.max(0, Math.trunc(Number(action.allocation[name]) || 0))] as const).filter(([, amount]) => amount > 0);
    const total = entries.reduce((sum, [, amount]) => sum + amount, 0);
    if (!total || total > state.progression.attributePoints || entries.some(([name, amount]) => state.progression.attributes[name] + amount > 99)) return reject("invalid-attribute-allocation");
    const previousCaps = effectiveAttributes(state);
    for (const [name, amount] of entries) state.progression.attributes[name] += amount;
    state.progression.attributePoints -= total;
    if (state.worldAttributes) {
      let points = total;
      const legacy = Math.min(points, state.worldLegacyPoints ?? 0);
      state.worldLegacyPoints = (state.worldLegacyPoints ?? 0) - legacy; points -= legacy;
      for (const event of state.worldGrowth ?? []) {
        if (event.applied || points <= 0) continue;
        const used = Math.min(3 - event.spent, points); event.spent += used; points -= used;
        if (event.spent === 3) {
          const recent = (state.worldGrowth ?? []).filter(e => e.applied && e.before && e.after).slice(-3).flatMap(e => Object.keys(e.after!).filter(n => e.after![n as keyof WorldAttributes] > e.before![n as keyof WorldAttributes]) as (keyof WorldAttributes)[]);
          event.recent ??= recent;
          const growth = growWorld(state.worldAttributes, event, event.recent);
          event.before = growth.before; event.after = growth.after; event.unused = growth.unused; event.applied = true;
          state.worldAttributes = growth.after;
        }
      }
    }
    normalizeResources(state, events, "attribute-points", previousCaps);
    emit(events, "progression.points.spent", { amount: total, points: state.progression.attributePoints }, state);
    return { state, events, accepted: true, ticks: 0 };
  }
  if (action.type === "toggle-sneak") { state.player.sneaking = !state.player.sneaking; emit(events, "player.sneak.changed", { active: state.player.sneaking }, state); return { state, events, accepted: true, ticks: 0 }; }
  if (action.type === 'acknowledge-world-growth') {
    const event = state.worldGrowth?.find(e => e.id === action.id && e.applied);
    if (!event || event.acknowledged) return reject('unavailable-world-growth');
    event.acknowledged = true;
    return { state, events, accepted: true, ticks: 0 };
  }
  if (action.type === "return-barrel") {
    const set = floorTriggerDoorSets(state.floor).find((entry) => entry.id === action.setId); const start = set?.barrelStart;
    if (!set || !start || set.barrelReturnUsed || !isBarrelAdjacentToWall(state.floor, set.barrel) || samePosition(set.barrel, start) || !isWalkable(state.floor, start.x, start.y) || samePosition(state.player, start) || entityAt(state.floor.entities, start.x, start.y)) return reject("barrel-return-unavailable");
    const from = { ...set.barrel }; set.barrel = { ...start, hasMass: true }; set.barrelReturnUsed = true;
    emit(events, "barrel.returned", { id: set.id, from, to: { ...start } }, state); return { state, events, accepted: true, ticks: 0 };
  }
  if (action.type === "wait") { emit(events, "player.waited", {}, state); tick(state, events); return { state, events, accepted: true, ticks: 1 }; }
  if (action.type === "rest") {
    if (state.counters.gold < REST_GOLD_COST) return reject("insufficient-gold", { amount: REST_GOLD_COST });
    const previousStatus = resourceState(state);
    state.counters.gold -= REST_GOLD_COST;
    for (const key of ["health", "stamina", "mana"] as const) if (RESOURCE_WILL_REPLENISH[key]) changeResource(state, events, key, effectiveAttributes(state)[key], "campfire-rest");
    const replenishedStatus = resourceState(state);
    for (const key of ["offense", "defense"] as const) if (previousStatus[key].current !== replenishedStatus[key].current) emit(events, "resource.changed", { resource: key, previous: previousStatus[key].current, current: replenishedStatus[key].current, currentMax: replenishedStatus[key].currentMax, cause: "campfire-rest" }, state);
    tick(state, events, true);
    if (state.mode === "journey") state.journeyCheckpoint = prepareJourneyCheckpoint(state);
    return { state, events, accepted: true, ticks: 1 };
  }
  if (action.type === "enter-teleport") {
    const arrow = state.floor.entities.find((entity): entity is Extract<Entity, { kind: "teleport-arrow" }> => entity.kind === "teleport-arrow" && entity.x === state.player.x && entity.y === state.player.y);
    if (!arrow) return reject("not-on-teleport-arrow");
    const time = state.floor.time;
    if (state.activePrefab) {
      const returnLevel = state.activePrefab.returnLevel;
      state.playerHomeEntities ??= {};
      state.playerHomeEntities[String(returnLevel)] = structuredClone(state.floor.entities);
      const dungeonFloor = state.floors?.[String(returnLevel)] ? structuredClone(state.floors[String(returnLevel)]!) : rebuildCampaignFloor(state, returnLevel);
      state.floor = dungeonFloor;
      state.floor.time = time;
      state.realm = `${state.worldFamily === "overworld" ? "Overworld" : "Underground"} ${returnLevel}`;
      const arrival = cardinalAdjacentPosition(state.floor, state.activePrefab.returnPosition);
      state.player.x = arrival.x;
      state.player.y = arrival.y;
      delete state.activePrefab;
      revealDiscovery(state, state.player);
      emit(events, "teleport.returned", { destination: "dungeon", level: returnLevel, position: { x: state.player.x, y: state.player.y } }, state);
    } else {
      const returnLevel = state.floor.level ?? state.floor.depth ?? 1;
      const returnPosition = { x: arrow.x, y: arrow.y };
      state.levelStates ??= {};
      if (state.floors) state.floors[String(returnLevel)] = structuredClone(state.floor);
      else state.levelStates[String(returnLevel)] = createLevelStateDelta(generatedFloorForCampaign(state, returnLevel), state.floor);
      state.floor = playerHomeFloor(state);
      state.floor.time = time;
      state.activePrefab = { id: "player-home", returnLevel, returnPosition, prefabPosition: { x: arrow.x, y: arrow.y } };
      const homeArrow = state.floor.entities.find((entity): entity is Extract<Entity, { kind: "teleport-arrow" }> => entity.kind === "teleport-arrow")!;
      const arrival = cardinalAdjacentPosition(state.floor, homeArrow);
      state.player.x = arrival.x; state.player.y = arrival.y;
      revealDiscovery(state, state.player);
      emit(events, "teleport.entered", { destination: "player-home", level: returnLevel, position: { x: arrival.x, y: arrival.y } }, state);
    }
    state.player.pixel = cellCenter(state.player);
    return { state, events, accepted: true, ticks: 0 };
  }
  if (action.type === "enter-stairs") {
    const stair = state.floor.entities.find((entity): entity is Extract<Entity, { kind: "stairs" }> => entity.kind === "stairs" && entity.x === state.player.x && entity.y === state.player.y);
    if (!stair) return reject("not-on-stairs");
    const currentLevel = state.floor.level ?? state.floor.depth ?? 1;
    const level = stair.direction === "back" ? Math.max(1, currentLevel - 1) : currentLevel + 1;
    const linkKey = `${Math.min(currentLevel, level)}:${Math.max(currentLevel, level)}`;
    const priorLink = state.levelTransitions?.[linkKey];
    const eastOfStair = { x: stair.x + 1, y: stair.y };
    const fromPosition = stair.direction === "back" ? priorLink?.fromPosition
      : (isAvailableEntranceCell(state.floor, eastOfStair) ? eastOfStair : cardinalAdjacentPosition(state.floor, stair));
    const time = state.floor.time;
    state.levelStates ??= {};
    if (state.floors) state.floors[String(currentLevel)] = structuredClone(state.floor);
    else state.levelStates[String(currentLevel)] = createLevelStateDelta(generatedFloorForCampaign(state, currentLevel), state.floor);
    const difficulty = Math.max(state.progression.difficulty ?? 1, level);
    state.progression.difficulty = difficulty;
    state.floor = state.floors?.[String(level)] ? structuredClone(state.floors[String(level)]!) : rebuildCampaignFloor(state, level);
    state.floor.time = time;
    if (state.floors) state.floors[String(level)] = structuredClone(state.floor);
    state.realm = `${state.worldFamily === "overworld" ? "Overworld" : "Underground"} ${level}`;
    const entrance = entrancePosition(state.floor);
    const toPosition = stair.direction === "back"
      ? priorLink?.fromPosition ?? entrance
      : priorLink?.toPosition ?? entrance;
    if (!priorLink && stair.direction !== "back") {
      state.levelTransitions ??= {};
      state.levelTransitions[linkKey] = { fromLevel: currentLevel, toLevel: level, fromPosition: fromPosition!, toPosition };
    }
    state.player.x = toPosition.x; state.player.y = toPosition.y;
    revealDiscovery(state, state.player);
    emit(events, "realm.entered", { realm: state.realm, level }, state);
    if (!state.floor.progressionXpAwarded) { state.floor.progressionXpAwarded = true; gainXp(state, events, GAME_TUNING.xpPerFloor, "floor-arrival"); }
    if (state.mode === "adventure") state.adventureBaseline = createAdventureLevelBaseline(state);
    if (state.mode === "journey") state.journeyCheckpoint = prepareJourneyCheckpoint(state);
    return { state, events, accepted: true, ticks: 0 };
  }
  if (action.type === "move") {
    const direction = directions[action.direction as Direction]; if (!direction) return reject("invalid-direction"); const [dx, dy] = direction; const x = state.player.x + dx; const y = state.player.y + dy; const entity = entityAt(state.floor.entities, x, y);
    const lockbox = state.floor.lockboxes?.find(box => box.x === x && box.y === y);
    if (lockbox) {
      if (dx && dy && (!isWalkable(state.floor, state.player.x + dx, state.player.y) || !isWalkable(state.floor, state.player.x, state.player.y + dy))) return reject("blocked");
      emit(events, "lockbox.opened", { id: lockbox.storageId, position: { x, y } }, state);
      return { state, events, accepted: true, ticks: 0 };
    }
    const barrelSet = barrelSetAt(state.floor, x, y);
    const isOrdinaryStep = !entity && !barrelSet && isWalkable(state.floor, x, y) && !isObjectSetBlocked(state.floor, state.player, x, y);
    if (!inventoryFitsCapacity(state) && isOrdinaryStep) {
      if (state.player.encumberedDirection !== action.direction) { state.player.encumberedDirection = action.direction as Direction; return { state, events, accepted: true, ticks: 0 }; }
      state.player.encumberedDirection = null;
    }
    if (barrelSet) {
      const target = { x: x + dx, y: y + dy };
      if (!isWalkable(state.floor, target.x, target.y) || isObjectSetBlocked(state.floor, state.player, target.x, target.y) || entityAt(state.floor.entities, target.x, target.y)) return reject("blocked-barrel");
      barrelSet.barrel = { ...target, hasMass: true };
      state.player.heading = action.direction as Direction; state.player.x = x; state.player.y = y;
      emit(events, "barrel.pushed", { id: barrelSet.id, from: { x, y }, to: { ...target } }, state);
      emit(events, "player.moved", { from: { x: campaign.player.x, y: campaign.player.y }, to: { x, y } }, state);
      changeResource(state, events, "stamina", state.player.resources.stamina.current + recoveryAmount(state), "move");
      revealDiscovery(state, state.player);
      tick(state, events); return { state, events, accepted: true, ticks: 1 };
    }
    if ((!isWalkable(state.floor, x, y) || isObjectSetBlocked(state.floor, state.player, x, y)) && !entity) {
      const door = floorTriggerDoorSets(state.floor).some((set) => samePosition(set.door, { x, y }))
        || encounterLockdownSets(state.floor).some((set) => set.doors.some((position) => samePosition(position, { x, y })));
      return reject("blocked", door ? { obstacle: "door" } : {});
    }
    if (entity?.kind === "campfire") return reject("blocked-campfire");
    if (entity?.kind === "enemy") {
      if (!hasAssignedWeapon(state)) return reject("unarmed");
      state.player.heading = action.direction as Direction;
      attack(state, events, entity);
    }
    else if (entity?.kind === "chest") {
      state.player.heading = action.direction as Direction;
      if (!entity.opened) openChest(state, events, entity);
      changeResource(state, events, "stamina", state.player.resources.stamina.current + recoveryAmount(state), "move");
    } else if (entity?.kind === "crate" && !entity.opened) {
      state.player.heading = action.direction as Direction;
      if (!entity.opened) {
        emit(events, "crate.bumped", { id: entity.id, position: { x: entity.x, y: entity.y } }, state);
        entity.health = Math.max(0, entity.health - 50);
        if (entity.health === 0) openCrate(state, events, entity);
      }
      changeResource(state, events, "stamina", state.player.resources.stamina.current + recoveryAmount(state), "move");
    } else {
      state.player.heading = action.direction as Direction;
      state.player.x = x; state.player.y = y; emit(events, "player.moved", { from: { x: campaign.player.x, y: campaign.player.y }, to: { x, y } }, state);
      applyTrapOnEntry(state, events, Number.isFinite(action.hazardElapsedMs) ? action.hazardElapsedMs! : state.floor.time * TRAP_FRAME_DURATION_MS);
      if (entity?.kind === "stairs") {
        emit(events, "stairs.entered", { id: entity.id, position: { x, y } }, state);
      }
      else if (entity?.kind === "teleport-arrow") {
        emit(events, "teleport-arrow.entered", { id: entity.id, destination: entity.destination, position: { x, y } }, state);
      }
      else if (entity?.kind === "potion") { const item = consumableInstance(entity.resource, entity.id, entity.quantity ?? 1); const quickIndex = state.player.quickSlots!.findIndex((slot) => slot && quickSlotKey(slot.item) === quickSlotKey(item)); const inventoryItem = state.player.inventory.find((entry) => isQuickSlottableItem(entry) && quickSlotKey(entry) === quickSlotKey(item)); if (quickIndex >= 0) { mergeItemProvenance(state, state.player.quickSlots![quickIndex]!.item, item, state.player.quickSlots![quickIndex]!.quantity, entity.quantity ?? 1); state.player.quickSlots![quickIndex]!.quantity += entity.quantity ?? 1; state.floor.entities = state.floor.entities.filter((entry) => entry.id !== entity.id); emit(events, "item.collected", { itemId: item.id, item: item.name, name: item.name, resource: entity.resource, destination: { quickSlot: quickIndex }, quickSlot: quickIndex, quantity: state.player.quickSlots![quickIndex]!.quantity }, state); } else if (inventoryItem) { mergeItemProvenance(state, inventoryItem, item, inventoryItem.quantity ?? 1, entity.quantity ?? 1); inventoryItem.quantity = (inventoryItem.quantity ?? 1) + (entity.quantity ?? 1); state.floor.entities = state.floor.entities.filter((entry) => entry.id !== entity.id); emit(events, "item.collected", { itemId: item.id, item: item.name, name: item.name, resource: entity.resource, destination: "inventory", quantity: inventoryItem.quantity }, state); } else if (inventoryFitsCapacity(state, [...state.player.inventory, item])) { state.player.inventory = orderedInventory([...state.player.inventory, item]); state.floor.entities = state.floor.entities.filter((entry) => entry.id !== entity.id); emit(events, "item.collected", { itemId: item.id, item: item.name, name: item.name, resource: entity.resource, destination: "inventory", quantity: entity.quantity ?? 1 }, state); } else emit(events, "item.collection.rejected", { itemId: entity.id, name: entity.name ?? `${entity.resource} potion`, resource: entity.resource, reason: "inventory-full" }, state); }
      else if (entity?.kind === "item") { const item = normalizeItem(entity.item); const quickIndex = isQuickSlottableItem(item) ? state.player.quickSlots!.findIndex((slot) => slot && quickSlotKey(slot.item) === quickSlotKey(item)) : -1; const inventoryItem = isQuickSlottableItem(item) ? state.player.inventory.find((entry) => isQuickSlottableItem(entry) && quickSlotKey(entry) === quickSlotKey(item)) : null; if (quickIndex >= 0) { mergeItemProvenance(state, state.player.quickSlots![quickIndex]!.item, item, state.player.quickSlots![quickIndex]!.quantity); state.player.quickSlots![quickIndex]!.quantity += item.quantity ?? 1; state.floor.entities = state.floor.entities.filter((entry) => entry.id !== entity.id); emit(events, "item.collected", { itemId: item.id, name: item.name, destination: { quickSlot: quickIndex }, quickSlot: quickIndex, quantity: state.player.quickSlots![quickIndex]!.quantity }, state); } else if (inventoryItem) { mergeItemProvenance(state, inventoryItem, item); inventoryItem.quantity = (inventoryItem.quantity ?? 1) + (item.quantity ?? 1); state.floor.entities = state.floor.entities.filter((entry) => entry.id !== entity.id); emit(events, "item.collected", { itemId: item.id, name: item.name, destination: "inventory", quantity: inventoryItem.quantity }, state); } else if (inventoryFitsCapacity(state, [...state.player.inventory, item])) { state.player.inventory = orderedInventory([...state.player.inventory, item]); state.floor.entities = state.floor.entities.filter((entry) => entry.id !== entity.id); emit(events, "item.collected", { itemId: item.id, name: item.name, destination: "inventory", quantity: item.quantity ?? 1 }, state); } else emit(events, "item.collection.rejected", { itemId: entity.id, name: item.name, reason: "inventory-full" }, state); }
      else if (entity?.kind === 'discovery') {
        state.floor.entities = state.floor.entities.filter(entry => entry.id !== entity.id);
        const value = Math.round(4 * (state.floor.generationProfile?.attributes ? worldTuning(state.floor.generationProfile.attributes).rewardScale : 1));
        state.counters.gold += value;
        emit(events, 'item.collected', { itemId: entity.id, name: 'Hidden cache', amount: value, destination: 'gold' }, state);
        gainXp(state, events, GAME_TUNING.xpPerDiscovery, 'discovery');
      }
      else if (entity?.kind === "key" || entity?.kind === "gold") {
        const amount = entity.amount ?? 1;
        if (entity.kind === "key") state.counters.keys += amount; else state.counters.gold += amount;
        state.floor.entities = state.floor.entities.filter((entry) => entry.id !== entity.id);
        emit(events, "item.collected", { itemId: entity.id, name: entity.kind === "key" ? "Key" : "Gold", amount, destination: entity.kind }, state);
        gainXp(state, events, GAME_TUNING.xpPerDiscovery, "discovery");
      }
      changeResource(state, events, "stamina", state.player.resources.stamina.current + recoveryAmount(state), "move");
    }
    revealDiscovery(state, state.player);
    // Pixel movement can enter a cell without advancing time, so it must still
    // close an encounter's doors the instant the interior trigger is crossed.
    updateEncounterLockdowns(state, events);
    state.player.pixel = cellCenter(state.player);
    if (options.freeEntry) resetPlayerAfterDeath(state, events);
    if (!options.freeEntry) tick(state, events);
    return { state, events, accepted: true, ticks: options.freeEntry ? 0 : 1 };
  }
  if (action.type === "ability") { if (!Number.isInteger(action.index) || action.index < 0 || action.index >= 3) return reject("invalid-ability-slot"); const abilityId = state.player.abilities[action.index]; const ability = abilityId ? abilityCatalog[abilityId] : null; if (!ability) return reject("empty-ability"); if (ability.kind === "heal" && state.player.resources.health.current >= state.player.resources.health.currentMax) return reject("health-full"); if (state.player.resources.mana.current < ability.manaCost) return reject("insufficient-mana"); const enemy = ability.kind === "wand" ? [...state.floor.entities.filter((entry): entry is Enemy => entry.kind === "enemy" && Math.abs(entry.x - state.player.x) + Math.abs(entry.y - state.player.y) <= ability.range && hasClearCardinalLine(state.floor, state.player, entry))].sort((a, b) => Math.abs(a.x - state.player.x) + Math.abs(a.y - state.player.y) - Math.abs(b.x - state.player.x) - Math.abs(b.y - state.player.y) || a.id.localeCompare(b.id))[0] : null; if (ability.kind === "wand" && !enemy) return reject("no-valid-target"); changeResource(state, events, "mana", state.player.resources.mana.current - ability.manaCost, "ability"); emit(events, "ability.used", { id: ability.id, abilityId: ability.id, title: ability.title, manaCost: ability.manaCost, target: ability.target, targetId: enemy?.id, position: { x: state.player.x, y: state.player.y } }, state); return { state, events, accepted: true, ticks: 0 }; }
  if (action.type === "resolve-ability") { const ability = abilityCatalog[action.abilityId]; if (!ability) return reject("unknown-ability"); if (ability.kind === "heal") changeResource(state, events, "health", state.player.resources.health.current + ability.amount, "heal"); else { const target = state.floor.entities.find((entry): entry is Enemy => entry.kind === "enemy" && entry.id === action.targetId); if (target) { const health = target.resources.health; const damage = integerDamage(ability.damage); const previousHealth = health.current; health.current = Math.max(0, health.current - damage); target.hp = health.current; emit(events, "combat.hit", { target: target.name, targetId: target.id, targetPosition: { x: target.x, y: target.y }, damage, previousHealth, currentHealth: health.current, source: ability.id, sourceName: "You" }, state); if (health.current <= 0) { state.floor.entities = state.floor.entities.filter((entry) => entry.id !== target.id); gainXp(state, events, target.resources.xp.current, "kill"); emit(events, "enemy.defeated", { name: target.name, xp: target.resources.xp.current }, state); } } } tick(state, events); return { state, events, accepted: true, ticks: 1 }; }
  if (action.type === "assign-ability") { const { from, to } = action; if (![from, to].every((index) => Number.isInteger(index) && index >= 0 && index < 3) || from === to) return reject("invalid-ability-slot"); [state.player.abilities[from], state.player.abilities[to]] = [state.player.abilities[to], state.player.abilities[from]]; emit(events, "ability.assignment.changed", { from, to }, state); tick(state, events); return { state, events, accepted: true, ticks: 1 }; }
  if (action.type === "store-ability") {
    const abilityId = Number.isInteger(action.index) && action.index >= 0 && action.index < 3 ? state.player.abilities[action.index] : null;
    if (!abilityId) return reject("empty-ability-slot", { index: action.index }, "item.drop.rejected");
    const item = abilityItemInstance(abilityId, `ability-${abilityId}-${action.index}`);
    if (!inventoryFitsCapacity(state, [...state.player.inventory, item])) return reject("inventory-full", { itemId: item.id, name: item.name, source: "ability" }, "item.drop.rejected");
    state.player.inventory = orderedInventory([...state.player.inventory, item]); state.player.abilities[action.index] = null;
    emit(events, "ability.assignment.changed", { action: "stored", abilityId, index: action.index, itemId: item.id, item: item.name, destination: "inventory" }, state);
    tick(state, events); return { state, events, accepted: true, ticks: 1 };
  }
  if (action.type === "assign-ability-from-inventory") {
    if (!Number.isInteger(action.index) || action.index < 0 || action.index >= 3) return reject("invalid-ability-slot");
    const itemIndex = state.player.inventory.findIndex((entry) => entry.id === action.itemId && entry.category === "ability" && entry.abilityId);
    const item = state.player.inventory[itemIndex];
    if (!item?.abilityId) return reject("invalid-ability-item", { itemId: action.itemId });
    const previousAbility = state.player.abilities[action.index];
    const inventory = state.player.inventory.filter((_, index) => index !== itemIndex);
    if (previousAbility) inventory.push(abilityItemInstance(previousAbility, item.id));
    if (!inventoryFitsCapacity(state, inventory)) return reject("inventory-full");
    state.player.inventory = orderedInventory(inventory); state.player.abilities[action.index] = item.abilityId;
    emit(events, "ability.assignment.changed", { action: "assigned from inventory", abilityId: item.abilityId, itemId: item.id, item: item.name, source: "inventory", destination: { quickSlot: action.index }, index: action.index }, state);
    tick(state, events); return { state, events, accepted: true, ticks: 1 };
  }
  if (action.type === "assign-quick-slot") {
    const { index } = action; const slots = state.player.quickSlots!;
    if (!Number.isInteger(index) || index < 0 || index > 1) return reject("invalid-quick-slot");
    const itemIndex = state.player.inventory.findIndex((item) => item.id === action.itemId); const item = state.player.inventory[itemIndex];
    if (!item || !isQuickSlottableItem(item)) return reject("incompatible-quick-slot-item");
    const existing = slots[index];
    const combining = existing && quickSlotKey(existing.item) === quickSlotKey(item);
    const otherIndex = slots.findIndex((slot, slotIndex) => slotIndex !== index && slot && quickSlotKey(slot.item) === quickSlotKey(item));
    if (otherIndex >= 0) return reject("already-quick-slotted");
    const quantity = item.quantity ?? 1;
    const inventory = state.player.inventory.filter((_, index) => index !== itemIndex);
    if (existing && !combining) {
      const stored = inventory.find(entry => isQuickSlottableItem(entry) && quickSlotKey(entry) === quickSlotKey(existing.item));
      if (stored) { mergeItemProvenance(state, stored, existing.item, stored.quantity ?? 1, existing.quantity); stored.quantity = (stored.quantity ?? 1) + existing.quantity; }
      else inventory.push({ ...existing.item, quantity: existing.quantity });
    }
    if (!inventoryFitsCapacity(state, inventory)) return reject("inventory-full");
    state.player.inventory = orderedInventory(inventory);
    if (combining) mergeItemProvenance(state, existing.item, item, existing.quantity, quantity); slots[index] = combining ? { item: existing.item, quantity: existing.quantity + quantity } : { item, quantity };
    emit(events, "quick-slot.changed", { action: combining ? "combined" : existing ? "swapped" : "assigned", itemId: item.id, item: item.name, source: "inventory", destination: { quickSlot: index }, quickSlot: index, quantity: slots[index]!.quantity }, state);
    tick(state, events); return { state, events, accepted: true, ticks: 1 };
  }
  if (action.type === "move-quick-slot") {
    const { from, to } = action; const slots = state.player.quickSlots!;
    if (![from, to].every((index) => Number.isInteger(index) && index >= 0 && index < 2) || from === to) return reject("invalid-quick-slot");
    const source = slots[from]; const target = slots[to];
    if (!source) return reject("empty-quick-slot");
    const combining = target && quickSlotKey(target.item) === quickSlotKey(source.item);
    if (combining) mergeItemProvenance(state, target.item, source.item, target.quantity, source.quantity); slots[to] = combining ? { item: target.item, quantity: target.quantity + source.quantity } : source;
    slots[from] = combining ? null : target;
    emit(events, "quick-slot.changed", { action: combining ? "combined" : target ? "swapped" : "moved", itemId: source.item.id, item: source.item.name, source: { quickSlot: from }, destination: { quickSlot: to }, quickSlot: to, quantity: slots[to]!.quantity }, state);
    tick(state, events); return { state, events, accepted: true, ticks: 1 };
  }
  if (action.type === "return-quick-slot") {
    const { index } = action; const slots = state.player.quickSlots!; const slot = slots[index];
    if (!Number.isInteger(index) || index < 0 || index > 1 || !slot) return reject("empty-quick-slot");
    const existing = state.player.inventory.find((item) => isQuickSlottableItem(item) && quickSlotKey(item) === quickSlotKey(slot.item));
    if (!existing && !inventoryFitsCapacity(state, [...state.player.inventory, { ...structuredClone(slot.item), quantity: slot.quantity }])) return reject("inventory-full");
    if (existing) { mergeItemProvenance(state, existing, slot.item, existing.quantity ?? 1, slot.quantity); existing.quantity = (existing.quantity ?? 1) + slot.quantity; }
    else state.player.inventory = orderedInventory([...state.player.inventory, { ...structuredClone(slot.item), quantity: slot.quantity }]);
    slots[index] = null;
    emit(events, "quick-slot.changed", { action: "returned", itemId: slot.item.id, item: slot.item.name, source: { quickSlot: index }, destination: "inventory", quickSlot: index, quantity: slot.quantity }, state);
    tick(state, events); return { state, events, accepted: true, ticks: 1 };
  }
  if (action.type === "use-quick-slot") {
    const { index } = action; const slot = state.player.quickSlots![index];
    if (!Number.isInteger(index) || index < 0 || index > 1 || !slot) return { state: campaign, events: [], accepted: false, ticks: 0 };
    if (slot.item.quickSlotAction === "throwing-knives") {
      const ability = abilityCatalog["throwing-knives"];
      const enemy = [...state.floor.entities.filter((entry): entry is Enemy => entry.kind === "enemy" && Math.abs(entry.x - state.player.x) + Math.abs(entry.y - state.player.y) <= ability.range && hasClearCardinalLine(state.floor, state.player, entry))].sort((a, b) => Math.abs(a.x - state.player.x) + Math.abs(a.y - state.player.y) - Math.abs(b.x - state.player.x) - Math.abs(b.y - state.player.y) || a.id.localeCompare(b.id))[0];
      if (!enemy) return reject("no-valid-target", { itemId: slot.item.id, item: slot.item.name, quickSlot: index }, "quick-slot.use.rejected");
      const direction = cardinalDirection(state.player, enemy) ?? state.player.heading ?? "e";
      state.floor.projectiles = [...(state.floor.projectiles ?? []), { id: `projectile-${state.floor.time}-${slot.item.id}`, sourceId: "player", from: { x: state.player.x, y: state.player.y }, to: { x: enemy.x, y: enemy.y }, direction, createdAt: state.floor.time, kind: "throwing-knife" }];
      consumeItemProvenance(state, slot.item, slot.quantity); slot.quantity -= 1; if (slot.quantity <= 0) state.player.quickSlots![index] = null;
      emit(events, "ability.used", { id: ability.id, abilityId: ability.id, title: ability.title, manaCost: 0, target: ability.target, targetId: enemy.id, position: { x: state.player.x, y: state.player.y }, quickSlot: index, quantity: Math.max(0, slot.quantity) }, state);
      return { state, events, accepted: true, ticks: 0 };
    }
    const resource = slot.item.consumableResource;
    if (!resource) return reject("invalid-quick-slot-item", { itemId: slot.item.id }, "quick-slot.use.rejected");
    const maximum = effectiveAttributes(state)[resource]; const current = state.player.resources[resource].current;
    if (current >= maximum) return reject("resource-full", { itemId: slot.item.id, item: slot.item.name, resource, current, currentMax: maximum, quickSlot: index }, "quick-slot.use.rejected");
    const previous = current; const restored = resource === "health" ? GAME_TUNING.healthPotionRestore : resource === "stamina" ? GAME_TUNING.staminaPotionRestore : GAME_TUNING.manaPotionRestore;
    changeResource(state, events, resource, current + restored, "quick-slot");
    consumeItemProvenance(state, slot.item, slot.quantity); slot.quantity -= 1; if (slot.quantity <= 0) state.player.quickSlots![index] = null;
    emit(events, "potion.consumed", { itemId: slot.item.id, item: slot.item.name, resource, previous, current: state.player.resources[resource].current, quickSlot: index, quantity: Math.max(0, slot.quantity) }, state);
    tick(state, events); return { state, events, accepted: true, ticks: 1 };
  }
  if (action.type === "equip" || action.type === "unequip" || action.type === "reorder-equipment") { const { group, index } = action; if (!state.player.equipment[group] || !Number.isInteger(index) || index < 0 || index > 1) return reject("invalid-slot"); const previousCaps = effectiveAttributes(state);
    if (action.type === "equip") {
      const itemIndex = state.player.inventory.findIndex((item) => item.id === action.itemId); const item = state.player.inventory[itemIndex];
      if (!item || item.category === "consumable" || item.group !== group) return reject("invalid-equipment-drop");
      const swap = projectEquipmentSwap(state, item.id, group, index);
      if (!swap) return reject("inventory-full");
      const { displaced } = swap;
      state.player.equipment = swap.campaign.player.equipment;
      state.player.inventory = swap.campaign.player.inventory;
      emit(events, "equipment.changed", { action: displaced.length ? "swapped" : "enabled", itemId: item.id, item: item.name, source: "inventory", destination: { group, index }, group, index, slotSpan: item.slotSpan ?? 1, occupiedSlots: occupiedIndexes(state.player.equipment[group], item), displacedItemIds: displaced.map((entry) => entry.id), displacedItems: displaced.map(({ id, name }) => ({ id, name })) } as EventFacts, state);
    }
    else if (action.type === "unequip") { const item = state.player.equipment[group][index]; if (!item || !inventoryFitsCapacity(state, [...state.player.inventory, item])) return reject("cannot-unequip"); for (const slotIndex of occupiedIndexes(state.player.equipment[group], item)) state.player.equipment[group][slotIndex] = null; state.player.inventory = orderedInventory([...state.player.inventory, item]); emit(events, "equipment.changed", { action: "returned to inventory", itemId: item.id, item: item.name, source: { group, index }, destination: "inventory", group, index }, state); }
    else { const other = action.other; if (!Number.isInteger(other) || other < 0 || other > 1 || other === index) return reject("invalid-equipment-slot"); const left = state.player.equipment[group][index]; const right = state.player.equipment[group][other]; if (left?.slotSpan === 2 || right?.slotSpan === 2) return reject("cannot-reorder-two-slot"); [state.player.equipment[group][index], state.player.equipment[group][other]] = [right, left]; emit(events, "equipment.changed", { action: "reordered", group, index, other, source: { group, index }, destination: { group, index: other } }, state); }
    normalizeResources(state, events, "equipment", previousCaps); tick(state, events); return { state, events, accepted: true, ticks: 1 };
  }
  return reject("unknown-action");
}

export function resolveTurn(state: Campaign, direction: string) { return applyAction(state, { type: "move", direction }).state; }
export function previewEquipment(campaign: Campaign, item: Item, group: EquipmentGroup, index: number, mode = "equip") { const projected = copyCampaignMutableState(campaign); const slots = projected.player.equipment[group]; if (mode === "equip" && item.group === group) applyEquipmentItem(slots, item, targetIndexes(slots, item, index)); if (mode === "unequip") for (const slotIndex of occupiedIndexes(slots, item)) slots[slotIndex] = null; return effectiveAttributes(projected); }
export function createGameSession(initial: Campaign, { onCommit, getSimulationFrozen, getEnemyLogicDisabled, getInputPaused, reconcileRecovery }: { onCommit?: (result: ActionResult) => void; getSimulationFrozen?: () => boolean; getEnemyLogicDisabled?: () => boolean; getInputPaused?: () => boolean; reconcileRecovery?: (campaign: Campaign) => Campaign } = {}) {
  let state = initial; let transactionSequence = 0; let eventSequence = 0; let dispatching = false;
  let validatedCells: Floor["cells"] | null = null, validatedMap: Floor["map"] = undefined;
  const validateStaticBoundary = () => {
    if (state.floor.cells === validatedCells && state.floor.map === validatedMap) return;
    ensureSemanticCells(state.floor);
    markRuntimeGridValid(state.floor);
    validatedCells = state.floor.cells; validatedMap = state.floor.map;
    countPerformance("static normalization boundaries");
  };
  const listeners = new Set<(result: ActionResult) => void>(); const queue: { action: Action; result: ActionResult | null }[] = [];
  const session = {
    getState: () => state,
    subscribe(listener: (result: ActionResult) => void) { listeners.add(listener); return () => listeners.delete(listener); },
    /** Storage has already validated both owners. Durability precedes publication. */
    commitStorage(expected: Campaign, next: Campaign, persist: () => void) {
      if (state !== expected || dispatching) return false;
      persist();
      state = next;
      const result: ActionResult = { state, events: [{ type: "storage.transferred", facts: {}, gameTime: state.floor.time, sequence: 1, eventId: `event-${++eventSequence}` }], accepted: true, ticks: 0, system: true };
      for (const listener of [...listeners]) listener(result);
      state = result.state;
      return true;
    },
    publish(type: string, facts: EventFacts = {}) {
      const event: GameEvent = { type, facts, eventId: `event-${++eventSequence}`, transactionId: null, gameTime: state.floor.time, sequence: 1, outcome: "system" };
      const result = { state, events: [event], accepted: false, ticks: 0, system: true };
      for (const listener of [...listeners]) listener(result);
      state = result.state;
      return event;
    },
    dispatch(action: Action): ActionResult | { queued: true; accepted: false; ticks: number; events: GameEvent[] } | null {
      if (getInputPaused?.()) return { state, events: [], accepted: false, ticks: 0 };
      const request: { action: Action; result: ActionResult | null } = { action, result: null }; queue.push(request);
      if (dispatching) return { queued: true, accepted: false, ticks: 0, events: [] };
      dispatching = true;
      try {
        while (queue.length) {
          validateStaticBoundary();
          const current = queue.shift()!; const result = measurePerformance("action (inclusive)", () => getSimulationFrozen?.() ? applyFrozenMovement(state, current.action, false) : applyAction(state, current.action, { staticWorldReady: true, enemyLogicDisabled: getEnemyLogicDisabled?.() === true }));
          if (result.accepted && !getSimulationFrozen?.()) emitFloorTriggerChanges(result.events, state, result.state);
          result.transactionId = `tx-${++transactionSequence}`;
          result.events = result.events.map((event, index) => ({ ...event, transactionId: result.transactionId, eventId: `event-${++eventSequence}`, sequence: index + 1, outcome: result.accepted ? "committed" : "rejected" }));
          if (result.accepted) {
            applyStorageExclusions(result.state);
            const committed: GameEvent = { type: "action.committed", facts: { transactionId: result.transactionId, actionType: current.action.type, ticks: result.ticks }, transactionId: result.transactionId, eventId: `event-${++eventSequence}`, gameTime: result.state.floor.time, sequence: result.events.length + 1, outcome: "committed" };
            result.events.push(committed); state = result.state;
            if (result.events.some((event) => event.type === "player.died")) {
              const recovery = buildDeathRecovery(result.state);
              result.recovery = recovery && reconcileRecovery ? reconcileRecovery(recovery) : recovery;
            }
          }
          current.result = result;
          for (const listener of [...listeners]) listener(result);
          if (result.accepted) { state = result.state; measurePerformance("commit/save callbacks (inclusive)", () => onCommit?.(result)); }
        }
      } finally { dispatching = false; }
      return request.result;
    },
  };
  return session;
}
