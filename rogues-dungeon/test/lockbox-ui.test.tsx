import assert from "node:assert/strict";
import * as React from "react";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { InventoryRows } from "../src/game/controls/inventory-rows.tsx";
import { LockboxWindow } from "../src/game/windows/lockbox-window.tsx";
import { inventorySlotLayout } from "../src/game/inventory-slot-layout.ts";

// Node's root test configuration uses the classic JSX runtime for imported views.
Object.assign(globalThis, { React });
function render(view: React.ReactNode) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", { configurable: true, value: { getElementById: () => null } });
  try { return renderToStaticMarkup(view); }
  finally { if (descriptor) Object.defineProperty(globalThis, "document", descriptor); else Reflect.deleteProperty(globalThis, "document"); }
}

test("a new Lockbox uses ten empty inventory positions without Drop Item", () => {
  const html = render(<LockboxWindow boxId="shared-lockbox" items={[]} center={{ left: 100, top: 200 }} drag={null} onClose={() => {}} onCancelDrag={() => {}} />);
  assert.equal((html.match(/data-slot-empty="true"/g) ?? []).length, 10);
  assert.match(html, /Lockbox/);
  assert.match(html, /Close dialog/);
  assert.match(html, /settings-window--game/);
  assert.match(html, /left:100px;top:200px/);
  assert.doesNotMatch(html, /Drop Item|data-drop-item/);
});

test("shared inventory defaults retain Drop Item and multi-position rows use the configured capacity", () => {
  const ordinary = render(<InventoryRows capacity={5} />);
  assert.match(ordinary, /Drop Item/);
  assert.equal((ordinary.match(/data-slot-empty="true"/g) ?? []).length, 5);
  const storage = render(<InventoryRows capacity={10} containerId="shared-lockbox" showDropItem={false} items={[{ id: "sword", name: "Great Sword", group: "weapons", modifiers: { offense: 2 }, slotSpan: 2 }]} />);
  assert.equal((storage.match(/data-slot-empty="true"/g) ?? []).length, 8);
  assert.equal((storage.match(/data-drag-kind="lockbox"/g) ?? []).length, 1);
  assert.match(storage, /data-drag-container="shared-lockbox"/);
  assert.match(storage, /Great Sword \(2\)/);
});

test("updated storage props retain category and whole-stack quantity without expanding capacity", () => {
  const items = [{ id: "capacity", name: "Satchel", group: "armor" as const, modifiers: {}, category: "capacity" as const, capacityBonus: 50 }, { id: "potion", name: "Health Potion", group: "weapons" as const, modifiers: {}, category: "consumable" as const, consumableResource: "health" as const, isStackable: true, quantity: 7 }];
  const full = render(<InventoryRows capacity={10} items={items} containerId="shared-lockbox" showDropItem={false} />);
  assert.equal((full.match(/data-slot-empty="true"/g) ?? []).length, 8);
  assert.match(full, /Health Potion x 7/);
  assert.match(full, /data-slot-category="quick"/);
  const next = render(<InventoryRows capacity={10} items={items.slice(1)} containerId="shared-lockbox" showDropItem={false} />);
  assert.equal((next.match(/data-slot-empty="true"/g) ?? []).length, 9);
  assert.doesNotMatch(next, /Satchel/);
});

test("storage dragging highlights only the chosen row in either container", () => {
  const item = { id: "sword", name: "Sword", group: "weapons" as const, modifiers: {} };
  const deposit = render(<InventoryRows capacity={10} containerId="shared-lockbox" showDropItem={false} drag={{ source: { kind: "inventory", item }, item, x: 0, y: 0, destination: { kind: "lockbox", boxId: "shared-lockbox", index: 7 } }} />);
  assert.equal((deposit.match(/drag_landing/g) ?? []).length, 1);
  assert.match(deposit, /drag_landing[^>]*data-drop-index="7"/);
  const withdrawal = render(<InventoryRows capacity={5} drag={{ source: { kind: "lockbox", boxId: "shared-lockbox", item }, item, x: 0, y: 0, destination: { kind: "inventory", index: 3 } }} />);
  assert.equal((withdrawal.match(/drag_landing/g) ?? []).length, 1);
  assert.match(withdrawal, /drag_landing[^>]*data-drop-inventory-slot="3"/);
});

test("a wide pickup in fragmented Inventory keeps every owned item visible", () => {
  const items = [0, 2, 4].map((containerSlot, index) => ({ id: String(index), name: `Sword ${index}`, group: "weapons" as const, modifiers: {}, containerSlot }));
  const before = structuredClone(items);
  const layout = inventorySlotLayout([...items, { id: "wide", name: "Wide Sword", group: "weapons", modifiers: {}, slotSpan: 2 }], 5);
  assert.equal(layout.length, 5);
  assert.deepEqual(layout.filter(slot => slot && !slot.secondary).map(slot => slot!.item.id).sort(), ["0", "1", "2", "wide"]);
  assert.deepEqual(items, before);
});

test("migrated shared overflow remains visible with withdrawal guidance", () => {
  const items = Array.from({ length: 14 }, (_, index) => ({ id: String(index), name: `Sword ${index}`, group: "weapons" as const, modifiers: {} }));
  const html = render(<LockboxWindow boxId="shared-lockbox" items={items} center={null} drag={null} onClose={() => {}} onCancelDrag={() => {}} />);
  assert.equal((html.match(/data-drag-kind="lockbox"/g) ?? []).length, 14);
  assert.match(html, /Withdraw items to make room before depositing/);
  assert.doesNotMatch(html, /data-drop-item/);
});
