import { useState } from "react";
import type { AttributeName, Campaign } from "../types.ts";
import { Dialog, type DialogCenter } from "../../ui/dialog.tsx";
import { AttributesCard } from "../panels/attribute-panel.tsx";
import { formatPendingAttributeBenefits, pendingAttributeBenefitLabel } from "../attribute-benefits.ts";

export function ProgressionWindow({ campaign, onClose, onConfirm, center }: { campaign: Campaign; onClose(): void; onConfirm(allocation: Partial<Record<AttributeName, number>>): void; center?: DialogCenter | null }) {
  const [draft, setDraft] = useState<Partial<Record<AttributeName, number>>>({});
  const initialPoints = campaign.progression.attributePoints;
  const spent = Object.values(draft).reduce((sum, value) => sum + (value ?? 0), 0);
  const remaining = initialPoints - spent;
  const change = (name: AttributeName, amount: number) => setDraft((current) => {
    const allocated = current[name] ?? 0;
    if (amount < 0) return { ...current, [name]: Math.max(0, allocated - 1) };
    if (remaining <= 0 || campaign.progression.attributes[name] + allocated >= 99) return current;
    return { ...current, [name]: allocated + 1 };
  });
  const preview = { ...campaign.progression.attributes };
  for (const [name, amount] of Object.entries(draft) as [AttributeName, number][]) preview[name] += amount;
  const adjustments = {
    canDecrease: (name: AttributeName) => Boolean(draft[name]),
    canIncrease: (name: AttributeName) => remaining > 0 && campaign.progression.attributes[name] + (draft[name] ?? 0) < 99,
    onDecrease: (name: AttributeName) => change(name, -1),
    onIncrease: (name: AttributeName) => change(name, 1),
  };
  const benefits = formatPendingAttributeBenefits(campaign.progression.attributes, preview, campaign.player.equipment);
  return <Dialog title="Level Up — Character" onClose={onClose} className="progression-window" center={center}><p className="progression-window__points body_text">Spend {remaining} of {initialPoints} attribute point{initialPoints === 1 ? "" : "s"}.</p><div className="progression-window__attributes"><AttributesCard attributes={campaign.progression.attributes} preview={preview} adjustments={adjustments} /></div><p className="progression-window__results-heading body_text">Earned Results</p><ul className="progression-window__results" aria-label="Earned results">{benefits.map((benefit) => <li className="body_text" key={benefit.attribute}>{pendingAttributeBenefitLabel(benefit)}</li>)}</ul><div className="progression-window__actions"><button type="button" disabled={!spent} onClick={() => onConfirm(draft)}>Confirm {spent} attribute point{spent === 1 ? "" : "s"}</button><button type="button" onClick={onClose}>Cancel</button></div></Dialog>;
}
