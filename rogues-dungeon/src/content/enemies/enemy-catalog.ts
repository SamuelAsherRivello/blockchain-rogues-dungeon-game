import type { Enemy } from "../../game/types.ts";
import { ENEMY_CHARACTER_NAMES, type EnemyCharacterName } from "./enemy-idle-animation.ts";

export type EnemyDefinition = Readonly<Pick<Enemy, "name" | "hp" | "damage" | "awareness" | "actionCooldown" | "attackKind" | "attackRange" | "xp"> & { rank: number; character: EnemyCharacterName }>;

export const ENEMY_DEFINITIONS: readonly EnemyDefinition[] = Object.freeze([
  { rank: 1, character: "rat", name: "Rat", hp: 12, damage: 3, awareness: 6, actionCooldown: 2, attackKind: "melee", attackRange: 1, xp: 10 },
  { rank: 2, character: "skeleton-warrior", name: "Skeleton Warrior", hp: 20, damage: 6, awareness: 6, actionCooldown: 2, attackKind: "melee", attackRange: 1, xp: 15 },
  { rank: 3, character: "slime", name: "Green Slime", hp: 24, damage: 7, awareness: 4, actionCooldown: 3, attackKind: "melee", attackRange: 1, xp: 18 },
  { rank: 4, character: "spider", name: "Spider", hp: 26, damage: 8, awareness: 8, actionCooldown: 2, attackKind: "ranged", attackRange: 5, xp: 22 },
  { rank: 5, character: "slime-blue", name: "Blue Slime", hp: 30, damage: 9, awareness: 5, actionCooldown: 3, attackKind: "melee", attackRange: 1, xp: 26 },
  { rank: 6, character: "ghost", name: "Ghost", hp: 34, damage: 10, awareness: 7, actionCooldown: 2, attackKind: "melee", attackRange: 1, xp: 32 },
  { rank: 7, character: "skeleton-archer", name: "Skeleton Archer", hp: 38, damage: 11, awareness: 8, actionCooldown: 2, attackKind: "ranged", attackRange: 5, xp: 38 },
  { rank: 8, character: "skeleton-mage", name: "Skeleton Mage", hp: 44, damage: 12, awareness: 7, actionCooldown: 3, attackKind: "ranged", attackRange: 6, xp: 48 },
]);

export function enemyDefinitionsForWorldLevel(level: number) { return ENEMY_DEFINITIONS.slice(0, Math.min(ENEMY_DEFINITIONS.length, Math.max(2, Math.floor(level) + 1))); }
export function enemyDefinitionForName(name: string) { return ENEMY_DEFINITIONS.find((definition) => definition.name === name) ?? ENEMY_DEFINITIONS[0]; }
export function enemyDefinitionForCharacter(character: EnemyCharacterName) { return ENEMY_DEFINITIONS.find((definition) => definition.character === character) ?? ENEMY_DEFINITIONS[0]; }
export function enemyCharacterNames() { return ENEMY_CHARACTER_NAMES; }
