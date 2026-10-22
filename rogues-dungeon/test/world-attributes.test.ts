import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_WORLD_ATTRIBUTES, effectiveWorldRank, growWorld, normalizeWorldAttributes, rollWorldAttributes, validStartingWorld, worldAttributeNames, worldRandom, worldTuning } from '../src/systems/procedural/world-attributes.ts';
import { applyAction, buildDeathRecovery, compactCampaignForSave, createRunCampaign, generatedFloorForCampaign, generateFloor, initializeWorldCampaign, restoreCompactCampaign } from '../src/systems/procedural/world-procedural-system.ts';
import { findCardinalPath } from '../src/game/a-star.ts';

test('world sheets have ten alphabetic, bounded values totaling 30', () => {
  assert.deepEqual([...worldAttributeNames].sort(), worldAttributeNames);
  for (let seed = 0; seed < 100; seed++) assert.ok(validStartingWorld(rollWorldAttributes(worldRandom(seed, 'sheet'))));
  assert.deepEqual(normalizeWorldAttributes({ peace: -8, fortune: 999, plenty: NaN }), { ...DEFAULT_WORLD_ATTRIBUTES, peace: 0, fortune: 99 });
});
test('early world ranks remain distinct and later benefits diminish', () => {
  for (let value = 0; value <= 14; value++) assert.equal(effectiveWorldRank(value), value);
  assert.ok(effectiveWorldRank(99) < 20);
  assert.ok(effectiveWorldRank(99) > effectiveWorldRank(14));
  const low = worldTuning(Object.fromEntries(worldAttributeNames.map(n => [n, 1])) as typeof DEFAULT_WORLD_ATTRIBUTES);
  const high = worldTuning(Object.fromEntries(worldAttributeNames.map(n => [n, 5])) as typeof DEFAULT_WORLD_ATTRIBUTES);
  assert.ok(high.enemyChance < low.enemyChance * .7);
  assert.ok(high.threatScale < low.threatScale * .7);
  assert.ok(high.exitDistance < low.exitDistance * .7);
  assert.ok(high.supplyScale > low.supplyScale * 1.7);
  assert.ok(high.corridorWidth > low.corridorWidth);
  assert.ok(high.trapScale < low.trapScale * .6);
});
test('growth is stable, permits +9 to one starting rank-five trait and respects cap', () => {
  let sheet = { ...DEFAULT_WORLD_ATTRIBUTES, clarity: 5 };
  for (let level = 2; level <= 4; level++) sheet = growWorld(sheet, { seed: 7, level, difficulty: 1 }, [], () => 0).after;
  assert.equal(sheet.clarity, 14);
  const event = { seed: 123, level: 6, difficulty: 3 };
  assert.deepEqual(growWorld(sheet, event), growWorld(sheet, event));
  const capped = Object.fromEntries(worldAttributeNames.map(n => [n, 99])) as typeof sheet;
  assert.equal(growWorld(capped, event).unused, 3);
  assert.equal(growWorld({ ...capped, clarity: 98 }, event).after.clarity, 99);
});

test('per-floor profiles freeze the base across growth, reload and return travel', () => {
  const campaign = createRunCampaign(2834, 2, 1, 2, 1, { worldAttributes: { ...DEFAULT_WORLD_ATTRIBUTES } });
  const original = structuredClone(campaign.floor);
  const removed = campaign.floor.entities.find(e => e.kind === 'potion')!;
  campaign.floor.entities = campaign.floor.entities.filter(e => e.id !== removed.id);
  campaign.worldAttributes!.clarity = 14;
  campaign.progression.difficulty = 10;
  const next = generatedFloorForCampaign(campaign, 2);
  assert.equal(next.generationProfile!.attributes!.clarity, 14);
  const record = compactCampaignForSave(campaign);
  assert.equal(record.floor.cells.length, 0);
  const restored = restoreCompactCampaign(record);
  assert.deepEqual(restored.floor.cells, original.cells);
  assert.equal(restored.floor.entities.some(e => e.id === removed.id), false);
  assert.equal(restored.floor.generationProfile!.difficulty, 2);
  assert.equal(restored.floor.generationProfile!.attributes!.clarity, 3);
});

test('legacy compact bases retain old generation and unsupported versions are rejected', () => {
  const legacy = createRunCampaign(2834, 2, 1, 2, 1);
  const original = structuredClone(legacy.floor);
  const record = compactCampaignForSave(legacy);
  initializeWorldCampaign(record);
  const restored = restoreCompactCampaign(record);
  assert.deepEqual(restored.floor.cells, original.cells);
  assert.deepEqual(restored.floor.entities, original.entities);
  assert.equal(restored.floorProfiles!['1'].attributes, undefined);
  restored.floorProfiles!['1'].generatorVersion = 'unknown';
  assert.throws(() => compactCampaignForSave(restored), /Unsupported saved world generator/);
});

