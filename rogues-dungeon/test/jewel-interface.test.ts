import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { JEWEL_NAMES } from '../src/content/items/jewel-catalog.ts';
import { describeInventoryDrop, previewInventoryDrop, resolveInventoryDrop } from '../src/game/inventory-drag.ts';
import { itemComparisonStats } from '../src/game/item-comparison-stats.ts';
import { abilityCatalog, applyAction, createCampaign, inventorySlotCount, worldDroppableItemInstance } from '../src/systems/procedural/world-procedural-system.ts';

function fixture() { const state = createCampaign(42); state.floor.entities = []; state.floor.objectSets = []; return state; }

test('Jewel previews include Health and removed modifiers without advancing time or resources', () => {
  for (const [oldName, newName, expected] of [
    ['Gold Ring of Vigor', 'Sapphire Amulet', [{ name: 'mana', value: 10, delta: 10 }, { name: 'health', value: 0, delta: -15 }]],
    ['Prismatic Amulet', 'Gold Guard Bracelet', [{ name: 'defense', value: 3, delta: 3 }, { name: 'health', value: 0, delta: -5 }, { name: 'mana', value: 0, delta: -5 }]],
  ] as const) {
    const state = fixture(), before = worldDroppableItemInstance(oldName, 'before'), after = worldDroppableItemInstance(newName, 'after');
    state.player.equipment.jewels[0] = before; state.player.inventory = [after];
    const snapshot = structuredClone(state), drag = { kind: 'inventory', item: after } as const;
    const description = describeInventoryDrop(state, drag, { kind: 'slot', group: 'jewels', index: 0 }, before);
    assert.ok(description?.preview); assert.equal(description.before?.id, before.id); assert.equal(description.after?.id, after.id);
    assert.deepEqual(itemComparisonStats(description.after, description.before), expected);
    assert.equal(previewInventoryDrop(state, drag, 'armor', 0, null), null);
    assert.equal(describeInventoryDrop(state, drag, { kind: 'slot', group: 'weapons', index: 0 }), null);
    assert.equal(resolveInventoryDrop(drag, null), null);
    assert.deepEqual(state, snapshot);
  }
  const game = readFileSync(new URL('../src/game/game.tsx', import.meta.url), 'utf8');
  assert.match(game, /health: "♥"/); assert.match(game, /itemComparisonStats\(item, title === "After" \? baseline : null\)/);
  assert.match(game, /Object\.values\(campaign\.player\.equipment\)\.flat\(\)\.find/);
  const panels = readFileSync(new URL('../src/game/panels/information-panels.tsx', import.meta.url), 'utf8');
  assert.match(panels, /attributes=\{preview \? effectiveAttributes\(campaign\) : campaign\.progression\.attributes\}/);
});

test('all Jewels reject Abilities and Quick Slots in both drag routing and transactions', () => {
  for (const name of JEWEL_NAMES) {
    const state = fixture(), item = worldDroppableItemInstance(name, 'jewel'); state.player.inventory = [item];
    const snapshot = structuredClone(state);
    for (const kind of ['quick-slot', 'ability'] as const) {
      assert.equal(resolveInventoryDrop({ kind: 'inventory', item }, { kind, index: 0 }), null);
      assert.equal(describeInventoryDrop(state, { kind: 'inventory', item }, { kind, index: 0 }), null);
      assert.equal(resolveInventoryDrop({ kind: 'slot', group: 'jewels', index: 0, item }, { kind, index: 1 }), null);
      const result = applyAction(state, kind === 'quick-slot' ? { type: 'assign-quick-slot', index: 0, itemId: item.id } : { type: 'assign-ability-from-inventory', index: 0, itemId: item.id });
      assert.equal(result.accepted, false); assert.equal(result.ticks, 0); assert.deepEqual(result.state.player, snapshot.player);
    }
    assert.deepEqual(state, snapshot);
  }
});

test('Jewel Inventory entries remain distinct, sort normally, and count one space each', () => {
  const state = fixture(); state.player.inventoryCapacity = 10;
  state.player.inventory = (['Quartz Amulet', 'Copper Ring of Vigor', 'Copper Ring of Vigor'] as const).map((name, index) => worldDroppableItemInstance(name, `jewel-${index}`));
  assert.equal(inventorySlotCount(state.player.inventory), 3);
  const equipped = applyAction(state, { type: 'equip', group: 'jewels', index: 1, itemId: 'jewel-0' }); assert.equal(equipped.accepted, true);
  assert.equal(inventorySlotCount(equipped.state.player.inventory), 2);
  const returned = applyAction(equipped.state, { type: 'unequip', group: 'jewels', index: 1 }); assert.equal(returned.accepted, true);
  assert.deepEqual(returned.state.player.inventory.map(item => item.id), ['jewel-1', 'jewel-2', 'jewel-0']);
  assert.equal(inventorySlotCount(returned.state.player.inventory), 3); assert.equal(new Set(returned.state.player.inventory.map(item => item.id)).size, 3);
});

