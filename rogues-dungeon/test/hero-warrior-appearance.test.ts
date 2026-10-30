import assert from "node:assert/strict";
import test from "node:test";
import type { Equipment, Item } from "../src/game/types.ts";
import { heroWarriorAppearanceForEquipment } from "../src/content/characters/hero-warrior/hero-warrior-appearance.ts";

const item = (name: string, group: Item["group"] = "weapons"): Item => ({ id: name, name, group, modifiers: {} });
const equipment = (weapons: (Item | null)[] = [null, null], armor: (Item | null)[] = [null, null]): Equipment => ({ weapons, armor, jewels: [null, null] });

test("selects all four appearances from occupied equipment groups", () => {
  const sword = item("Sword"), armor = item("Wooden Vest", "armor");
  assert.equal(heroWarriorAppearanceForEquipment(equipment()), "unarmed");
  assert.equal(heroWarriorAppearanceForEquipment(equipment([sword, null])), "sword-only");
  assert.equal(heroWarriorAppearanceForEquipment(equipment(undefined, [armor, null])), "shield-only");
  assert.equal(heroWarriorAppearanceForEquipment(equipment([sword, null], [armor, null])), "sword-and-shield");
});

test("counts either position and does not count duplicated spanning positions twice", () => {
  const sword = { ...item("Two-Handed Sword"), slotSpan: 2 as const }, armor = item("Chest Armor", "armor");
  assert.equal(heroWarriorAppearanceForEquipment(equipment([null, sword])), "sword-only");
  assert.equal(heroWarriorAppearanceForEquipment(equipment(undefined, [null, armor])), "shield-only");
  assert.equal(heroWarriorAppearanceForEquipment(equipment([sword, sword])), "sword-only");
  assert.equal(heroWarriorAppearanceForEquipment(equipment([sword, sword], [armor, armor])), "sword-and-shield");
});

test("uses Weapons occupancy for sword art even when the item is a shield", () => {
  const shield = { ...item("Oak Shield 03"), modifiers: { defense: 3 }, perks: ["Shield"] };
  assert.equal(heroWarriorAppearanceForEquipment(equipment([shield, null])), "sword-only");
});

test("ignores item group metadata, category and modifiers when determining occupied-slot appearance", () => {
  const unusual = { ...item("Stored metadata", "armor"), category: "consumable" as const, modifiers: { defense: 500 } };
  const inWeapons = equipment([unusual, null]);
  const inArmor = equipment(undefined, [{ ...unusual, group: "weapons" }]);
  assert.equal(heroWarriorAppearanceForEquipment(inWeapons), "sword-only");
  assert.equal(heroWarriorAppearanceForEquipment(inArmor), "shield-only");
});

test("ignores Jewel occupancy and never mutates committed equipment", () => {
  const current = equipment(); current.jewels = [item("Ruby", "jewels"), null];
  const before = structuredClone(current);
  assert.equal(heroWarriorAppearanceForEquipment(current), "unarmed");
  assert.deepEqual(current, before);
});
