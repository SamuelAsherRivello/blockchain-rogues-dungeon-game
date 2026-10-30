import type { Equipment } from "../../../game/types.ts";

export const HERO_WARRIOR_APPEARANCES = ["sword-and-shield", "sword-only", "shield-only", "unarmed"] as const;
export type HeroWarriorAppearance = typeof HERO_WARRIOR_APPEARANCES[number];

/** Equipment groups determine presentation; the item placed in a group does not. */
export function heroWarriorAppearanceForEquipment(equipment: Pick<Equipment, "weapons" | "armor">): HeroWarriorAppearance {
  const sword = equipment.weapons.some(Boolean);
  const shield = equipment.armor.some(Boolean);
  if (sword && shield) return "sword-and-shield";
  if (sword) return "sword-only";
  if (shield) return "shield-only";
  return "unarmed";
}

/** Keep the fatal appearance until the death sequence releases the rendered actor. */
export function createHeroWarriorAppearanceSelection() {
  let fatal: HeroWarriorAppearance | null = null;
  return (equipment: Pick<Equipment, "weapons" | "armor">, deathActive = false): HeroWarriorAppearance => {
    if (deathActive) return fatal ??= heroWarriorAppearanceForEquipment(equipment);
    fatal = null;
    return heroWarriorAppearanceForEquipment(equipment);
  };
}
