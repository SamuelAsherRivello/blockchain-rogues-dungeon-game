import { createSpriteSheetAnimationEntity, type SpriteAnimationDefinition, type SpriteAnimationSummary, type SpriteSheetAnimationEntity } from "../../systems/animation/sprite-animation-system.ts";

export const ENEMY_CHARACTER_NAMES = ["rat", "skeleton-warrior", "slime", "spider", "slime-blue", "ghost", "skeleton-archer", "skeleton-mage"] as const;
export type EnemyCharacterName = typeof ENEMY_CHARACTER_NAMES[number];
export type EnemyIdleAnimationName = EnemyCharacterName;
type AnimationName = "idle" | "move" | "attack" | "death";
type EnemyDescriptor = Readonly<{ folder: string; dimensions: readonly [number, number]; animations: Readonly<Record<AnimationName, number>>; folderNames?: Readonly<Partial<Record<AnimationName, string>>>; filePrefix?: Readonly<Record<AnimationName, string>>; directional: boolean }>;

const descriptors: Readonly<Record<EnemyCharacterName, EnemyDescriptor>> = Object.freeze({
  rat: { folder: "rat", dimensions: [32, 32], animations: { idle: 5, move: 5, attack: 4, death: 4 }, directional: false },
  "skeleton-warrior": { folder: "skeleton-warrior", dimensions: [32, 48], animations: { idle: 4, move: 6, attack: 4, death: 6 }, folderNames: { move: "run" }, directional: true },
  slime: { folder: "slime", dimensions: [32, 32], animations: { idle: 4, move: 4, attack: 4, death: 6 }, directional: false },
  spider: { folder: "spider", dimensions: [32, 32], animations: { idle: 5, move: 4, attack: 3, death: 7 }, directional: false },
  "slime-blue": { folder: "slime-blue", dimensions: [32, 32], animations: { idle: 4, move: 4, attack: 4, death: 6 }, filePrefix: { idle: "idle", move: "move", attack: "attack", death: "death" }, directional: false },
  ghost: { folder: "ghost", dimensions: [32, 48], animations: { idle: 4, move: 4, attack: 4, death: 5 }, directional: false },
  "skeleton-archer": { folder: "skeleton-archer", dimensions: [32, 48], animations: { idle: 4, move: 6, attack: 6, death: 6 }, folderNames: { move: "run" }, directional: true },
  "skeleton-mage": { folder: "skeleton-mage", dimensions: [32, 48], animations: { idle: 4, move: 6, attack: 4, death: 6 }, folderNames: { move: "run" }, directional: true },
});

const directions = ["down", "side", "up"] as const;
type Direction = typeof directions[number];

function frameFile(descriptor: EnemyDescriptor, animation: AnimationName, index: number) { return `${descriptor.filePrefix?.[animation] ?? ""}${String(index).padStart(2, "0")}.png`; }
function framePath(baseUrl: string, name: EnemyCharacterName, animation: AnimationName, direction: Direction | null, index: number) {
  const descriptor = descriptors[name]; const folderName = descriptor.folderNames?.[animation] ?? animation; const folder = direction ? `${folderName}/${direction}` : folderName;
  return `${baseUrl}assets/art/game-view/enemies/${descriptor.folder}/frames/${folder}/${frameFile(descriptor, animation, index)}`;
}
function frameList(baseUrl: string, name: EnemyCharacterName, animation: AnimationName, direction: Direction | null) {
  const descriptor = descriptors[name]; const [widthPx, heightPx] = descriptor.dimensions;
  return Array.from({ length: descriptor.animations[animation] }, (_, index) => ({ path: framePath(baseUrl, name, animation, direction, index), widthPx, heightPx }));
}
function animationDefinition(baseUrl: string, name: EnemyCharacterName, animation: AnimationName, direction: Direction | null, loopCount: number): SpriteAnimationDefinition {
  return { name: direction ? `${animation}/${direction}` : animation, source: { kind: "frames", frames: frameList(baseUrl, name, animation, direction) }, frameDurationMs: animation === "attack" ? 90 : animation === "death" ? 120 : animation === "move" ? 100 : 140, loopCount };
}

export function createEnemyAnimationDefinitions(baseUrl = "/", name: EnemyCharacterName): SpriteAnimationDefinition[] {
  const descriptor = descriptors[name]; const definitions: SpriteAnimationDefinition[] = [];
  for (const animation of ["idle", "move", "attack"] as const) {
    if (descriptor.directional) directions.forEach((direction) => definitions.push(animationDefinition(baseUrl, name, animation, direction, animation === "attack" ? 0 : -1)));
    else definitions.push(animationDefinition(baseUrl, name, animation, null, animation === "attack" ? 0 : -1));
  }
  definitions.push(animationDefinition(baseUrl, name, "death", null, 0)); return definitions;
}

export function createEnemyIdleAnimationDefinitions(baseUrl = "/") { return ENEMY_CHARACTER_NAMES.map((name) => animationDefinition(baseUrl, name, "idle", descriptors[name].directional ? "down" : null, -1)); }
export function createEnemyAnimationEntities(baseUrl = "/", speed = 0.5): Record<EnemyCharacterName, SpriteSheetAnimationEntity> {
  return Object.fromEntries(ENEMY_CHARACTER_NAMES.map((name) => [name, createSpriteSheetAnimationEntity(createEnemyAnimationDefinitions(baseUrl, name), descriptors[name].directional ? "idle/down" : "idle", { speed })])) as Record<EnemyCharacterName, SpriteSheetAnimationEntity>;
}
export const createEnemyIdleAnimationEntities = createEnemyAnimationEntities;
export function enemyAnimationCatalog(baseUrl = "/", name: EnemyCharacterName): readonly SpriteAnimationSummary[] { return createEnemyAnimationEntities(baseUrl, 0.5)[name].listAnimations(); }
export function enemyCharacterDescriptor(name: EnemyCharacterName) { return descriptors[name]; }
export function enemyCharacterForName(name: string): EnemyCharacterName {
  if (name === "Skeleton" || name === "Skeleton Warrior") return "skeleton-warrior";
  if (name === "Skeleton Archer") return "skeleton-archer";
  if (name === "Skeleton Mage") return "skeleton-mage";
  if (name === "Green Slime") return "slime";
  if (name === "Blue Slime") return "slime-blue";
  if (name === "Spider" || name === "Ghost" || name === "Rat") return name.toLowerCase() as EnemyCharacterName;
  return "rat";
}
