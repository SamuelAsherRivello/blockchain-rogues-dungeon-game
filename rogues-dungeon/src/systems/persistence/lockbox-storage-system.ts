import type { Campaign, Item, ItemLot, LockboxStorage } from "../../game/types.ts";
import { inventoryFitsCapacity, inventorySlotCount, isQuickSlottableItem, quickSlotKey } from "../procedural/world-procedural-system.ts";
import { applyStorageExclusions, itemLots, quantityLots } from "../procedural/item-provenance-system.ts";

export const LOCKBOX_CAPACITY = 10;
export function emptyLockboxState(): LockboxStorage { return { version: 1, revision: 0, containers: {}, journal: [] }; }

export function validateLockboxState(value: unknown): LockboxStorage {
  const state = value as LockboxStorage;
  if (!state || state.version !== 1 || !Number.isSafeInteger(state.revision) || state.revision < 0 || !state.containers || typeof state.containers !== "object" || Array.isArray(state.containers) || !Array.isArray(state.journal)) throw new Error("Invalid saved lockbox storage. Saved data was left unchanged.");
  const ids = new Set<string>();
  for (const [key, items] of Object.entries(state.containers)) {
    if (!/^[a-z0-9-]+:\d+$/.test(key) || !Array.isArray(items) || inventorySlotCount(items) > LOCKBOX_CAPACITY) throw new Error("Invalid saved lockbox contents.");
    for (const item of items) {
      if (!item || typeof item.id !== "string" || !item.id || typeof item.name !== "string" || !item.modifiers || !["weapons", "armor", "jewels"].includes(item.group) || ids.has(item.id) || (item.quantity !== undefined && (!Number.isSafeInteger(item.quantity) || item.quantity < 1))) throw new Error("Invalid saved lockbox item.");
      ids.add(item.id);
    }
  }
  for (const entry of state.journal) {
    if (!Number.isSafeInteger(entry.revision) || entry.revision < 1 || entry.revision > state.revision || !["deposit", "withdraw"].includes(entry.direction) || !Array.isArray(entry.lots) || entry.lots.some(lot => !lot || typeof lot.id !== "string" || !Number.isSafeInteger(lot.quantity) || lot.quantity < 1)) throw new Error("Invalid saved lockbox ownership.");
  }
  return structuredClone(state);
}

const order = (items: Item[]) => items.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));

/** A whole-row transfer is calculated without mutating either authoritative input. */
export function transferLockboxItem(campaign: Campaign, storage: LockboxStorage, boxId: string, source: "inventory" | "lockbox", itemId: string) {
  if (!/^[a-z0-9-]+:\d+$/.test(boxId)) return null;
  const previous = source === "inventory" ? campaign.player.inventory : storage.containers[boxId] ?? [];
  const item = previous.find(entry => entry.id === itemId);
  if (!item) return null;
  const nextCampaign = structuredClone(campaign), nextStorage = structuredClone(storage);
  const box = nextStorage.containers[boxId] ??= [];
  const from = source === "inventory" ? nextCampaign.player.inventory : box;
  const to = source === "inventory" ? box : nextCampaign.player.inventory;
  const moved = from.splice(from.findIndex(entry => entry.id === itemId), 1)[0]!;
  const lots = source === "inventory" ? itemLots(nextCampaign, moved) : storageItemLots(storage, moved);
  const existing = isQuickSlottableItem(moved) ? to.find(entry => isQuickSlottableItem(entry) && quickSlotKey(entry) === quickSlotKey(moved)) : undefined;
  nextCampaign.itemProvenance ??= {};
  if (existing) {
    const destinationLots = source === "inventory" ? storageItemLots(storage, existing) : itemLots(nextCampaign, existing);
    nextCampaign.itemProvenance[existing.id] = [...destinationLots, ...lots];
    existing.quantity = (existing.quantity ?? 1) + (moved.quantity ?? 1);
    // Container provenance is kept with the journal under its resulting display ID.
    moved.id = existing.id;
  } else {
    if (to.some(entry => entry.id === moved.id)) return null;
    to.push(moved);
    nextCampaign.itemProvenance[moved.id] = lots;
  }
  if (inventorySlotCount(box) > LOCKBOX_CAPACITY || !inventoryFitsCapacity(nextCampaign)) return null;
  order(to);
  nextStorage.revision++;
  nextStorage.journal.push({ revision: nextStorage.revision, direction: source === "inventory" ? "deposit" : "withdraw", lots });
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
