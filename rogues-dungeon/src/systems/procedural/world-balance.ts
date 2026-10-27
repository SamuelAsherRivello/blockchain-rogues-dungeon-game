import type { WorldAttributes } from '../../game/types.ts';
import { effectiveWorldRank } from './world-attributes.ts';
import { JEWEL_CATALOG, jewelDefinition } from '../../content/items/jewel-catalog.ts';

export const WORLD_BALANCE_VERSION = 'world-balance-2-jewels';
export const WORLD_BALANCE_LEVEL_MAX = 10;

export type WorldBalanceRarity = 'common' | 'uncommon' | 'rare' | 'very-rare';
export interface BalanceRange { min: number; max: number }
export interface WorldBalanceProfile {
  version: string;
  level: number;
  difficulty: number;
  itemUnlockLevels: Readonly<Record<string, number>>;
  rarityWeights: Readonly<Record<WorldBalanceRarity, number>>;
  budgets: Readonly<{
    potions: BalanceRange;
    gold: BalanceRange;
    keys: BalanceRange;
    worldItems: BalanceRange;
    enemies: BalanceRange;
    traps: BalanceRange;
    chests: BalanceRange;
    crates: BalanceRange;
    campfires: BalanceRange;
  }>;
  supplyMultiplier: number;
  rewardMultiplier: number;
  surplusKeyChance: number;
}

const FLOOR_BUDGETS = Object.freeze([
  { potions: [1, 3], gold: [2, 4], keys: [0, 1], worldItems: [0, 1], enemies: [2, 3], traps: [1, 1], chests: [0, 1], crates: [0, 1], campfires: [1, 1] },
  { potions: [2, 4], gold: [2, 5], keys: [0, 1], worldItems: [0, 1], enemies: [3, 4], traps: [1, 2], chests: [0, 1], crates: [0, 1], campfires: [1, 2] },
  { potions: [3, 5], gold: [3, 6], keys: [0, 2], worldItems: [0, 2], enemies: [4, 5], traps: [2, 2], chests: [0, 2], crates: [0, 1], campfires: [1, 2] },
  { potions: [3, 6], gold: [3, 7], keys: [0, 2], worldItems: [0, 2], enemies: [4, 6], traps: [2, 3], chests: [0, 2], crates: [0, 2], campfires: [1, 2] },
  { potions: [4, 7], gold: [4, 8], keys: [1, 2], worldItems: [1, 2], enemies: [5, 7], traps: [2, 3], chests: [1, 2], crates: [0, 2], campfires: [1, 3] },
  { potions: [4, 8], gold: [4, 10], keys: [1, 3], worldItems: [1, 3], enemies: [6, 10], traps: [3, 5], chests: [1, 3], crates: [1, 3], campfires: [1, 3] },
  { potions: [4, 8], gold: [4, 10], keys: [1, 3], worldItems: [1, 3], enemies: [6, 10], traps: [3, 5], chests: [1, 3], crates: [1, 3], campfires: [1, 3] },
  { potions: [4, 8], gold: [4, 10], keys: [1, 3], worldItems: [1, 3], enemies: [6, 10], traps: [3, 5], chests: [1, 3], crates: [1, 3], campfires: [1, 3] },
  { potions: [4, 8], gold: [4, 10], keys: [1, 3], worldItems: [1, 3], enemies: [6, 10], traps: [3, 5], chests: [1, 3], crates: [1, 3], campfires: [1, 3] },
  { potions: [4, 8], gold: [4, 10], keys: [1, 3], worldItems: [1, 3], enemies: [6, 10], traps: [3, 5], chests: [1, 3], crates: [1, 3], campfires: [1, 3] },
] as const);

export const WORLD_ITEM_UNLOCK_LEVELS = Object.freeze({
  'Wooden Stick': 1,
  'Wooden Vest': 1,
  'Dagger (Magic)': 2,
  Sword: 2,
  'Oak Shield 03': 2,
  Heal: 2,
  Wand: 2,
  'Extra Carrying Capacity +5': 2,
  'Two-Handed Sword': 3,
  'Chest Armor': 3,
  'Leg Armor (Magic)': 3,
  'Suit of Armor': 3,
  ...Object.fromEntries(JEWEL_CATALOG.map(jewel => [jewel.name, jewel.unlockLevel])),
});

