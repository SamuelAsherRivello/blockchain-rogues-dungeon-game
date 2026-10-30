import assert from 'node:assert/strict';
import * as React from 'react';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { InventoryRows } from '../src/game/controls/inventory-rows.tsx';
import { SlotItem } from '../src/game/controls/slot-item.tsx';
import { itemPresentation, itemSlotCategory, stackInventoryItems } from '../src/game/inventory-presentation.ts';
import { worldDroppableItemInstance } from '../src/systems/procedural/world-procedural-system.ts';
import { SLOT_COLORS } from '../src/ui/slot-colors.ts';

Object.assign(globalThis, { React });
function render(view: React.ReactNode) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { getElementById: () => null } });
  try { return renderToStaticMarkup(view); }
  finally { if (descriptor) Object.defineProperty(globalThis, 'document', descriptor); else Reflect.deleteProperty(globalThis, 'document'); }
}

test('shared Inventory rows render duplicate Jewels as individual blue equipment entries', () => {
  const items = [worldDroppableItemInstance('Copper Ring of Vigor', 'first'), worldDroppableItemInstance('Copper Ring of Vigor', 'second')];
  const stacks = stackInventoryItems(items); assert.equal(stacks.length, 2); assert.deepEqual(stacks.map(stack => stack.quantity), [1, 1]);
  assert.deepEqual(items.map(itemSlotCategory), ['equipment', 'equipment']); assert.equal(SLOT_COLORS.equipment, '#67b7e8');
  const html = render(<InventoryRows items={items} capacity={5} />);
  assert.equal((html.match(/data-slot-category="equipment"/g) ?? []).length, 2);
  assert.equal((html.match(/data-slot-empty="true"/g) ?? []).length, 3);
  assert.match(html, /data-inventory-item-id="first"/); assert.match(html, /data-inventory-item-id="second"/);
  assert.equal((html.match(/class="drag_handle"/g) ?? []).length, 2);
  assert.match(html, /♥/); assert.match(html, /\+5/); assert.doesNotMatch(html, /Ring of Vigor x/);
});

test('Jewel equipment uses the existing row contract with no hotkey or pair control', () => {
  const item = worldDroppableItemInstance('Prismatic Amulet', 'prism');
  const filled = render(<SlotItem slotType="equipment" slotSubtype="jewels" text={item.name} effects={itemPresentation(item)} dragSource={{ 'data-drag-kind': 'slot', 'data-drag-id': item.id, 'data-drag-group': 'jewels' }} dropTarget={{ 'data-drop-group': 'jewels', 'data-drop-index': 0 }} />);
  assert.match(filled, /slot_item--equipment/); assert.match(filled, /data-slot-category="equipment"/); assert.match(filled, /data-slot-subtype="jewels"/);
  assert.match(filled, /♥/); assert.match(filled, /✦/); assert.match(filled, /class="drag_handle"/);
  assert.doesNotMatch(filled, /slot_item_hotkey|slot_item_number|pair|helmet|left arm|right arm/i);
  const empty = render(<SlotItem slotType="equipment" slotSubtype="jewels" empty />);
  assert.match(empty, /aria-label="Empty equipment slot">\+/); assert.doesNotMatch(empty, /drag_handle/);
});
