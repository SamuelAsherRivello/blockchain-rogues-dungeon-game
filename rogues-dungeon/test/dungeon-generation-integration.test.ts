import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { Campaign, Floor } from '../src/game/types.ts';
import { createAdventureLevelBaseline, createRunCampaign, compactCampaignForSave, generatedFloorForCampaign, generateFloor, LEGACY_DUNGEON_TOPOLOGY_VERSION, restoreCompactCampaign } from '../src/systems/procedural/world-procedural-system.ts';
import { DEFAULT_WORLD_ATTRIBUTES } from '../src/systems/procedural/world-attributes.ts';
import { DUNGEON_TOPOLOGY_VERSION, dungeonGraphRoute } from '../src/systems/procedural/dungeon-topology-system.ts';
import { worldBalanceProfile } from '../src/systems/procedural/world-balance.ts';
import { readPerformanceMetrics, resetPerformanceMetrics, resetPerformanceOptions, setPerformanceOptions } from '../src/systems/rendering/performance-system.ts';

const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const geometry = (floor: Floor) => ({ width: floor.width, height: floor.height, cells: floor.cells, start: floor.start, startRoom: floor.startRoom });
const fixtures = JSON.parse(readFileSync(new URL('./fixtures/legacy-generation-fixtures.json', import.meta.url), 'utf8')) as { compact: { name: string; record: Campaign; expected: { geometryHash: string } }[] };

test('new runs pin the graph version while direct calls and undefined historical profiles remain legacy', () => {
  const campaign = createRunCampaign(42, 2, 1, 1, 1, { worldAttributes: DEFAULT_WORLD_ATTRIBUTES });
  assert.equal(campaign.topologyVersion, DUNGEON_TOPOLOGY_VERSION);
  assert.equal(campaign.floorProfiles!['1'].topologyVersion, DUNGEON_TOPOLOGY_VERSION);
  assert.equal(campaign.floor.generation?.topology?.version, DUNGEON_TOPOLOGY_VERSION);
  assert.equal(generatedFloorForCampaign(campaign, 2).generationProfile?.topologyVersion, DUNGEON_TOPOLOGY_VERSION);
  const direct = generateFloor(1, 42, 1, { worldAttributes: DEFAULT_WORLD_ATTRIBUTES });
  assert.equal(direct.generation?.topology, undefined);
  const explicitLegacy = generateFloor(1, 42, 1, { worldAttributes: DEFAULT_WORLD_ATTRIBUTES, topologyVersion: LEGACY_DUNGEON_TOPOLOGY_VERSION });
  assert.deepEqual(explicitLegacy.cells, direct.cells); assert.deepEqual(explicitLegacy.entities, direct.entities);
});

test('actual graph exit attachments agree with stairs, including sealed and nearby fixture destinations', () => {
  let sealedExits = 0;
  for (const seed of [1, 2, 17, 42, 93, 1234]) for (const level of [1, 2]) {
    const floor = generateFloor(level, seed, level, { topologyVersion: DUNGEON_TOPOLOGY_VERSION });
    const graph = floor.generation!.topology!, exit = floor.entities.find(entity => entity.kind === 'stairs' && entity.direction === 'forward')!;
    const attachment = graph.exitAttachment;
    assert.deepEqual(attachment.position, { x: exit.x, y: exit.y });
    assert.equal(attachment.roomId, graph.exitRoomId);
    assert.deepEqual(graph.route, dungeonGraphRoute(graph.rooms.length, graph.edges, graph.startRoomId, graph.exitRoomId));
    assert.deepEqual(attachment.path[0], graph.rooms[graph.exitRoomId]!.center);
    assert.deepEqual(attachment.path.at(-1), attachment.position);
    for (const cell of attachment.path) assert.equal(floor.cells[cell.y]![cell.x]!.walkable, true);
    for (let index = 1; index < attachment.path.length; index++) assert.equal(Math.abs(attachment.path[index]!.x - attachment.path[index - 1]!.x) + Math.abs(attachment.path[index]!.y - attachment.path[index - 1]!.y), 1);
    if (attachment.kind === 'sealed-chamber') { sealedExits++; assert.equal(attachment.roomId, 0); }
    if (level !== 1) assert.notEqual(attachment.kind, 'sealed-chamber');
    assert.equal(floor.generation!.quality!.valid, true);
  }
  assert.ok(sealedExits > 0);
  const fixture = generateFloor(1, 2, 1, { topologyVersion: DUNGEON_TOPOLOGY_VERSION, worldAttributes: DEFAULT_WORLD_ATTRIBUTES, level1TestMode: true });
  assert.equal(fixture.generation!.topology!.exitAttachment.kind, 'fixture');
  assert.equal(fixture.generation!.topology!.exitAttachment.roomId, 0);
});