test('Jewel Inventory returns honor carried capacity bonuses in both preview and transaction', () => {
  const state = fixture(), jewel = worldDroppableItemInstance('Copper Ring of Vigor', 'worn');
  state.player.inventoryCapacity = 5; state.player.equipment.jewels[0] = jewel;
  state.player.inventory = [worldDroppableItemInstance('Extra Carrying Capacity +5', 'bag'), ...Array.from({ length: 4 }, (_, index) => worldDroppableItemInstance('Wooden Stick', `stick-${index}`))];
  const before = structuredClone(state);
  const description = describeInventoryDrop(state, { kind: 'slot', group: 'jewels', index: 0, item: jewel }, { kind: 'inventory' });
  assert.ok(description); assert.deepEqual(state, before);
  const result = applyAction(state, description.action);
  assert.equal(result.accepted, true); assert.equal(inventorySlotCount(result.state.player.inventory), 6);
  assert.equal(result.state.player.inventory.filter(item => item.id === jewel.id).length, 1);
  assert.equal(result.state.player.equipment.jewels[0], null);
});

test('Jewel Inventory returns reject a full Inventory containing two-position items', () => {
  const state = fixture(), jewel = worldDroppableItemInstance('Copper Ring of Vigor', 'worn');
  state.player.inventoryCapacity = 5; state.player.equipment.jewels[0] = jewel;
  state.player.inventory = [worldDroppableItemInstance('Two-Handed Sword', 'sword-1'), worldDroppableItemInstance('Two-Handed Sword', 'sword-2'), worldDroppableItemInstance('Wooden Stick', 'stick')];
  const before = structuredClone(state);
  assert.equal(inventorySlotCount(state.player.inventory), 5);
  assert.equal(describeInventoryDrop(state, { kind: 'slot', group: 'jewels', index: 0, item: jewel }, { kind: 'inventory' }), null);
  const result = applyAction(state, { type: 'unequip', group: 'jewels', index: 0 });
  assert.equal(result.accepted, false); assert.equal(result.ticks, 0);
  assert.deepEqual(result.state.player, before.player); assert.deepEqual(state, before);
});

test('worn Jewels leave consumable decrement and Mana-driven ability costs unchanged', () => {
  let state = fixture(); state.player.equipment.jewels[0] = worldDroppableItemInstance('Prismatic Amulet', 'worn');
  state.player.resources.health = { current: 1, currentMax: 25 }; state.player.resources.mana = { current: 25, currentMax: 25 };
  state.player.abilities = ['heal', null, null];
  const potion = { id: 'potion', name: 'Health Potion', group: 'weapons', modifiers: {}, category: 'consumable', consumableResource: 'health', isStackable: true } as const;
  state.player.quickSlots = [{ item: potion, quantity: 3 }, null];
  const used = applyAction(state, { type: 'use-quick-slot', index: 0 }); assert.equal(used.accepted, true);
  assert.equal(used.state.player.quickSlots?.[0]?.quantity, 2); assert.equal(used.state.player.resources.mana.current, 25);
  state = used.state; state.player.resources.health.current = 1;
  const cast = applyAction(state, { type: 'ability', index: 0 }); assert.equal(cast.accepted, true);
  assert.equal(cast.state.player.resources.mana.current, 25 - abilityCatalog.heal.manaCost);
  assert.equal(cast.state.player.quickSlots?.[0]?.quantity, 2); assert.equal(cast.state.player.equipment.jewels[0]?.id, 'worn');
});

test('How to Play describes flexible passive Jewels and the independent active-item systems', () => {
  const help = readFileSync(new URL('../src/game/windows/how-to-play-window.tsx', import.meta.url), 'utf8');
  for (const text of ['Jewels has two flexible positions below Armor', 'including matching copies', 'passive buffs only while equipped', 'no pair bonuses', 'They use no Mana or charges', 'Abilities and consumable Quick Slots work separately']) assert.ok(help.includes(text), text);
});
