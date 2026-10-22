import { useEffect, useRef, useState } from "react";
import type { AttributeName, Attributes } from "../types.ts";
import { attributeLabels as attributeLabelsDefault, progressionStatNames } from "../../systems/procedural/world-procedural-system.ts";
import { Tooltip } from "../../ui/Tooltip.tsx";
import { GameCard, type PanelPopup } from "../cards/game-card.tsx";

export const attributeHelp: Record<AttributeName, string> = {
  health: "Expands maximum Health; zero ends the run.",
  stamina: "Boosts offense and boosts defense.",
  offense: "Increases outgoing damage.",
  defense: "Decreases incoming damage.",
  mana: "Increases maximum Mana for abilities.",
  perception: "Improves detection of enemies and points of interest.",
  strength: "(Not implemented.)",
  luck: "Improves loot quality.",
  recovery: "Restores Stamina on each move.",
  stealth: "(Not implemented.)",
};

export function DeltaValue({ value, tone = "" }: { value: number; tone?: "" | "green" | "red" }) {
  const previousTone = useRef(tone);
  const [pulseVersion, setPulseVersion] = useState(0);
  useEffect(() => {
    const toneChanged = previousTone.current !== tone;
    previousTone.current = tone;
    if (toneChanged && tone) setPulseVersion((version) => version + 1);
  }, [tone]);
  return <span className="delta_value"><b key={pulseVersion} className={["delta_value_number", tone && `delta_value_${tone}`, pulseVersion > 0 && "delta_value_pulse"].filter(Boolean).join(" ")}>{value}</b></span>;
}

export type AttributeAdjustments<N extends string = AttributeName> = {
  canDecrease(name: N): boolean;
  canIncrease(name: N): boolean;
  onDecrease(name: N): void;
  onIncrease(name: N): void;
};

export function AttributePanel<N extends string = AttributeName>({ attributes, preview = null, help = {}, theme = "dark", adjustments, names, labels }: { attributes: Record<N, number>; preview?: Record<N, number> | null; help?: Partial<Record<N, string>>; theme?: "light" | "dark"; adjustments?: AttributeAdjustments<N>; names?: readonly N[]; labels?: Record<N, string> }) {
  const ordered = names ?? progressionStatNames as unknown as readonly N[];
  const columns = [ordered.slice(0, Math.ceil(ordered.length / 2)), ordered.slice(Math.ceil(ordered.length / 2))];
  const attributeLabels = labels ?? attributeLabelsDefault as unknown as Record<N, string>;
  return <div className={`attribute_grid attribute-panel attribute-panel--${theme}`}>{columns.map((column, index) => <div key={index}>{column.map((name) => {
    const value = preview?.[name] ?? attributes[name];
    const tone = value === attributes[name] ? "" : value > attributes[name] ? "green" : "red";
    const label = <span className="attribute_panel__label">{attributeLabels[name]}</span>;
    const decreaseEnabled = adjustments?.canDecrease(name) ?? false;
    const increaseEnabled = adjustments?.canIncrease(name) ?? false;
    const decreaseButton = <button type="button" aria-label={`Decrease ${attributeLabels[name]}`} disabled={!decreaseEnabled} onClick={() => adjustments?.onDecrease(name)}>‹</button>;
    const increaseButton = <button type="button" aria-label={`Increase ${attributeLabels[name]}`} disabled={!increaseEnabled} onClick={() => adjustments?.onIncrease(name)}>›</button>;
    const valueControl = adjustments ? <span className="attribute_adjustment">{decreaseEnabled ? <Tooltip content={`Decrease ${attributeLabels[name]} to ${value - 1}.`}>{decreaseButton}</Tooltip> : decreaseButton}<DeltaValue value={value} tone={tone} />{increaseEnabled ? <Tooltip content={`Increase ${attributeLabels[name]} to ${value + 1}.`}>{increaseButton}</Tooltip> : increaseButton}</span> : <DeltaValue value={value} tone={tone} />;
    return <div className="attribute_item" key={name}>{help[name] ? <Tooltip content={help[name]}><button tabIndex={-1} type="button" className="attribute_tooltip_trigger">{attributeLabels[name]}</button></Tooltip> : label}{valueControl}</div>;
  })}</div>)}</div>;
}

export function AttributesCard({ attributes, preview = null, contentHidden = false, panelPopup, adjustments, shineToken }: { attributes: Attributes; preview?: Attributes | null; contentHidden?: boolean; panelPopup?: PanelPopup; adjustments?: AttributeAdjustments; shineToken?: number }) {
  return <GameCard title="Attributes" contentHidden={contentHidden} panelPopup={panelPopup} shineToken={shineToken}><AttributePanel attributes={attributes} preview={preview} help={attributeHelp} adjustments={adjustments} /></GameCard>;
}