test('graph generation remains deterministic and role placement retains bounded content budgets', () => {
  let treasureChests = 0, arenaEnemies = 0;
  for (const seed of [1, 2, 42]) for (const level of [1, 2, 3]) {
    const options = { topologyVersion: DUNGEON_TOPOLOGY_VERSION, worldAttributes: DEFAULT_WORLD_ATTRIBUTES };
    const floor = generateFloor(level, seed, level, options), budgets = worldBalanceProfile(level, level, DEFAULT_WORLD_ATTRIBUTES).budgets;
    assert.deepEqual(generateFloor(level, seed, level, options), floor);
    const positions = floor.entities.map(entity => `${entity.x},${entity.y}`);
    assert.equal(new Set(positions).size, positions.length);
    assert.ok(floor.entities.every(entity => floor.cells[entity.y]?.[entity.x]?.walkable));
    const scripted = floor.entities.filter(entity => entity.kind === 'enemy' && entity.encounterId).length;
    assert.ok(floor.entities.filter(entity => entity.kind === 'enemy').length <= budgets.enemies.max + scripted);
    assert.ok(floor.entities.filter(entity => entity.kind === 'chest').length <= budgets.chests.max + 1);
    assert.ok(floor.entities.filter(entity => entity.kind === 'crate').length <= budgets.crates.max);
    assert.ok((floor.worldDiagnostics?.rewardBudget ?? 0) <= 200);
    const roleRooms = floor.generation!.topology!.rooms;
    const inRole = (entity: { x: number; y: number }, roles: readonly string[]) => roleRooms.some(room => room.roles.some(role => roles.includes(role)) && entity.x >= room.x && entity.y >= room.y && entity.x < room.x + room.w && entity.y < room.y + room.h);
    treasureChests += floor.entities.filter(entity => entity.kind === 'chest' && inRole(entity, ['treasure', 'dead-end'])).length;
    arenaEnemies += floor.entities.filter(entity => entity.kind === 'enemy' && inRole(entity, ['arena', 'hub'])).length;
  }
  assert.ok(treasureChests > 0); assert.ok(arenaEnemies > 0);
});

test('graph compact saves and retries preserve the selected geometry and missing-version legacy recovery stays exact', () => {
  const campaign = createRunCampaign(17, 1, 1, 2, 2, { worldAttributes: DEFAULT_WORLD_ATTRIBUTES });
  const original = geometry(campaign.floor), baseline = createAdventureLevelBaseline(campaign);
  assert.deepEqual(geometry(baseline.floor), original);
  assert.deepEqual(geometry(restoreCompactCampaign(JSON.parse(JSON.stringify(compactCampaignForSave(campaign))) as Campaign).floor), original);
  for (const entry of fixtures.compact) {
    const legacy = restoreCompactCampaign(structuredClone(entry.record));
    assert.equal(hash(geometry(createAdventureLevelBaseline(legacy).floor)), entry.expected.geometryHash, entry.name);
    legacy.topologyVersion = DUNGEON_TOPOLOGY_VERSION;
    assert.equal(hash(geometry(createAdventureLevelBaseline(legacy).floor)), entry.expected.geometryHash, `${entry.name} historical floor beats newer campaign default`);
  }
});

test('profile topology participates in baseline cache identity and unsupported versions do not mutate state', () => {
  const campaign = createRunCampaign(749061, 1, 1, 1, 1, { worldAttributes: DEFAULT_WORLD_ATTRIBUTES });
  compactCampaignForSave(campaign);
  const legacyCopy = structuredClone(campaign); legacyCopy.floorProfiles!['1'].topologyVersion = LEGACY_DUNGEON_TOPOLOGY_VERSION;
  setPerformanceOptions({ enabled: true }); resetPerformanceMetrics();
  try {
    compactCampaignForSave(legacyCopy);
    assert.equal(readPerformanceMetrics().counts['generated baseline floors'], 1);
  } finally { resetPerformanceOptions(); }
  campaign.floorProfiles!['1'].topologyVersion = 'unknown-topology';
  const before = JSON.stringify(campaign);
  assert.throws(() => compactCampaignForSave(campaign), /Unsupported saved dungeon topology/);
  assert.equal(JSON.stringify(campaign), before);
  campaign.floorProfiles!['1'].topologyVersion = DUNGEON_TOPOLOGY_VERSION;
  campaign.topologyVersion = 'unknown-topology';
  const beforeDefault = JSON.stringify(campaign);
  assert.throws(() => generatedFloorForCampaign(campaign, 8), /Unsupported saved dungeon topology/);
  assert.equal(JSON.stringify(campaign), beforeDefault);
});

test('graph quality survives extreme world controls and an authored home without losing required markers', () => {
  for (const seed of [1, 2, 17, 42, 93, 1234]) for (const rank of [0, 3, 14, 99]) for (const level of [1, 2]) {
    const attributes = Object.fromEntries(Object.keys(DEFAULT_WORLD_ATTRIBUTES).map(name => [name, rank])) as typeof DEFAULT_WORLD_ATTRIBUTES;
    const floor = generateFloor(level, seed, level, { worldAttributes: attributes, topologyVersion: DUNGEON_TOPOLOGY_VERSION });
    assert.equal(floor.generation!.quality!.valid, true, `${seed}/${rank}/${level}`);
    assert.ok((floor.generation!.repairs ?? 0) <= 1);
    for (const stair of floor.entities.filter(entity => entity.kind === 'stairs')) assert.equal(floor.cells[stair.y]![stair.x]!.walkable, true);
  }
  const home = generateFloor(1, 42, 1, { worldAttributes: DEFAULT_WORLD_ATTRIBUTES, topologyVersion: DUNGEON_TOPOLOGY_VERSION, playerHouse: true });
  assert.equal(home.generation!.quality!.valid, true);
  const south = { x: home.start.x, y: home.start.y + 3 };
  assert.equal(home.cells[south.y]![south.x]!.walkable, true);
});
