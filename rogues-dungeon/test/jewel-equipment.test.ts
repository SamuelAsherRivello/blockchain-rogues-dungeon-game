import assert from 'node:assert/strict';
import test from 'node:test';
import type { Equipment } from '../src/game/types.ts';
import { JEWEL_NAMES } from '../src/content/items/jewel-catalog.ts';
import { applyAction, createCampaign, effectiveAttributes, normalizeStackableLocations, resourceState, worldDroppableItemInstance } from '../src/systems/procedural/world-procedural-system.ts';
import { previewInventoryDrop } from '../src/game/inventory-drag.ts';
import { itemComparisonStats } from '../src/game/item-comparison-stats.ts';
import { setCell } from '../src/systems/procedural/level-grid-system.ts';

function fixture() {
  const state = createCampaign(42);
  state.floor.entities = [];
  state.floor.objectSets = [];
  for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) setCell(state.floor, state.player.x + x, state.player.y + y, { walkable: true, role: 'ground' });
  return state;
}

test('fresh campaigns and repeated normalization retain exactly two Jewel positions', () => {
  const state = createCampaign(42);
  assert.deepEqual([...state.player.equipment.jewels], [null, null]);
  const ring = worldDroppableItemInstance('Silver Ring of Vigor', 'ring');
  const weapon = worldDroppableItemInstance('Wooden Stick', 'stick');
  state.player.equipment.weapons[0] = weapon;
  state.player.equipment.jewels[1] = ring;
  const before = structuredClone(state.player);
  normalizeStackableLocations(state); normalizeStackableLocations(state);
  assert.deepEqual(state.player, before);
  delete (state.player.equipment as Partial<Equipment>).jewels;
  normalizeStackableLocations(state);
  assert.deepEqual(state.player.equipment.jewels, [null, null]);
  assert.deepEqual(state.player.equipment.weapons, before.equipment.weapons);
  assert.deepEqual(state.player.equipment.armor, before.equipment.armor);
  assert.deepEqual(state.player.resources, before.resources);
});

test('every Jewel fits either position and swaps atomically with one tick', () => {
  for (const name of JEWEL_NAMES) for (const index of [0, 1]) {
    const state = fixture();
    const jewel = worldDroppableItemInstance(name, 'incoming');
    const previous = worldDroppableItemInstance('Copper Guard Bracelet', 'previous');
    state.player.equipment.jewels[index] = previous;
    state.player.inventory = [jewel];
    state.player.inventoryCapacity = 1;
    const result = applyAction(state, { type: 'equip', group: 'jewels', index, itemId: jewel.id });
    assert.equal(result.accepted, true, `${name} into ${index}`);
    assert.equal(result.ticks, 1);
    assert.equal(result.state.player.equipment.jewels[index]?.id, jewel.id);
    assert.deepEqual(result.state.player.inventory.map(item => item.id), [previous.id]);
    assert.equal(state.player.equipment.jewels[index]?.id, previous.id);
  }
});

test('cross-group and unavailable Jewel destinations reject without a tick', () => {
  const state = fixture();
  const jewel = worldDroppableItemInstance('Quartz Amulet', 'amulet');
  const sword = worldDroppableItemInstance('Sword', 'sword');
  const armor = worldDroppableItemInstance('Wooden Vest', 'armor');
  state.player.inventory = [jewel, sword, armor];
  for (const [group, itemId, index] of [['weapons', jewel.id, 0], ['armor', jewel.id, 0], ['jewels', sword.id, 0], ['jewels', armor.id, 0], ['jewels', jewel.id, 2]] as const) {
    const result = applyAction(state, { type: 'equip', group, index, itemId });
    assert.equal(result.accepted, false); assert.equal(result.ticks, 0);
    assert.deepEqual(result.state.player, state.player);
    assert.equal(result.state.floor.time, state.floor.time);
  }
});

test('two independent matching Jewels reorder without changing buffs', () => {
  const state = fixture();
  state.player.equipment.jewels = [worldDroppableItemInstance('Gold Ring of Vigor', 'first'), worldDroppableItemInstance('Gold Ring of Vigor', 'second')];
  const result = applyAction(state, { type: 'reorder-equipment', group: 'jewels', index: 0, other: 1 });
  assert.equal(result.accepted, true); assert.equal(result.ticks, 1);
  assert.deepEqual(result.state.player.equipment.jewels.map(item => item?.id), ['second', 'first']);
  assert.deepEqual(result.state.player.equipment.jewels.map(item => item?.modifiers), [{ health: 15 }, { health: 15 }]);
  const canceled = applyAction(state, { type: 'reorder-equipment', group: 'jewels', index: 0, other: 0 });
  assert.equal(canceled.accepted, false); assert.equal(canceled.ticks, 0);
});

test('stored Jewels have no buffs and strongest matching pairs have bounded additive effects', () => {
  const state = fixture();
  const base = effectiveAttributes(state);
  state.player.inventory = JEWEL_NAMES.map((name, index) => worldDroppableItemInstance(name, `stored-${index}`));
  assert.deepEqual(effectiveAttributes(state), base);
  for (const [name, stat, amount] of [['Gold Ring of Vigor', 'health', 30], ['Star Sapphire Amulet', 'mana', 30], ['Gold Guard Bracelet', 'defense', 6]] as const) {
    state.player.equipment.jewels = [worldDroppableItemInstance(name, 'one'), worldDroppableItemInstance(name, 'two')];
    const expected = { ...base, [stat]: base[stat] + amount };
    assert.deepEqual(effectiveAttributes(state), expected);
  }
  state.player.equipment.jewels = [worldDroppableItemInstance('Silver Ring of Vigor', 'ring'), worldDroppableItemInstance('Silver Guard Bracelet', 'bracelet')];
  assert.deepEqual(effectiveAttributes(state), { ...base, health: base.health + 10, defense: base.defense + 2 });
});

