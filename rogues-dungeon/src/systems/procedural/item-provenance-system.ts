import type { Campaign, Floor, Item, ItemLot } from "../../game/types.ts";

export function runItemIdentity(campaign: Campaign, id: string) { return `${campaign.worldSeed ?? campaign.floor.seed}:${campaign.slot ?? 1}:${campaign.run ?? 1}:${id}`; }

export function quantityLots(lots: readonly ItemLot[], quantity: number): ItemLot[] {
  let left = quantity;
  return lots.flatMap(lot => {
    const amount = Math.min(left, lot.quantity); left -= amount;
    return amount > 0 ? [{ ...lot, quantity: amount }] : [];
  });
}

export function itemLots(campaign: Campaign, item: Item, quantity = item.quantity ?? 1): ItemLot[] {
  const lots = campaign.itemProvenance?.[item.id] ?? [{ id: runItemIdentity(campaign, item.id), quantity }];
  return quantityLots(lots, quantity);
}

export function mergeItemProvenance(campaign: Campaign, target: Item, source: Item, targetQuantity = target.quantity ?? 1, sourceQuantity = source.quantity ?? 1) {
  const lots = [...itemLots(campaign, target, targetQuantity), ...itemLots(campaign, source, sourceQuantity)];
  campaign.itemProvenance ??= {};
  campaign.itemProvenance[target.id] = lots;
}

export function consumeItemProvenance(campaign: Campaign, item: Item, quantity: number, consumed = 1) {
  const lots = itemLots(campaign, item, quantity);
  let left = consumed;
  campaign.itemProvenance ??= {};
  campaign.itemProvenance[item.id] = lots.flatMap(lot => {
    const amount = Math.min(left, lot.quantity); left -= amount;
    return lot.quantity > amount ? [{ ...lot, offset: (lot.offset ?? 0) + amount, quantity: lot.quantity - amount }] : [];
  });
}

/** Remove only the superseded quantities, preserving unrelated checkpoint state. */
export function applyStorageExclusions(campaign: Campaign) {
  const excluded = campaign.storageExclusions;
  if (!excluded?.length) return campaign;
  const filtered = (item: Item, quantity = item.quantity ?? 1): Item | null => {
    const lots = itemLots(campaign, item, quantity);
    const remaining = lots.flatMap(lot => {
      let ranges = [{ start: lot.offset ?? 0, end: (lot.offset ?? 0) + lot.quantity }];
      for (const removal of excluded.filter(entry => entry.id === lot.id)) {
        const start = removal.offset ?? 0, end = start + removal.quantity;
        ranges = ranges.flatMap(range => end <= range.start || start >= range.end ? [range] : [
          ...(start > range.start ? [{ start: range.start, end: start }] : []),
          ...(end < range.end ? [{ start: end, end: range.end }] : []),
        ]);
      }
      return ranges.map(range => ({ id: lot.id, offset: range.start, quantity: range.end - range.start }));
    });
    const count = remaining.reduce((sum, lot) => sum + lot.quantity, 0);
    if (count === quantity) return item;
    if (!count) return null;
    campaign.itemProvenance ??= {};
    campaign.itemProvenance[item.id] = remaining;
    return { ...item, quantity: count };
  };
  campaign.player.inventory = campaign.player.inventory.flatMap(item => filtered(item) ?? []);
  for (const group of Object.values(campaign.player.equipment)) {
    for (let index = 0; index < group.length; index++) if (group[index]) group[index] = filtered(group[index]!);
  }
  campaign.player.quickSlots = campaign.player.quickSlots?.map(slot => {
    if (!slot) return null;
    const item = filtered(slot.item, slot.quantity);
    return item ? { item, quantity: item.quantity ?? slot.quantity } : null;
  }) as Campaign["player"]["quickSlots"];
  const floors = new Set<Floor>([campaign.floor, ...Object.values(campaign.floors ?? {})]);
  for (const floor of floors) floor.entities = floor.entities.flatMap(entity => {
    if (entity.kind === "item") { const item = filtered(entity.item); return item ? [{ ...entity, item }] : []; }
    if (entity.kind === "potion") {
      const item = filtered({ id: entity.id, name: "Potion", group: "weapons", modifiers: {}, quantity: entity.quantity ?? 1 });
      return item ? [{ ...entity, quantity: item.quantity }] : [];
    }
    return [entity];
  });
  return campaign;
}
