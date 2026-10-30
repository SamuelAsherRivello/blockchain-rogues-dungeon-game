import { abilityCatalog } from "../../systems/procedural/world-procedural-system.ts";
import type { Campaign, Item } from "../types.ts";
import { SLOT_COLORS } from "../../ui/slot-colors.ts";
import { itemDisplayName, itemSlotCategory, itemPresentation, SlotItem, stackInventoryItems, type DragPresentation } from "../game.tsx";

export function ItemDragPreview({ campaign, drag }: { campaign: Campaign; drag: DragPresentation | null }) {
  if (!drag) return null;
  if (drag.source.kind === "ability") {
    const ability = drag.source.item.abilityId ? abilityCatalog[drag.source.item.abilityId] : null;
    return ability && <div className="item-drag-preview" style={{ left: drag.x, top: drag.y }} aria-hidden="true"><SlotItem type="ability" number={drag.source.index} text={ability.title} icon={ability.icon} cost={ability.manaCost} accentColor={SLOT_COLORS.ability} /></div>;
  }
  const item = drag.source.item as Item;
  const effects = itemPresentation(item);
  const quantity = drag.source.kind === "quick-slot" ? campaign.player.quickSlots?.[drag.source.index]?.quantity ?? 1 : drag.source.kind === "inventory" ? stackInventoryItems(campaign.player.inventory).find((stack) => stack.item.id === item.id)?.quantity ?? 1 : item.quantity ?? 1;
  return <div className="item-drag-preview" style={{ left: drag.x, top: drag.y }} aria-hidden="true"><SlotItem type={drag.source.kind === "slot" ? "equipment" : drag.source.kind === "quick-slot" ? "quick" : "inventory"} category={itemSlotCategory(item)} text={itemDisplayName(item, quantity)} effects={effects} /></div>;
}
