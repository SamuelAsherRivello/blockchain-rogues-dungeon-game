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
  assert.equal(worldItemUnlockLevel('Sword'), 2);
  assert.equal(worldItemUnlockLevel('Two-Handed Sword'), 3);
  assert.equal(worldItemUnlockLevel('Suit of Armor'), 3);
  assert.equal(worldItemUnlockLevel('unknown-item'), WORLD_BALANCE_LEVEL_MAX);
});

test('world item eligibility and rarity keep stronger rewards later and rarer', () => {
  const levelOne = eligibleWorldItemNames(1);
  const levelTwo = eligibleWorldItemNames(2);
  const levelThree = eligibleWorldItemNames(3);
  assert.deepEqual(levelOne, ['Wooden Stick']);
  assert.ok(levelTwo.includes('Sword') && levelTwo.includes('Extra Space'));
  assert.ok(levelThree.includes('Suit of Armor') && levelThree.includes('Two-Handed Sword'));
  assert.equal(worldItemRarity('Wooden Stick'), 'common');
  assert.equal(worldItemRarity('Extra Space'), 'rare');
  assert.equal(worldItemRarity('Suit of Armor'), 'very-rare');
});

test('trigger-only doors do not consume keyed-door coverage', () => {
  const floor = generateFloor(1, 17, 1, { worldAttributes: DEFAULT_WORLD_ATTRIBUTES });
  assert.equal(floor.objectSets?.length, 1);
  assert.equal(keyedDoorCountForFloor(floor), 0);
  assert.ok(floor.entities.filter(entity => entity.kind === 'key').length >= keyedDoorCountForFloor(floor));
});

test('world diagnostics record the balance version and generated counts', () => {
  const floor = generateFloor(3, 29, 2, { worldAttributes: DEFAULT_WORLD_ATTRIBUTES });
  assert.equal(floor.worldDiagnostics?.balanceVersion, 'world-balance-1');
  assert.equal(floor.worldDiagnostics?.contentCounts?.enemies, floor.entities.filter(entity => entity.kind === 'enemy').length);
  assert.equal(floor.worldDiagnostics?.contentCounts?.traps, floor.decorations?.filter(decoration => decoration.kind === 'trap').length);
});
