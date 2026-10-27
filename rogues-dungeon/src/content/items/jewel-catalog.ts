import type { Item } from '../../game/types.ts';

export type JewelFamily = 'ring' | 'bracelet' | 'amulet';
interface JewelDefinition {
  name: string;
  family: JewelFamily;
  tier: 'low' | 'middle' | 'high' | 'special';
  modifiers: Item['modifiers'];
  unlockLevel: number;
  rarity: 'uncommon' | 'rare' | 'very-rare';
  weight: number;
  frame: number;
}

/** Fixed base values shared by loot, equipment, saves, and presentation. */
export const JEWEL_CATALOG = Object.freeze([
  { name: 'Copper Ring of Vigor', family: 'ring', tier: 'low', modifiers: { health: 5 }, unlockLevel: 2, rarity: 'uncommon', weight: 25, frame: 12 },
  { name: 'Silver Ring of Vigor', family: 'ring', tier: 'middle', modifiers: { health: 10 }, unlockLevel: 4, rarity: 'rare', weight: 11, frame: 13 },
  { name: 'Gold Ring of Vigor', family: 'ring', tier: 'high', modifiers: { health: 15 }, unlockLevel: 7, rarity: 'very-rare', weight: 4, frame: 14 },
  { name: 'Copper Guard Bracelet', family: 'bracelet', tier: 'low', modifiers: { defense: 1 }, unlockLevel: 2, rarity: 'uncommon', weight: 25, frame: 15 },
  { name: 'Silver Guard Bracelet', family: 'bracelet', tier: 'middle', modifiers: { defense: 2 }, unlockLevel: 4, rarity: 'rare', weight: 11, frame: 16 },
  { name: 'Gold Guard Bracelet', family: 'bracelet', tier: 'high', modifiers: { defense: 3 }, unlockLevel: 7, rarity: 'very-rare', weight: 4, frame: 17 },
  { name: 'Quartz Amulet', family: 'amulet', tier: 'low', modifiers: { mana: 5 }, unlockLevel: 2, rarity: 'uncommon', weight: 25, frame: 18 },
  { name: 'Sapphire Amulet', family: 'amulet', tier: 'middle', modifiers: { mana: 10 }, unlockLevel: 4, rarity: 'rare', weight: 11, frame: 19 },
  { name: 'Star Sapphire Amulet', family: 'amulet', tier: 'high', modifiers: { mana: 15 }, unlockLevel: 7, rarity: 'very-rare', weight: 4, frame: 20 },
  { name: 'Prismatic Amulet', family: 'amulet', tier: 'special', modifiers: { health: 5, mana: 5 }, unlockLevel: 6, rarity: 'very-rare', weight: 4, frame: 21 },
] as const satisfies readonly JewelDefinition[]);

export type JewelName = typeof JEWEL_CATALOG[number]['name'];
export const JEWEL_NAMES = Object.freeze(JEWEL_CATALOG.map(jewel => jewel.name));
export function jewelDefinition(name: string) { return JEWEL_CATALOG.find(jewel => jewel.name === name); }
export const jewelItemDefinitions: readonly Omit<Item, 'id'>[] = Object.freeze(JEWEL_CATALOG.map(({ name, modifiers }) => Object.freeze({
  name, group: 'jewels' as const, category: 'equipment' as const, slotSpan: 1 as const,
  modifiers: Object.freeze({ ...modifiers }), isStackable: false,
})));