test('100 seeds preserve routes, objects and deterministic repairs across extreme combinations', () => {
  const variants = [1, 5, 14, 99].map(rank => Object.fromEntries(worldAttributeNames.map(n => [n, rank])) as typeof DEFAULT_WORLD_ATTRIBUTES);
  variants.push({ ...DEFAULT_WORLD_ATTRIBUTES, clarity: 0, discovery: 99, openness: 99, guidance: 0 });
  for (let seed = 0; seed < 100; seed++) for (const attributes of variants) {
    const floor = generateFloor(2, seed, 3, { worldAttributes: attributes });
    const exit = floor.entities.find(e => e.kind === 'stairs' && e.direction === 'forward')!;
    const blocking = new Set(floor.entities.filter(e => ['campfire', 'chest', 'crate'].includes(e.kind)).map(e => `${e.x},${e.y}`));
    const path = findCardinalPath(floor, floor.start, exit, { maxNodes: 10000, isBlocked: p => blocking.has(`${p.x},${p.y}`) });
    assert.ok(path, `seed ${seed} ${JSON.stringify(attributes)}`);
    const coordinates = floor.entities.map(e => `${e.x},${e.y}`);
    assert.equal(new Set(coordinates).size, coordinates.length);
    for (const entity of floor.entities) assert.ok(floor.cells[entity.y]?.[entity.x]?.walkable);
    assert.ok(floor.worldDiagnostics!.repairs <= 1);
    assert.deepEqual(generateFloor(2, seed, 3, { worldAttributes: attributes }), floor);
  }
});

test('pickup density changes do not reroll geometry or generated enemies', () => {
  const a = generateFloor(3, 123, 4, { worldAttributes: { ...DEFAULT_WORLD_ATTRIBUTES } });
  const b = generateFloor(3, 123, 4, { worldAttributes: { ...DEFAULT_WORLD_ATTRIBUTES }, pickupDensity: { health: { min: 0, max: 0 } } });
  assert.deepEqual(a.cells, b.cells);
  assert.deepEqual(a.entities.filter(e => e.kind === 'enemy'), b.entities.filter(e => e.kind === 'enemy'));
});

test('earned world awards survive partial spending, batching, death and reload exactly once', () => {
  let campaign = createRunCampaign(123, 1, 1, 1, 1, { worldAttributes: { ...DEFAULT_WORLD_ATTRIBUTES } });
  campaign.worldGrowth = [2, 3].map(level => ({ id: `world-growth-${level}`, level, seed: campaign.floor.seed, difficulty: 1, spent: 0 }));
  campaign.progression.level = 3; campaign.progression.attributePoints = 6;
  const batched = applyAction(structuredClone(campaign), { type: 'spend-attribute-points', allocation: { health: 6 } }).state;
  for (let point = 0; point < 6; point++) {
    campaign = applyAction(campaign, { type: 'spend-attribute-points', allocation: { health: 1 } }).state;
    campaign = restoreCompactCampaign(compactCampaignForSave(campaign));
    assert.equal(campaign.worldGrowth!.filter(e => e.applied).length, Math.floor((point + 1) / 3));
  }
  assert.deepEqual(campaign.worldAttributes, batched.worldAttributes);
  assert.equal(Object.values(campaign.worldAttributes!).reduce((a, b) => a + b, 0), 36);
  const time = campaign.floor.time;
  campaign = applyAction(campaign, { type: 'acknowledge-world-growth', id: 'world-growth-2' }).state;
  assert.equal(campaign.floor.time, time);
  assert.equal(applyAction(campaign, { type: 'acknowledge-world-growth', id: 'world-growth-2' }).accepted, false);
  campaign.player.resources.health.current = 0;
  const fatal = applyAction(campaign, { type: 'wait' }).state;
  const recovered = buildDeathRecovery(fatal)!;
  assert.deepEqual(recovered.worldAttributes, campaign.worldAttributes);
  assert.deepEqual(recovered.worldGrowth, campaign.worldGrowth);
  assert.equal(recovered.floorProfiles!['1'].attributes!.clarity, campaign.worldAttributes!.clarity);
});

