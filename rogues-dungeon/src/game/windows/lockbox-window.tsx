import { useEffect } from "react";
import { Dialog, type DialogCenter } from "../../ui/dialog.tsx";
import type { Item } from "../types.ts";
import type { DragPresentation } from "../game.tsx";
import { InventoryRows } from "../controls/inventory-rows.tsx";

export function LockboxWindow({ boxId, items, center, drag, onClose, onCancelDrag }: { boxId: string; items: Item[]; center: DialogCenter | null; drag: DragPresentation | null; onClose(): void; onCancelDrag(): void }) {
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault(); event.stopImmediatePropagation();
      if (drag) onCancelDrag(); else onClose();
    };
    window.addEventListener("keydown", escape, true);
    return () => window.removeEventListener("keydown", escape, true);
  }, [drag, onCancelDrag, onClose]);
  const overflow = items.reduce((used, item) => used + (item.slotSpan ?? 1), 0) > 10;
  return <Dialog title="Lockbox" onClose={onClose} center={center} className="settings-window settings-window--game lockbox-window" dismissible={false} showCloseButton footer={overflow ? <span role="status">Withdraw items to make room before depositing. All existing items have been kept.</span> : null}>
    <InventoryRows items={items} capacity={10} containerId={boxId} showDropItem={false} drag={drag} />
  </Dialog>;
}
