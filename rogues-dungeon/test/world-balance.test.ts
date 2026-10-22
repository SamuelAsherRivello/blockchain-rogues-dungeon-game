import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_WORLD_ATTRIBUTES } from '../src/systems/procedural/world-attributes.ts';
import { WORLD_BALANCE_LEVEL_MAX, WORLD_BALANCE_VERSION, eligibleWorldItemNames, enemyUnlockCount, worldBalanceProfile, worldItemRarity, worldItemUnlockLevel } from '../src/systems/procedural/world-balance.ts';
import { generateFloor, keyedDoorCountForFloor } from '../src/systems/procedural/world-procedural-system.ts';

test('balance profile exposes bounded level budgets and deterministic modifiers', () => {
  const base = worldBalanceProfile(1, 1, DEFAULT_WORLD_ATTRIBUTES);
  const repeat = worldBalanceProfile(1, 1, DEFAULT_WORLD_ATTRIBUTES);
  assert.equal(base.version, WORLD_BALANCE_VERSION);
  assert.equal(WORLD_BALANCE_LEVEL_MAX, 10);
  assert.deepEqual(base, repeat);
  assert.deepEqual(base.budgets.potions, { min: 1, max: 3 });
  assert.ok(base.surplusKeyChance >= .05 && base.surplusKeyChance <= .3);
});

test('world attributes adjust supplies and rewards only within bounded multipliers', () => {
  const low = worldBalanceProfile(6, 1, { ...DEFAULT_WORLD_ATTRIBUTES, plenty: 0, fortune: 0 });
  const high = worldBalanceProfile(6, 1, { ...DEFAULT_WORLD_ATTRIBUTES, plenty: 99, fortune: 99 });
  assert.ok(low.supplyMultiplier >= .75 && low.supplyMultiplier <= 1.25);
  assert.ok(high.supplyMultiplier >= .75 && high.supplyMultiplier <= 1.25);
  assert.ok(low.rewardMultiplier >= .75 && low.rewardMultiplier <= 1.25);
  assert.ok(high.rewardMultiplier >= .75 && high.rewardMultiplier <= 1.25);
  assert.ok(high.budgets.potions.max >= low.budgets.potions.max);
});

test('enemy unlock stages are first two, four, six, seven, then all', () => {
  assert.deepEqual([1, 2, 3, 4, 5].map(level => enemyUnlockCount(level, 10)), [2, 4, 6, 7, 10]);
  assert.equal(enemyUnlockCount(10, 8), 8);
});

test('world item unlock levels defer stronger rewards', () => {
  assert.equal(worldItemUnlockLevel('Wooden Stick'), 1);
  assert.equal(worldItemUnlockLevel('Wooden Vest'), 1);
  assert.equal(worldItemUnlockLevel('Sword'), 2);
  assert.equal(worldItemUnlockLevel('Two-Handed Sword'), 3);
  assert.equal(worldItemUnlockLevel('Suit of Armor'), 3);
  assert.equal(worldItemUnlockLevel('unknown-item'), WORLD_BALANCE_LEVEL_MAX);
});

test('world item eligibility and rarity keep stronger rewards later and rarer', () => {
  const levelOne = eligibleWorldItemNames(1);
  const levelTwo = eligibleWorldItemNames(2);
  const levelThree = eligibleWorldItemNames(3);
  assert.deepEqual(levelOne, ['Wooden Stick', 'Wooden Vest']);
  assert.ok(levelTwo.includes('Sword') && levelTwo.includes('Extra Carrying Capacity +5'));
  assert.ok(levelThree.includes('Suit of Armor') && levelThree.includes('Two-Handed Sword'));
  assert.equal(worldItemRarity('Wooden Stick'), 'common');
  assert.equal(worldItemRarity('Extra Carrying Capacity +5'), 'rare');
  assert.equal(worldItemRarity('Suit of Armor'), 'very-rare');
});

test('production World One level one places the starter stick and one potion in the opening view', () => {
  for (const seed of [17, 42, 93, 1234]) {
    const floor = generateFloor(1, seed, 1, { worldAttributes: DEFAULT_WORLD_ATTRIBUTES });
    const nearStart = floor.entities.filter((entity) => Math.hypot(entity.x - floor.start.x, entity.y - floor.start.y) <= 10);
    const sticks = nearStart.filter((entity): entity is Extract<typeof entity, { kind: 'item' }> => entity.kind === 'item' && entity.item.name === 'Wooden Stick');
    const potions = nearStart.filter((entity): entity is Extract<typeof entity, { kind: 'potion' }> => entity.kind === 'potion' && (entity.resource === 'health' || entity.resource === 'mana'));
    assert.equal(sticks.length, 1);
    assert.equal(potions.filter((entity) => entity.id.startsWith('starter-')).length, 1);
    assert.equal(nearStart.filter((entity) => entity.kind === 'item' || entity.kind === 'potion').length, 2);
    assert.ok([...sticks, ...potions.filter((entity) => entity.id.startsWith('starter-'))].every((entity) => Math.hypot(entity.x - floor.start.x, entity.y - floor.start.y) <= 3));
  }
});

test('Level One uses a compact footprint without reducing its opening content classes', () => {
  const opening = generateFloor(1, 42, 1, { worldAttributes: DEFAULT_WORLD_ATTRIBUTES });
  const laterLevel = generateFloor(2, 42, 2, { worldAttributes: DEFAULT_WORLD_ATTRIBUTES });
  assert.deepEqual({ width: opening.width, height: opening.height }, { width: 70, height: 70 });
  assert.deepEqual({ width: laterLevel.width, height: laterLevel.height }, { width: 100, height: 100 });
  assert.ok(opening.entities.some((entity) => entity.kind === 'item' && entity.item.name === 'Wooden Stick'));
  assert.ok(opening.entities.some((entity) => entity.kind === 'potion' && entity.id.startsWith('starter-')));
  assert.ok(opening.entities.some((entity) => entity.kind === 'enemy'));
});

test('trigger-only doors do not consume keyed-door coverage', () => {
  const floor = generateFloor(1, 17, 1, { worldAttributes: DEFAULT_WORLD_ATTRIBUTES });
  assert.equal(floor.objectSets?.filter((set) => set.kind === 'floor-trigger-door-barrel').length, 1);
  assert.equal(keyedDoorCountForFloor(floor), 0);
  assert.ok(floor.entities.filter(entity => entity.kind === 'key').length >= keyedDoorCountForFloor(floor));
});

test('world diagnostics record the balance version and generated counts', () => {
  const floor = generateFloor(3, 29, 2, { worldAttributes: DEFAULT_WORLD_ATTRIBUTES });
  assert.equal(floor.worldDiagnostics?.balanceVersion, 'world-balance-1');
  assert.equal(floor.worldDiagnostics?.contentCounts?.enemies, floor.entities.filter(entity => entity.kind === 'enemy').length);
  assert.equal(floor.worldDiagnostics?.contentCounts?.traps, floor.decorations?.filter(decoration => decoration.kind === 'trap').length);
});
