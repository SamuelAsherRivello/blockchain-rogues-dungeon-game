import type { AttributeName, Item } from "./types.ts";
import type { SlotCategory } from "../ui/slot-colors.ts";
import { attributeLabels, isQuickSlottableItem, quickSlotKey } from "../systems/procedural/world-procedural-system.ts";

export const itemIcons: Partial<Record<string, string>> = { health: "♥", stamina: "◈", offense: "⚔", defense: "⛨", mana: "✦", xp: "★", capacity: "▣" };
export function itemPresentation(item: Item | null) { return [...Object.entries(item?.modifiers ?? {}).flatMap(([attribute, amount]) => Number.isFinite(amount) ? [{ icon: itemIcons[attribute] ?? "◆", cost: `${amount! >= 0 ? "+" : ""}${amount}` }] : []), ...(item?.category === "capacity" ? [{ icon: itemIcons.capacity!, cost: "+5" }] : [])]; }
export function stackInventoryItems(inventory: Item[]) {
  const stacks: { item: Item; quantity: number }[] = [], indexes = new Map<string, number>();
  for (const item of inventory) {
    const key = isQuickSlottableItem(item) ? quickSlotKey(item) : null;
    if (key && indexes.has(key)) stacks[indexes.get(key)!]!.quantity += item.quantity ?? 1;
    else { if (key) indexes.set(key, stacks.length); stacks.push({ item, quantity: isQuickSlottableItem(item) ? item.quantity ?? 1 : 1 }); }
  }
  return stacks;
}
export function itemSlotCategory(item: Item): SlotCategory { return item.category === "ability" ? "ability" : isQuickSlottableItem(item) ? "quick" : "equipment"; }
export function itemDisplayName(item: Item, quantity: number) { return isQuickSlottableItem(item) ? `${item.name} x ${quantity}` : `${item.name}${quantity > 1 ? ` x ${quantity}` : ""}`; }
export function modifierSummary(item: Item | null) {
  if (!item) return "";
  const modifiers = Object.entries(item.modifiers ?? {}).map(([name, value]) => `${attributeLabels[name as AttributeName] ?? name} ${value >= 0 ? "+" : ""}${value}`);
  if (item.category === "capacity") modifiers.push("Carrying capacity +5");
  if (Number.isFinite(item.hitChance)) modifiers.push(`HIT ${item.hitChance}%`);
  if (Number.isFinite(item.critChance)) modifiers.push(`CRIT ${item.critChance}%`);
  if (item.perks?.length) modifiers.push(item.perks.join(", "));
  return modifiers.join(", ");
}
export function inventoryItemHelp(item: Item) { const effect = modifierSummary(item); return effect ? `${effect}${item.slotSpan === 2 ? ". Uses both positions." : ""} Drag to equip.` : "No stats · Drag to equip."; }