test('early/middle/late depth report measures threat, recovery, supplies and rewards', () => {
  const report = [];
  for (const depth of [1, 6, 12]) for (const rank of [1, 5, 14]) {
    let enemies = 0, health = 0, recovery = 0, supplies = 0, gold = 0, route = 0, area = 0;
    const sheet = Object.fromEntries(worldAttributeNames.map(n => [n, rank])) as typeof DEFAULT_WORLD_ATTRIBUTES;
    for (let seed = 1; seed <= 5; seed++) {
      const floor = generateFloor(depth, seed, depth, { worldAttributes: sheet });
      const actors = floor.entities.filter(e => e.kind === 'enemy');
      enemies += actors.length; health += actors.reduce((sum, e) => sum + e.maxHp, 0);
      recovery += floor.entities.filter(e => e.kind === 'campfire').length;
      supplies += floor.entities.reduce((sum, e) => sum + (e.kind === 'potion' ? e.quantity ?? 1 : e.kind === 'key' ? e.amount ?? 1 : 0), 0);
      gold += floor.entities.reduce((sum, e) => sum + (e.kind === 'gold' ? e.amount ?? 1 : e.kind === 'chest' || e.kind === 'crate' ? e.rewardAmount ?? 0 : 0), 0);
      route += floor.worldDiagnostics!.routeLength;
      area += floor.cells.flat().filter(c => c.walkable).length;
    }
    report.push({ depth, rank, encounters: enemies / 5, meanEnemyHealth: Math.round(health / Math.max(1, enemies)), campfires: recovery / 5, recoverySpacing: Math.round(area / Math.max(1, recovery)), supplies: supplies / 5, suppliesPer100: Math.round(supplies / area * 100), gold: gold / 5, route: route / 5 });
  }
  assert.ok(report.find(r => r.depth === 12 && r.rank === 5)!.meanEnemyHealth > report.find(r => r.depth === 1 && r.rank === 5)!.meanEnemyHealth);
  // Depth one is now anchored by a fixed three-enemy lockdown encounter.
  // Check density scaling where ordinary encounters have room in the budget.
  assert.ok(report.find(r => r.depth === 6 && r.rank === 5)!.encounters < report.find(r => r.depth === 6 && r.rank === 1)!.encounters);
  console.log('World tuning report', JSON.stringify(report));
});

test('earning XP records a stable world event once, including multi-level gains', () => {
  const campaign = createRunCampaign(42, 1, 1, 1, 1, { worldAttributes: { ...DEFAULT_WORLD_ATTRIBUTES } });
  const source = campaign.floor.entities.find(e => e.kind === 'enemy');
  assert.ok(source && source.kind === 'enemy');
  source.x = campaign.player.x + 1; source.y = campaign.player.y;
  source.hp = 1; source.resources.health.current = 1; source.resources.xp.current = 210;
  campaign.floor.entities = [source]; campaign.floor.decorations = []; campaign.floor.objectSets = [];
  campaign.progression.xp = 95;
  campaign.player.equipment.weapons[0] = { id: 'test-stick', name: 'Wooden Stick', group: 'weapons', modifiers: { offense: 1 }, isStackable: false };
  const result = applyAction(campaign, { type: 'move', direction: 'e' });
  assert.equal(result.state.worldGrowth!.length, 3);
  assert.deepEqual(result.state.worldGrowth!.map(e => e.level), [2, 3, 4]);
  assert.ok(result.state.worldGrowth!.every(e => e.seed === campaign.floor.seed && e.difficulty === 1 && !e.applied));
  assert.ok(result.state.worldGrowth!.every(e => e.rulesVersion === 'world-attributes-1' && e.identity?.dungeonLevel === 1));
  assert.deepEqual(result.state.worldGrowth![0].earningProfile, campaign.floor.generationProfile);
});

test('a generated container pays the same world reward after later world growth', () => {
  const campaign = createRunCampaign(42, 1, 1, 1, 1, { worldAttributes: { ...DEFAULT_WORLD_ATTRIBUTES, fortune: 5 } });
  const generated = campaign.floor.entities.find(e => e.kind === 'chest');
  assert.ok(generated && generated.kind === 'chest');
  const chest = { ...generated, x: campaign.player.x + 1, y: campaign.player.y };
  campaign.floor.entities = [chest]; campaign.floor.decorations = []; campaign.floor.objectSets = [];
  const expected = applyAction(campaign, { type: 'move', direction: 'e' }).state.floor.entities;
  campaign.worldAttributes!.fortune = 99;
  const actual = applyAction(campaign, { type: 'move', direction: 'e' }).state.floor.entities;
  assert.deepEqual(actual, expected);
  assert.equal(expected.reduce((sum, entity) => sum + (entity.kind === 'gold' ? entity.amount ?? 1 : 0), 0), chest.rewardAmount);
  chest.rewardAmount = 0;
  const exhausted = applyAction(campaign, { type: 'move', direction: 'e' }).state.floor.entities;
  assert.equal(exhausted.filter(entity => entity.kind === 'gold').length, 0);
});
