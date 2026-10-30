import type { Campaign, Item, ItemLot, LockboxStorage } from "../../game/types.ts";
import { effectiveInventoryCapacity, inventoryFitsCapacity, inventorySlotCount, isQuickSlottableItem, quickSlotKey } from "../procedural/world-procedural-system.ts";
import { inventorySlotLayout } from "../../game/inventory-slot-layout.ts";
import { applyStorageExclusions, itemLots, quantityLots } from "../procedural/item-provenance-system.ts";
import { copyCampaignMutableState } from "../procedural/campaign-copy-system.ts";
import { SHARED_LOCKBOX_ID } from "../../game/lockbox-identity.ts";
export { SHARED_LOCKBOX_ID } from "../../game/lockbox-identity.ts";

export const LOCKBOX_CAPACITY = 10;
export function emptyLockboxState(): LockboxStorage { return { version: 1, revision: 0, containers: {}, journal: [] }; }

export function validateLockboxState(value: unknown): LockboxStorage {
  const state = value as LockboxStorage;
  if (!state || state.version !== 1 || !Number.isSafeInteger(state.revision) || state.revision < 0 || !state.containers || typeof state.containers !== "object" || Array.isArray(state.containers) || !Array.isArray(state.journal)) throw new Error("Invalid saved lockbox storage. Saved data was left unchanged.");
  const ids = new Set<string>();
  const validLot = (lot: ItemLot) => lot && typeof lot.id === "string" && lot.id.length > 0 && Number.isSafeInteger(lot.quantity) && lot.quantity > 0 && (lot.offset === undefined || Number.isSafeInteger(lot.offset) && lot.offset >= 0);
  if (state.provenance !== undefined && (!state.provenance || typeof state.provenance !== "object" || Array.isArray(state.provenance) || Object.values(state.provenance).some(lots => !Array.isArray(lots) || lots.some(lot => !validLot(lot))))) throw new Error("Invalid saved lockbox provenance.");
  for (const [key, items] of Object.entries(state.containers)) {
    const shared = key === SHARED_LOCKBOX_ID;
    if ((!shared && !/^[a-z0-9-]+:\d+$/.test(key)) || !Array.isArray(items) || inventorySlotCount(items) > LOCKBOX_CAPACITY && (!shared || state.legacyOverflow !== true)) throw new Error("Invalid saved lockbox contents.");
    for (const item of items) {
      if (!item || typeof item.id !== "string" || !item.id || typeof item.name !== "string" || !item.modifiers || !["weapons", "armor", "jewels"].includes(item.group) || ids.has(item.id) || (item.slotSpan !== undefined && item.slotSpan !== 1 && item.slotSpan !== 2) || (item.quantity !== undefined && (!Number.isSafeInteger(item.quantity) || item.quantity < 1))) throw new Error("Invalid saved lockbox item.");
      ids.add(item.id);
    }
  }
  for (const entry of state.journal) {
    if (!entry || !Number.isSafeInteger(entry.revision) || entry.revision < 1 || entry.revision > state.revision || !["deposit", "withdraw"].includes(entry.direction) || !Array.isArray(entry.lots) || entry.lots.some(lot => !validLot(lot))) throw new Error("Invalid saved lockbox ownership.");
  }
  if (state.legacyOverflow !== undefined && typeof state.legacyOverflow !== "boolean") throw new Error("Invalid saved lockbox overflow marker.");
  return consolidateLockboxes(state);
}

/** Reset old independent contents once, preserving any existing shared store. */
function consolidateLockboxes(storage: LockboxStorage): LockboxStorage {
  const next = structuredClone(storage);
  for (const key of Object.keys(next.containers)) if (key !== SHARED_LOCKBOX_ID) delete next.containers[key];
  if (inventorySlotCount(next.containers[SHARED_LOCKBOX_ID] ?? []) <= LOCKBOX_CAPACITY) delete next.legacyOverflow;
  return next;
}

const order = (items: Item[]) => items.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));

