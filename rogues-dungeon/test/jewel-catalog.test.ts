import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { JEWEL_CATALOG, JEWEL_NAMES, jewelItemDefinitions } from '../src/content/items/jewel-catalog.ts';
import { itemCatalog, WORLD_DROPPABLE_ITEM_NAMES, worldDroppableItemInstance } from '../src/systems/procedural/world-procedural-system.ts';

test('all ten Jewel definitions have exact fixed buffs and complete world registration', () => {
  const expected = [
    ['Copper Ring of Vigor', { health: 5 }], ['Silver Ring of Vigor', { health: 10 }], ['Gold Ring of Vigor', { health: 15 }],
    ['Copper Guard Bracelet', { defense: 1 }], ['Silver Guard Bracelet', { defense: 2 }], ['Gold Guard Bracelet', { defense: 3 }],
    ['Quartz Amulet', { mana: 5 }], ['Sapphire Amulet', { mana: 10 }], ['Star Sapphire Amulet', { mana: 15 }],
    ['Prismatic Amulet', { health: 5, mana: 5 }],
  ];
  assert.deepEqual(JEWEL_CATALOG.map(({ name, modifiers }) => [name, modifiers]), expected);
  assert.equal(new Set(JEWEL_NAMES).size, 10);
  for (const definition of jewelItemDefinitions) {
    assert.ok(itemCatalog.includes(definition));
    assert.ok(WORLD_DROPPABLE_ITEM_NAMES.includes(definition.name as typeof JEWEL_NAMES[number]));
    const first = worldDroppableItemInstance(definition.name as typeof JEWEL_NAMES[number], 'first');
    const second = worldDroppableItemInstance(definition.name as typeof JEWEL_NAMES[number], 'second');
    assert.equal(first.group, 'jewels'); assert.equal(first.category, 'equipment');
    assert.equal(first.slotSpan, 1); assert.equal(first.isStackable, false);
    assert.equal(first.quantity, undefined); assert.equal(first.abilityId, undefined);
    assert.notEqual(first.id, second.id); assert.notEqual(first.modifiers, second.modifiers);
    first.modifiers.health = 999;
    assert.deepEqual(second.modifiers, definition.modifiers);
  }
});

test('the player catalog documents every Jewel and its exact modifier values', () => {
  const document = readFileSync(new URL('../documentation/inventory-equipment.md', import.meta.url), 'utf8');
  for (const jewel of JEWEL_CATALOG) {
    const row = document.split('\n').find(line => line.startsWith(`| ${jewel.name} |`));
    assert.ok(row, `Missing documentation for ${jewel.name}`);
    for (const [key, value] of Object.entries(jewel.modifiers)) {
      assert.ok(row.includes(`${key[0].toUpperCase()}${key.slice(1)} +${value}`), `${jewel.name}: ${key}`);
    }
  }
});
