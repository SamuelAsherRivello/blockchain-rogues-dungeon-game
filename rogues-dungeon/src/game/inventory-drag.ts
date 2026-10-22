import type { Action, Campaign, DragSource, DropDestination, EquipmentGroup, Item } from "./types.ts";
import { abilityItemInstance, effectiveAttributes, isQuickSlottableItem, previewEquipment, projectEquipmentSwap, quickSlotKey } from "../systems/procedural/world-procedural-system.ts";

export function previewInventoryDrop(campaign: Campaign, drag: DragSource | null, group: EquipmentGroup, index: number, targetItem: Item | null) {
  if (!drag) return null;
  if (drag.kind === "inventory" && drag.item.group === group) {
    const projected = projectEquipmentSwap(campaign, drag.item.id, group, index);
    return projected ? effectiveAttributes(projected.campaign) : null;
  }
  if (drag.kind === "slot" && drag.group === group && drag.index !== index) {
    const projected = structuredClone(campaign); const slots = projected.player.equipment[group];
    [slots[drag.index], slots[index]] = [slots[index], slots[drag.index]];
    return effectiveAttributes(projected);
  }
  return null;
}

export function resolveInventoryDrop(drag: DragSource | null, destination: DropDestination | null, targetItem: Item | null = null): Action | null {
  if (!drag || !destination) return null;
  if (destination.kind === "inventory" && drag.kind === "ability") return { type: "store-ability", index: drag.index };
  if (destination.kind === "drop-item") {
    if (drag.kind === "inventory") return { type: "drop-item", source: { kind: "inventory", itemId: drag.item.id } };
    if (drag.kind === "slot") return { type: "drop-item", source: { kind: "slot", group: drag.group, index: drag.index } };
    if (drag.kind === "quick-slot") return { type: "drop-item", source: { kind: "quick-slot", index: drag.index } };
    return { type: "drop-item", source: { kind: "ability", index: drag.index } };
  }
  if (isQuickSlottableItem(drag.item) && destination.kind === "slot") return null;
  if (destination.kind === "quick-slot") {
    if (drag.kind === "quick-slot") {
      if (drag.index === destination.index || (targetItem && !isQuickSlottableItem(targetItem))) return null;
      return { type: "move-quick-slot", from: drag.index, to: destination.index };
    }
    if (drag.kind !== "inventory" || !isQuickSlottableItem(drag.item) || (targetItem && !isQuickSlottableItem(targetItem))) return null;
    return { type: "assign-quick-slot", itemId: drag.item.id, index: destination.index };
  }
  if (destination.kind === "ability") {
    if (drag.kind === "ability" && drag.index !== destination.index) return { type: "assign-ability", from: drag.index, to: destination.index };
    if (drag.kind === "inventory" && drag.item.category === "ability") return { type: "assign-ability-from-inventory", itemId: drag.item.id, index: destination.index };
    return null;
  }
  if (destination.kind === "slot") {
    const { group, index } = destination;
    if (drag.kind === "inventory" && drag.item.group === group) return { type: "equip", itemId: drag.item.id, group, index };
    if (drag.kind === "slot" && drag.group === group && drag.index !== index) return { type: "reorder-equipment", group, index: drag.index, other: index };
    return null;
  }
  if (destination.kind === "inventory" && drag.kind === "quick-slot") return { type: "return-quick-slot", index: drag.index };
  if (destination.kind === "inventory" && drag.kind === "slot") return { type: "unequip", group: drag.group, index: drag.index };
  return null;
}

export function describeInventoryDrop(campaign: Campaign, drag: DragSource, destination: DropDestination, targetItem: Item | null = null) {
  const action = resolveInventoryDrop(drag, destination, targetItem);
  if (!action) return null;
  const destinationItem = destination.kind === "slot" ? campaign.player.equipment[destination.group][destination.index]
    : destination.kind === "quick-slot" ? campaign.player.quickSlots?.[destination.index]?.item ?? null
      : destination.kind === "ability" ? campaign.player.abilities[destination.index] ? abilityItemInstance(campaign.player.abilities[destination.index]!, `ability-${destination.index}`) : null
        : null;
  if (destination.kind === "quick-slot") {
    if (drag.kind === "inventory" && campaign.player.quickSlots?.some((slot, index) => index !== destination.index && slot && quickSlotKey(slot.item) === quickSlotKey(drag.item))) return null;
    const before = destinationItem ? { ...destinationItem, quantity: campaign.player.quickSlots?.[destination.index]?.quantity ?? 1 } : null;
    const quantity = drag.kind === "quick-slot" ? campaign.player.quickSlots?.[drag.index]?.quantity ?? 1 : drag.item.quantity ?? 1;
    const combining = before && quickSlotKey(before) === quickSlotKey(drag.item);
    return { action, destination, preview: null, before, after: { ...drag.item, quantity: quantity + (combining ? before.quantity : 0) } };
  }
  if (destination.kind === "drop-item") return { action, destination, preview: null, before: drag.item, after: null };
  if (destination.kind === "ability" || destination.kind === "inventory" && drag.kind === "ability") return { action, destination, preview: null, before: destinationItem, after: drag.item };
  if (destination.kind === "inventory" && (drag.kind === "slot" || drag.kind === "quick-slot")) {
    const quantity = drag.kind === "quick-slot" ? campaign.player.quickSlots?.[drag.index]?.quantity ?? 0 : 1;
    if (campaign.player.inventory.length + quantity > campaign.player.inventoryCapacity) return null;
    if (drag.kind === "quick-slot") return { action, destination, preview: null, before: drag.item, after: null };
    return { action, destination, preview: previewEquipment(campaign, drag.item, drag.group, drag.index, "unequip"), before: drag.item, after: null };
  }
  if (destination.kind !== "slot") return null;
  return { action, destination, preview: previewInventoryDrop(campaign, drag, destination.group, destination.index, targetItem), before: destinationItem, after: drag.item };
}