test('Health and Mana Jewel changes preserve fullness instead of refilling', () => {
  const state = fixture(); state.progression.attributes.health = 2; state.progression.attributes.mana = 2;
  state.player.resources.health = { current: 10, currentMax: 20 };
  state.player.resources.mana = { current: 5, currentMax: 20 };
  state.player.inventory = [worldDroppableItemInstance('Copper Ring of Vigor', 'ring')];
  const equipped = applyAction(state, { type: 'equip', group: 'jewels', index: 0, itemId: 'ring' });
  assert.deepEqual(equipped.state.player.resources.health, { current: 12.5, currentMax: 25 });
  assert.deepEqual(equipped.state.player.resources.mana, { current: 5, currentMax: 20 });
  const removed = applyAction(equipped.state, { type: 'unequip', group: 'jewels', index: 0 });
  assert.deepEqual(removed.state.player.resources.health, { current: 10, currentMax: 20 });
  const zero = fixture(); zero.progression.attributes.mana = 1; zero.player.resources.mana = { current: 0, currentMax: 0 };
  zero.player.equipment.weapons[0] = { id: 'seal', name: 'Mana Seal', group: 'weapons', modifiers: { mana: -10 } };
  zero.player.inventory = [worldDroppableItemInstance('Quartz Amulet', 'mana')];
  const raised = applyAction(zero, { type: 'equip', group: 'jewels', index: 0, itemId: 'mana' });
  assert.deepEqual(raised.state.player.resources.mana, { current: 0, currentMax: 5 });
});

test('Prismatic replacement previews both losses and gains without mutating resources', () => {
  const state = fixture(); state.progression.attributes.health = 2; state.progression.attributes.mana = 2;
  const before = worldDroppableItemInstance('Prismatic Amulet', 'prism');
  const after = worldDroppableItemInstance('Sapphire Amulet', 'sapphire');
  state.player.equipment.jewels[0] = before; state.player.inventory = [after];
  state.player.resources.health = { current: 10, currentMax: 25 };
  state.player.resources.mana = { current: 12.5, currentMax: 25 };
  const snapshot = structuredClone(state);
  const preview = previewInventoryDrop(state, { kind: 'inventory', item: after }, 'jewels', 0, before);
  assert.equal(preview?.health, 20); assert.equal(preview?.mana, 30);
  assert.deepEqual(itemComparisonStats(after, before), [{ name: 'mana', value: 10, delta: 5 }, { name: 'health', value: 0, delta: -5 }]);
  assert.deepEqual(state, snapshot);
  const committed = applyAction(state, { type: 'equip', group: 'jewels', index: 0, itemId: after.id });
  assert.deepEqual(committed.state.player.resources.health, { current: 8, currentMax: 20 });
  assert.deepEqual(committed.state.player.resources.mana, { current: 15, currentMax: 30 });
  const resources = resourceState(committed.state);
  assert.ok(Number.isFinite(resources.defense.current));
});

test('full Inventory unequip and blocked Jewel drop preserve ownership and time', () => {
  const state = fixture();
  state.player.inventoryCapacity = 1;
  state.player.inventory = [worldDroppableItemInstance('Quartz Amulet', 'carried')];
  state.player.equipment.jewels[0] = worldDroppableItemInstance('Copper Guard Bracelet', 'worn');
  const rejected = applyAction(state, { type: 'unequip', group: 'jewels', index: 0 });
  assert.equal(rejected.accepted, false); assert.equal(rejected.ticks, 0);
  assert.deepEqual(rejected.state.player, state.player);
  for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) {
    if (x || y) setCell(state.floor, state.player.x + x, state.player.y + y, { walkable: false, role: 'wall' });
  }
  for (const source of [{ kind: 'inventory', itemId: 'carried' }, { kind: 'slot', group: 'jewels', index: 0 }] as const) {
    const blocked = applyAction(state, { type: 'drop-item', source });
    assert.equal(blocked.accepted, false); assert.equal(blocked.ticks, 0);
    assert.deepEqual(blocked.state.player, state.player);
    assert.equal(blocked.state.floor.entities.length, 0);
  }
});

test('all ten Jewels drop and recollect losslessly from Inventory and Equipment', () => {
  for (const name of JEWEL_NAMES) for (const origin of ['inventory', 'equipment']) {
    const state = fixture();
    const item = worldDroppableItemInstance(name, `jewel-${origin}`);
    if (origin === 'inventory') state.player.inventory = [item];
    else state.player.equipment.jewels[0] = item;
    const source = origin === 'inventory' ? { kind: 'inventory' as const, itemId: item.id } : { kind: 'slot' as const, group: 'jewels' as const, index: 0 };
    const drop = applyAction(state, { type: 'drop-item', source });
    assert.equal(drop.accepted, true, `${origin}: ${name}`); assert.equal(drop.ticks, 1);
    const entity = drop.state.floor.entities.find(entity => entity.kind === 'item');
    assert.ok(entity?.kind === 'item'); assert.deepEqual(entity.item, item);
    assert.deepEqual(drop.state.player.equipment.jewels, [null, null]);
    assert.equal(drop.state.player.inventory.length, 0);
    let next = drop.state;
    for (const direction of [entity.x < next.player.x ? 'w' : 'e', entity.y < next.player.y ? 'n' : 's'] as const) {
      const moved = applyAction(next, { type: 'move', direction }); assert.equal(moved.accepted, true); next = moved.state;
    }
    assert.deepEqual(next.player.inventory, [item]);
    assert.deepEqual(next.player.equipment.jewels, [null, null]);
    assert.equal(next.floor.entities.filter(entity => entity.kind === 'item').length, 0);
  }
});
