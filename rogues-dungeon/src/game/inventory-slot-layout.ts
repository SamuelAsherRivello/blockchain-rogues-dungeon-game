import type { Item } from "./types.ts";

export interface InventorySlot { item: Item; anchor: number; secondary: boolean }

/** Explicit positions win; items without a position fill the remaining gaps. */
export function inventorySlotLayout(items: readonly Item[], capacity: number): (InventorySlot | null)[] {
  const length = Math.max(capacity, items.reduce((total, item) => total + (item.slotSpan ?? 1), 0));
  const slots: (InventorySlot | null)[] = Array.from({ length }, () => null);
  const pending: Item[] = [];
  const fits = (item: Item, index: number) => index >= 0 && index + (item.slotSpan ?? 1) <= length
    && Array.from({ length: item.slotSpan ?? 1 }, (_, offset) => slots[index + offset]).every(slot => !slot);
  const place = (item: Item, anchor: number) => {
    for (let offset = 0; offset < (item.slotSpan ?? 1); offset++) slots[anchor + offset] = { item, anchor, secondary: offset > 0 };
  };
  const ordered = [...items].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  for (const item of ordered) {
    if (Number.isSafeInteger(item.containerSlot) && fits(item, item.containerSlot!)) place(item, item.containerSlot!);
    else pending.push(item);
  }
  for (const item of pending) {
    const anchor = slots.findIndex((_, index) => fits(item, index));
    if (anchor >= 0) place(item, anchor);
    else {
      // Capacity changes or a new wide pickup may require compacting fragmented
      // positions. Keep every owned item visible rather than hiding overflow.
      slots.fill(null);
      let index = 0;
      for (const entry of ordered) { place(entry, index); index += entry.slotSpan ?? 1; }
      break;
    }
  }
  return slots;
}