export const WORLD_ITEM_RARITIES: Readonly<Record<string, WorldBalanceRarity>> = Object.freeze({
  'Wooden Stick': 'common',
  'Wooden Vest': 'common',
  'Dagger (Magic)': 'uncommon',
  Sword: 'uncommon',
  'Oak Shield 03': 'uncommon',
  Heal: 'uncommon',
  Wand: 'uncommon',
  'Extra Carrying Capacity +5': 'rare',
  'Two-Handed Sword': 'very-rare',
  'Chest Armor': 'rare',
  'Leg Armor (Magic)': 'rare',
  'Suit of Armor': 'very-rare',
  ...Object.fromEntries(JEWEL_CATALOG.map(jewel => [jewel.name, jewel.rarity])),
});

export const ENEMY_UNLOCK_COUNTS = Object.freeze([2, 4, 6, 7, Number.MAX_SAFE_INTEGER]);
export const DEFAULT_RARITY_WEIGHTS: Readonly<Record<WorldBalanceRarity, number>> = Object.freeze({ common: 60, uncommon: 25, rare: 11, 'very-rare': 4 });

function range(pair: readonly [number, number], multiplier = 1): BalanceRange {
  return { min: Math.max(0, Math.floor(pair[0] * multiplier)), max: Math.max(0, Math.ceil(pair[1] * multiplier)) };
}

export function worldBalanceLevel(level: number) { return Math.max(1, Math.min(WORLD_BALANCE_LEVEL_MAX, Math.floor(level) || 1)); }

export function enemyUnlockCount(level: number, catalogSize: number) {
  const stage = Math.max(1, Math.min(5, Math.floor(level) || 1));
  return Math.min(catalogSize, ENEMY_UNLOCK_COUNTS[stage - 1]);
}

export function worldItemUnlockLevel(name: string) { return WORLD_ITEM_UNLOCK_LEVELS[name as keyof typeof WORLD_ITEM_UNLOCK_LEVELS] ?? WORLD_BALANCE_LEVEL_MAX; }
export function worldItemRarity(name: string) { return WORLD_ITEM_RARITIES[name] ?? 'very-rare'; }
export function eligibleWorldItemNames(level: number, names: readonly string[] = Object.keys(WORLD_ITEM_UNLOCK_LEVELS)) {
  const normalizedLevel = worldBalanceLevel(level);
  return names.filter(name => worldItemUnlockLevel(name) <= normalizedLevel);
}

export const JEWEL_SELECTION_CHANCE = 0.25;

/** Jewels share existing item budgets without diluting legacy loot by catalog size. */
export function selectWorldItemName(level: number, names: readonly string[], random: () => number): string | undefined {
  const eligible = eligibleWorldItemNames(level, names);
  const jewels = eligible.flatMap(name => { const jewel = jewelDefinition(name); return jewel ? [jewel] : []; });
  const ordinary = eligible.filter(name => !jewelDefinition(name));
  if (jewels.length && (!ordinary.length || random() < JEWEL_SELECTION_CHANCE)) {
    let roll = random() * jewels.reduce((total, jewel) => total + jewel.weight, 0);
    for (const jewel of jewels) { roll -= jewel.weight; if (roll < 0) return jewel.name; }
    return jewels.at(-1)!.name;
  }
  return ordinary.length ? ordinary[Math.floor(random() * ordinary.length)] : undefined;
}

export function worldBalanceProfile(level: number, difficulty = level, attributes?: WorldAttributes): WorldBalanceProfile {
  const normalizedLevel = worldBalanceLevel(level);
  const row = FLOOR_BUDGETS[normalizedLevel - 1];
  const plenty = attributes ? effectiveWorldRank(attributes.plenty) : 3;
  const fortune = attributes ? effectiveWorldRank(attributes.fortune) : 3;
  const supplyMultiplier = Math.max(.75, Math.min(1.25, 1 + (plenty - 3) * .04));
  const rewardMultiplier = Math.max(.75, Math.min(1.25, 1 + (fortune - 3) * .04));
  const normalizedDifficulty = Math.max(1, Math.floor(difficulty) || 1);
  const surplusKeyChance = Math.min(.3, .05 + (normalizedLevel - 1) * .02 + Math.max(0, normalizedDifficulty - 1) * .03);
  return {
    version: WORLD_BALANCE_VERSION,
    level: normalizedLevel,
    difficulty: normalizedDifficulty,
    itemUnlockLevels: WORLD_ITEM_UNLOCK_LEVELS,
    rarityWeights: DEFAULT_RARITY_WEIGHTS,
    budgets: {
      potions: range(row.potions, supplyMultiplier), gold: range(row.gold, rewardMultiplier), keys: range(row.keys),
      worldItems: range(row.worldItems, rewardMultiplier), enemies: range(row.enemies), traps: range(row.traps),
      chests: range(row.chests, rewardMultiplier), crates: range(row.crates, rewardMultiplier), campfires: range(row.campfires),
    },
    supplyMultiplier, rewardMultiplier, surplusKeyChance,
  };
}
