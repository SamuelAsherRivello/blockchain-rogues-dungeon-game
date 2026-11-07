import type { CSSProperties } from "react";
import type { EquipmentGroup } from "../types.ts";
import type { SlotCategory } from "../../ui/slot-colors.ts";
import { Tooltip } from "../../ui/Tooltip.tsx";

interface SlotEffect { icon: string; cost: string }
export type SlotShineTokens = Readonly<Record<string, number>>;
interface SlotItemProps { type?: string; slotType?: "ability" | "quickslot" | "equipment" | "inventory"; slotSubtype?: EquipmentGroup; category?: SlotCategory; number?: number; hotkey?: string; showShortcut?: boolean; text?: string; icon?: string; cost?: string | number; effects?: SlotEffect[]; details?: string; accentColor?: string; disabled?: boolean; unavailable?: boolean; onClick?: () => void; className?: string; shineKey?: string; shineTokens?: SlotShineTokens; dragSource?: Record<string, string | number>; dropTarget?: Record<string, string | number | boolean>; empty?: boolean; dragHandle?: boolean; tooltip?: string }
export function SlotItem({ type = "equipment", slotType, slotSubtype, category = type === "inventory" ? undefined : type === "quick" ? "quick" : type === "ability" ? "ability" : "equipment", number, hotkey, showShortcut = true, text = "", icon = "", cost = "", effects = [], details = "", accentColor = "", disabled = false, unavailable = false, onClick, className = "", shineKey, shineTokens = {}, dragSource = {}, dropTarget = {}, empty = false, dragHandle = true, tooltip = "" }: SlotItemProps) {
  const shineToken = shineKey ? shineTokens[shineKey] : undefined;
  const classes = ["slot_item", `slot_item--${type}`, disabled && "disabled", unavailable && "unavailable", className, shineToken && "slot_item--shine"].filter(Boolean).join(" ");
  const displayedEffects = effects.length ? effects : icon || cost ? [{ icon, cost: String(cost) }] : [];
  const actionable = !empty && (slotType === "ability" || slotType === "quickslot");
  const content = <>{type === "ability" && showShortcut && <strong className="slot_item_number">[{hotkey ?? (number ?? 0) + 1}]</strong>}{type === "quick" && showShortcut && hotkey && <kbd className="slot_item_hotkey">[{hotkey}]</kbd>}{empty ? <span className="empty_slot" aria-label={type === "ability" ? "Empty ability slot" : type === "quick" ? "Empty quick slot" : type === "inventory" ? "Empty inventory slot" : "Empty equipment slot"}>+</span> : <><span className="slot_item_text">{text}</span>{actionable && <button tabIndex={-1} type="button" className="slot_item_use" disabled={disabled || unavailable} aria-label={`Use ${text}`} onClick={(event) => { event.stopPropagation(); onClick?.(); }}>Use</button>}{displayedEffects.map((effect, index) => <span className="slot_item_effect" key={`${effect.icon}-${effect.cost}-${index}`}><i className="slot_item_icon">{effect.icon}</i><em className="slot_item_cost">{effect.cost}</em></span>)}{details && <small className="slot_item_details">{details}</small>}{dragHandle && <b className="drag_handle" aria-hidden="true">⠿</b>}</>}</>;
  const common = { className: classes, "data-slot-type": slotType ?? type, "data-slot-subtype": slotSubtype, "data-slot-category": category, "data-slot-empty": empty, "aria-disabled": unavailable || undefined, style: accentColor ? { "--slot-accent-color": accentColor } as CSSProperties : undefined, ...dropTarget, ...dragSource };
  const row = actionable ? <div key={shineToken} {...common} onClick={onClick}>{content}</div> : <button key={shineToken} tabIndex={-1} type="button" {...common} disabled={disabled} onClick={onClick}>{content}</button>;
  return tooltip ? <Tooltip content={tooltip}>{row}</Tooltip> : row;
}
