import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { JEWEL_CATALOG, jewelDefinition } from '../src/content/items/jewel-catalog.ts';
import { eligibleWorldItemNames, selectWorldItemName, worldBalanceProfile, worldItemRarity, worldItemUnlockLevel } from '../src/systems/procedural/world-balance.ts';
import { applyAction, createCampaign, generateFloor, WORLD_DROPPABLE_ITEM_NAMES, worldDroppableItemInstance } from '../src/systems/procedural/world-procedural-system.ts';
import { DEFAULT_WORLD_ATTRIBUTES } from '../src/systems/procedural/world-attributes.ts';
import { isWalkable, setCell } from '../src/systems/procedural/level-grid-system.ts';

function random(seed: number) { let value = seed >>> 0; return () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 0x100000000; }; }

test('Jewel eligibility gates all sources at levels 2, 4, 6, and 7', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7].map(level => eligibleWorldItemNames(level).filter(name => jewelDefinition(name)).length), [0, 3, 3, 6, 6, 7, 10]);
  for (const jewel of JEWEL_CATALOG) {
    assert.equal(worldItemUnlockLevel(jewel.name), jewel.unlockLevel);
    assert.equal(worldItemRarity(jewel.name), jewel.rarity);
  }
  let calls = 0;
  assert.equal(selectWorldItemName(1, WORLD_DROPPABLE_ITEM_NAMES, () => { calls++; return 0; }), 'Wooden Stick');
  assert.equal(calls, 1, 'Level One keeps the original random draw count');
});

test('the exact 25% channel boundary separates Jewels from legacy item selection', () => {
  const rolls = [0.249999, 0];
  assert.equal(selectWorldItemName(7, WORLD_DROPPABLE_ITEM_NAMES, () => rolls.shift()!), 'Copper Ring of Vigor');
  const legacy = [0.25, 0];
  assert.equal(selectWorldItemName(7, WORLD_DROPPABLE_ITEM_NAMES, () => legacy.shift()!), 'Extra Carrying Capacity +5');
  const total = JEWEL_CATALOG.reduce((sum, jewel) => sum + jewel.weight, 0);
  assert.equal(total, 124);
  let cumulative = 0;
  for (const jewel of JEWEL_CATALOG) {
    const rolls: number[] = [0, (cumulative + jewel.weight / 2) / total];
    assert.equal(selectWorldItemName(7, WORLD_DROPPABLE_ITEM_NAMES, () => rolls.shift()!), jewel.name);
    cumulative += jewel.weight;
  }
});

test('ten thousand seeded selections preserve channel probability and favor lower tiers', () => {
  const draw = random(157);
  const counts = new Map<string, number>();
  for (let i = 0; i < 10000; i++) {
    const name = selectWorldItemName(7, WORLD_DROPPABLE_ITEM_NAMES, draw)!;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const jewelCount = JEWEL_CATALOG.reduce((sum, jewel) => sum + (counts.get(jewel.name) ?? 0), 0);
  assert.ok(jewelCount >= 2300 && jewelCount <= 2700, `${jewelCount}/10000`);
  for (const jewel of JEWEL_CATALOG) {
    const expected = 10000 * 0.25 * jewel.weight / 124;
    assert.ok(Math.abs((counts.get(jewel.name) ?? 0) - expected) < 80, jewel.name);
  }
});

test('high-Luck chest and crate release preserve all ten Jewel identities and exact modifiers', () => {
  for (const name of [...JEWEL_CATALOG.map(jewel => jewel.name), 'Sword'] as const) for (const kind of ['chest', 'crate'] as const) {
    const state = createCampaign(42); state.floor.entities = []; state.floor.objectSets = [];
    state.progression.attributes.luck = 20;
    const { x, y } = state.player;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) setCell(state.floor, x + dx, y + dy, { walkable: true, role: 'ground' });
    const rewardItem = worldDroppableItemInstance(name, 'reward');
    const common = { id: 'container', x: x + 1, y, rewardItem, rewardQuality: 99, rewardAmount: 0 };
    state.floor.entities = kind === 'chest' ? [{ ...common, kind }] : [{ ...common, kind, health: 1 }];
    const opened = applyAction(state, { type: 'move', direction: 'e' });
    assert.equal(opened.accepted, true);
    const reward = opened.state.floor.entities.find(entity => entity.kind === 'item');
    assert.ok(reward?.kind === 'item', `${kind}: ${name}`);
    assert.equal(reward.item.id, rewardItem.id);
    if (rewardItem.group === 'jewels') assert.deepEqual(reward.item.modifiers, rewardItem.modifiers);
    else assert.equal(reward.item.modifiers.offense, rewardItem.modifiers.offense! + 10, 'Legacy Luck amplification remains active');
  }
});

test('world quality leaves generated Jewel reward values at their catalog values', () => {
  let checked = 0;
  for (let seed = 1; seed <= 40 && checked < 3; seed++) {
    const floor = generateFloor(7, seed, 7, { worldAttributes: { ...DEFAULT_WORLD_ATTRIBUTES, fortune: 9 } });
    for (const entity of floor.entities) if ((entity.kind === 'chest' || entity.kind === 'crate') && entity.rewardItem?.group === 'jewels') {
      assert.deepEqual(entity.rewardItem.modifiers, jewelDefinition(entity.rewardItem.name)!.modifiers);
      checked++;
    }
  }
  assert.ok(checked >= 3, 'Production generation supplied Jewel container rewards');
});

test('production seed witnesses generate every Jewel with valid placement and stable budgets', () => {
  const witnesses = JSON.parse(readFileSync(new URL('./jewel-production-seeds.json', import.meta.url), 'utf8')) as { name: string; level: number; seed: number; source: string; id: string; x: number; y: number }[];
  assert.deepEqual(new Set(witnesses.map(witness => witness.name)), new Set(JEWEL_CATALOG.map(jewel => jewel.name)));
  assert.ok(witnesses.some(witness => witness.source === 'chest'));
  assert.ok(witnesses.some(witness => witness.source === 'crate'));
  for (const witness of witnesses) {
    const floor = generateFloor(witness.level, witness.seed, witness.level, { worldAttributes: DEFAULT_WORLD_ATTRIBUTES });
    const repeated = generateFloor(witness.level, witness.seed, witness.level, { worldAttributes: DEFAULT_WORLD_ATTRIBUTES });
    assert.deepEqual(floor.entities, repeated.entities);
    const entity = floor.entities.find(entity => entity.id === witness.id);
    assert.ok(entity, witness.name);
    const item = entity.kind === 'item' ? entity.item : entity.kind === 'chest' || entity.kind === 'crate' ? entity.rewardItem : undefined;
    assert.equal(item?.name, witness.name);
    assert.deepEqual(item?.modifiers, jewelDefinition(witness.name)!.modifiers);
    assert.equal(entity.x, witness.x); assert.equal(entity.y, witness.y);
    assert.ok(isWalkable(floor, entity.x, entity.y));
    assert.ok(entity.x !== floor.start.x || entity.y !== floor.start.y);
    assert.equal(floor.entities.filter(other => other.x === entity.x && other.y === entity.y).length, 1);
    assert.equal(floor.entities.some(entity => entity.id.startsWith('test-item')), false);
    const budget = worldBalanceProfile(witness.level, witness.level, DEFAULT_WORLD_ATTRIBUTES).budgets;
    const count = floor.entities.filter(entity => entity.kind === 'item').length;
    assert.ok(count >= budget.worldItems.min && count <= budget.worldItems.max, `${witness.name}: ${count} items`);
  }
});
