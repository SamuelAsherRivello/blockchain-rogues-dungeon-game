import type { Item } from "../types.ts";
import { ScrollArea } from "../../ui/ScrollArea.tsx";
import { SlotItem, type SlotShineTokens } from "./slot-item.tsx";
import { inventoryItemHelp, itemDisplayName, itemPresentation, itemSlotCategory, stackInventoryItems } from "../inventory-presentation.ts";
import type { DragPresentation } from "../game.tsx";
import { inventorySlotLayout } from "../inventory-slot-layout.ts";

export interface InventoryRowsProps {
  items?: Item[];
  capacity: number;
  containerId?: string;
  showDropItem?: boolean;
  drag?: DragPresentation | null;
  shineTokens?: SlotShineTokens;
}

/** Both player Inventory and lockboxes render through this container-aware view. */
export function InventoryRows({ items = [], capacity, containerId = "inventory", showDropItem = true, drag = null, shineTokens = {} }: InventoryRowsProps) {
  const storage = containerId !== "inventory";
  const stacks = stackInventoryItems(items);
  const slots = inventorySlotLayout(stacks.map(({ item }) => item), capacity);
  const quantities = new Map(stacks.map(({ item, quantity }) => [item.id, quantity]));
  const destination = drag?.destination;
  const landingIndex = destination?.kind === "inventory" && !storage
    || destination?.kind === "lockbox" && destination.boxId === containerId ? destination.index : undefined;
  return <div className="inventory-container" data-drop-container={containerId}>
    {showDropItem && <div className="inventory_drop_item_row"><SlotItem type="inventory" slotType="inventory" text="[ Drop Item ]" className={["inventory_drop_item", drag?.destination?.kind === "drop-item" && "drag_landing"].filter(Boolean).join(" ")} dragHandle={false} dropTarget={{ "data-drop-item": true }} tooltip="Drag an item here to drop it into the world." /></div>}
    <ScrollArea className="inventory_scroll">
      {slots.map((slot, index) => {
        const landing = landingIndex === index;
        const dropTarget: Record<string, string | number | boolean> = storage ? { "data-drop-lockbox": containerId, "data-drop-index": index } : { "data-drop-inventory-slot": index };
        if (!slot) return <SlotItem key={`empty-${containerId}-${index}`} type="inventory" slotType="inventory" category={landing && drag ? itemSlotCategory(drag.item) : undefined} className={["inventory_item", landing && "drag_landing"].filter(Boolean).join(" ")} dropTarget={dropTarget} empty dragHandle={false} tooltip="Empty inventory slot." />;
        const { item, secondary } = slot;
        const quantity = quantities.get(item.id) ?? 1;
        const departure = !secondary && drag?.source.item.id === item.id && (storage ? drag.source.kind === "lockbox" && drag.source.boxId === containerId : drag.source.kind === "inventory");
        const name = `${itemDisplayName(item, quantity)}${secondary ? " (2)" : ""}`;
        return <SlotItem key={`${item.id}-${secondary ? 1 : 0}`} type="inventory" slotType="inventory" category={itemSlotCategory(item)} text={name} effects={itemPresentation(item)} shineKey={!storage ? item.consumableResource ? `inventory-resource:${item.consumableResource}` : `inventory:${item.id}` : undefined} shineTokens={shineTokens} className={["inventory_item", secondary && "slot_item--occupied-secondary", departure && "drag_departure", landing && "drag_landing"].filter(Boolean).join(" ")} dropTarget={dropTarget} dragSource={!secondary ? { "data-drag-kind": storage ? "lockbox" : "inventory", "data-drag-container": containerId, "data-drag-id": item.id, "data-inventory-item-id": item.id, "data-inventory-resource": item.consumableResource ?? "", "aria-label": `Drag ${name}` } : {}} tooltip={secondary ? `${item.name} occupies this position.` : storage ? "Drag to your Inventory." : inventoryItemHelp(item)} />;
      })}
    </ScrollArea>
  </div>;
}
