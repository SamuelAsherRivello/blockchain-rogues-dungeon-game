import type { Attributes, Equipment, AttributeName } from "./types.ts";
import { attributeLabels, effectiveAttributesFor, progressionStatNames } from "../systems/procedural/world-procedural-system.ts";

export interface PendingAttributeBenefit {
  attribute: AttributeName;
  text: string;
}

function signed(value: number) { return `${value >= 0 ? "+" : ""}${value}`; }
function percentage(value: number) { return `${value >= 0 ? "+" : ""}${Math.round(value)}%`; }
function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }

function luckBenefit(committed: Attributes, preview: Attributes, equipment: Equipment) {
  const committedEffective = effectiveAttributesFor(committed, equipment);
  const previewEffective = effectiveAttributesFor(preview, equipment);
  const weapon = equipment.weapons.find((item) => item?.hitChance !== undefined);
  const committedHitChance = clamp((weapon?.hitChance ?? 100) + committedEffective.luck, 0, 100);
  const previewHitChance = clamp((weapon?.hitChance ?? 100) + previewEffective.luck, 0, 100);
  const hitDelta = previewHitChance - committedHitChance;
  const committedTier = Math.floor(committedEffective.luck / 2);
  const previewTier = Math.floor(previewEffective.luck / 2);
  const tierDelta = previewTier - committedTier;
  const parts: string[] = [];
  if (hitDelta) parts.push(`Hit chance ${signed(hitDelta)}%`);
  if (tierDelta) parts.push(`Loot tier ${signed(tierDelta)}`);
  else if (previewEffective.luck % 2 !== 0) parts.push(`${previewEffective.luck % 2}/2 toward next loot tier`);
  return parts.join("; ") || "No additional benefit at current cap.";
}

function benefitText(attribute: AttributeName, committed: Attributes, preview: Attributes, equipment: Equipment) {
  const before = effectiveAttributesFor(committed, equipment);
  const after = effectiveAttributesFor(preview, equipment);
  switch (attribute) {
    case "health": return `Maximum Health ${percentage(((after.health / before.health) - 1) * 100)}`;
    case "stamina": return `Maximum Stamina ${signed(after.stamina - before.stamina)}`;
    case "offense": return `Weapon damage up to ${signed(after.offense - before.offense)}`;
    case "defense": return `Incoming damage reduced by up to ${after.defense - before.defense}`;
    case "mana": return `Maximum Mana ${signed(after.mana - before.mana)}`;
    case "perception": return `Enemy detection range ${signed((after.perception - before.perception) * 2)} cells`;
    case "luck": return luckBenefit(committed, preview, equipment);
    case "recovery": return `Stamina restored per move ${signed(after.recovery - before.recovery)}`;
    case "strength":
    case "stealth": return "No gameplay effect yet.";
  }
}

export function formatPendingAttributeBenefits(committed: Attributes, preview: Attributes, equipment: Equipment): PendingAttributeBenefit[] {
  return progressionStatNames.flatMap((attribute) => committed[attribute] === preview[attribute] ? [] : [{ attribute, text: benefitText(attribute, committed, preview, equipment) }]);
}

export function pendingAttributeBenefitLabel(benefit: PendingAttributeBenefit) {
  return `${attributeLabels[benefit.attribute]}: ${benefit.text}`;
}
