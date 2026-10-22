import assert from "node:assert/strict";
import test from "node:test";
import type { Attributes, Equipment } from "../src/game/types.ts";
import { formatPendingAttributeBenefits, pendingAttributeBenefitLabel } from "../src/game/attribute-benefits.ts";

const equipment: Equipment = { weapons: [{ id: "stick", name: "Stick", group: "weapons", modifiers: {}, hitChance: 90 }, null], armor: [null, null] };
const attributes = (overrides: Partial<Attributes> = {}): Attributes => ({ health: 6, stamina: 5, offense: 2, defense: 3, mana: 3, perception: 3, strength: 3, luck: 3, recovery: 5, stealth: 1, ...overrides });

test("formats aggregate capacity and combat benefits from one pending allocation", () => {
  const committed = attributes();
  const preview = attributes({ health: 8, stamina: 6, offense: 4, defense: 4, mana: 4, perception: 4, recovery: 7 });
  const lines = formatPendingAttributeBenefits(committed, preview, equipment);
  assert.deepEqual(lines.map(pendingAttributeBenefitLabel), [
    "Health: Maximum Health +33%",
    "Stamina: Maximum Stamina +10",
    "Offense: Weapon damage up to +2",
    "Defense: Incoming damage reduced by up to 1",
    "Mana: Maximum Mana +10",
    "Perception: Enemy detection range +2 cells",
    "Recovery: Stamina restored per move +2",
  ]);
});

test("shows only pending attributes and uses placeholders for unimplemented effects", () => {
  const committed = attributes();
  const preview = attributes({ strength: 5, stealth: 2, luck: 4 });
  assert.deepEqual(formatPendingAttributeBenefits(committed, preview, equipment).map(pendingAttributeBenefitLabel), [
    "Strength: No gameplay effect yet.",
    "Luck: Hit chance +1%; Loot tier +1",
    "Stealth: No gameplay effect yet.",
  ]);
});

test("returns no lines for an unchanged draft", () => {
  assert.deepEqual(formatPendingAttributeBenefits(attributes(), attributes(), equipment), []);
});