/** A whole-row transfer is calculated without mutating either authoritative input. */
export function transferLockboxItem(campaign: Campaign, storage: LockboxStorage, boxId: string, source: "inventory" | "lockbox", itemId: string, destinationIndex?: number) {
  if (boxId !== SHARED_LOCKBOX_ID) return null;
  const nextStorage = consolidateLockboxes(storage);
  const previous = source === "inventory" ? campaign.player.inventory : nextStorage.containers[boxId] ?? [];
  const item = previous.find(entry => entry.id === itemId);
  if (!item) return null;
  const nextCampaign = copyCampaignMutableState(campaign);
  const box = nextStorage.containers[boxId] ??= [];
  if (source === "inventory" && inventorySlotCount(box) > LOCKBOX_CAPACITY) return null;
  const from = source === "inventory" ? nextCampaign.player.inventory : box;
  const to = source === "inventory" ? box : nextCampaign.player.inventory;
  // Freeze the current displayed positions before removing a row so the other
  // items do not shift into its vacated slot.
  for (const slot of inventorySlotLayout(from, source === "inventory" ? effectiveInventoryCapacity(nextCampaign) : LOCKBOX_CAPACITY)) if (slot && !slot.secondary) slot.item.containerSlot = slot.anchor;
  for (const slot of inventorySlotLayout(to, source === "inventory" ? LOCKBOX_CAPACITY : effectiveInventoryCapacity(nextCampaign))) if (slot && !slot.secondary) slot.item.containerSlot = slot.anchor;
  const moved = from.splice(from.findIndex(entry => entry.id === itemId), 1)[0]!;
  const sourceLots = source === "inventory" ? itemLots(nextCampaign, moved) : storageItemLots(nextStorage, moved);
  // A withdrawal is a new run-ownership epoch. Older exclusions retire the source
  // copies in checkpoints/worlds without deleting this deliberately withdrawn copy.
  const lots = source === "inventory" ? sourceLots : sourceLots.map(lot => ({ ...lot, id: `${lot.id}@withdraw-${storage.revision + 1}` }));
  if (source === "lockbox") moved.keepInInventory = true;
  const existing = isQuickSlottableItem(moved) ? to.find(entry => isQuickSlottableItem(entry) && quickSlotKey(entry) === quickSlotKey(moved)) : undefined;
  const capacity = source === "inventory" ? LOCKBOX_CAPACITY : effectiveInventoryCapacity(nextCampaign, [...to, moved]);
  const slots = inventorySlotLayout(to, capacity);
  const available = (index: number) => Number.isSafeInteger(index) && index >= 0 && index + (moved.slotSpan ?? 1) <= capacity
    && Array.from({ length: moved.slotSpan ?? 1 }, (_, offset) => slots[index + offset]).every(slot => !slot || slot.item === existing);
  const index = destinationIndex ?? existing?.containerSlot ?? slots.findIndex((_, anchor) => available(anchor));
  if (!available(index)) return null;
  moved.containerSlot = index;
  nextCampaign.itemProvenance ??= {};
  if (existing) {
    existing.containerSlot = index;
    if (source === "lockbox") existing.keepInInventory = true;
    const destinationLots = source === "inventory" ? storageItemLots(nextStorage, existing) : itemLots(nextCampaign, existing);
    nextCampaign.itemProvenance[existing.id] = [...destinationLots, ...lots];
    existing.quantity = (existing.quantity ?? 1) + (moved.quantity ?? 1);
    // Container provenance is kept with the journal under its resulting display ID.
    moved.id = existing.id;
  } else {
    const collision = to.some(entry => entry.id === moved.id) || source === "inventory" && Object.values(nextStorage.containers).some(items => items.some(entry => entry.id === moved.id));
    if (collision) moved.id = `${moved.id}@storage-${storage.revision + 1}`;
    to.push(moved);
    nextCampaign.itemProvenance[moved.id] = lots;
  }
  if (source === "inventory" && inventorySlotCount(box) > LOCKBOX_CAPACITY || !inventoryFitsCapacity(nextCampaign)) return null;
  if (inventorySlotCount(box) <= LOCKBOX_CAPACITY) delete nextStorage.legacyOverflow;
  order(to);
  nextStorage.revision++;
  nextStorage.journal.push({ revision: nextStorage.revision, direction: source === "inventory" ? "deposit" : "withdraw", lots: sourceLots });
  nextStorage.provenance ??= {};
  nextStorage.provenance[moved.id] = nextCampaign.itemProvenance[moved.id] ?? lots;
  nextCampaign.storageRevision = nextStorage.revision;
  return { campaign: nextCampaign, storage: nextStorage };
}

function storageItemLots(storage: LockboxStorage, item: Item): ItemLot[] {
  const lots = storage.provenance?.[item.id];
  return lots ? quantityLots(lots, item.quantity ?? 1) : [{ id: `retained:${item.id}`, quantity: item.quantity ?? 1 }];
}

/** Current containers and post-checkpoint deposits take precedence over rewind. */
export function reconcileLockboxRecovery(campaign: Campaign, storage: LockboxStorage) {
  const next = structuredClone(campaign), excluded = [...next.storageExclusions ?? []];
  for (const entry of storage.journal) if (entry.direction === "deposit" && entry.revision > (campaign.storageRevision ?? 0)) {
    excluded.push(...entry.lots);
  }
  for (const items of Object.values(storage.containers)) for (const item of items) {
    excluded.push(...storageItemLots(storage, item));
  }
  next.storageExclusions = [...new Map(excluded.map(lot => [`${lot.id}:${lot.offset ?? 0}:${lot.quantity}`, lot])).values()];
  next.storageRevision = storage.revision;
  return applyStorageExclusions(next);
}
