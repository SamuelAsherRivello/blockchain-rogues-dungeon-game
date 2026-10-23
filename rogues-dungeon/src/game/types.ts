/** Serializable domain contracts. This module has no UI or renderer dependencies. */
export interface Position { x: number; y: number }
export interface MassBearingPosition extends Position { hasMass?: boolean }
export interface Room extends Position { w: number; h: number }
export type Direction = "n" | "s" | "w" | "e";
/** The last cardinal direction in which a character successfully moved. */
export type CharacterHeading = Direction;
export type ResourceName = "health" | "stamina" | "offense" | "defense" | "mana" | "xp";
export const RESOURCE_WILL_REPLENISH: Readonly<Record<ResourceName, boolean>> = Object.freeze({ health: true, stamina: true, offense: true, defense: true, mana: true, xp: false });
export type AttributeName = Exclude<ResourceName, "xp"> | "perception" | "strength" | "luck" | "recovery" | "stealth";
export type MovementMode = "grid-snap" | "grid-tween" | "gridless";
export type GameMode = "General" | "Battle";
export type Attributes = Record<AttributeName, number>;
export type WorldAttributeName = 'clarity' | 'comfort' | 'discovery' | 'fortune' | 'guidance' | 'mercy' | 'openness' | 'peace' | 'plenty' | 'safety';
export type WorldAttributes = Record<WorldAttributeName, number>;
export interface FloorGenerationProfile { seed: number; difficulty: number; attributes?: WorldAttributes; generatorVersion: string; tuningVersion?: string; level1TestMode?: boolean; level1ObjectTestMode?: boolean; level1EnemyTestMode?: boolean }
export interface WorldGrowthEvent { id: string; seed: number; level: number; difficulty: number; spent: number; rulesVersion?: string; earningProfile?: FloorGenerationProfile; identity?: { worldSeed: number; slot: number; run: number; dungeonLevel: number }; recent?: WorldAttributeName[]; applied?: boolean; before?: WorldAttributes; after?: WorldAttributes; unused?: number; acknowledged?: boolean }
export interface Resource { current: number; currentMax: number; level?: number }
export type Resources = Record<ResourceName, Resource>;
export type ResourceInput = Partial<Record<ResourceName, Partial<Resource> | number>>;
export type EquipmentGroup = "weapons" | "armor";
export type ConsumableResource = "health" | "stamina" | "mana";
export type AbilityId = "heal" | "wand" | "throwing-knives";
export type ItemCategory = "equipment" | "consumable" | "ability" | "capacity";
export interface Item { id: string; name: string; group: EquipmentGroup; modifiers: Partial<Attributes>; slotSpan?: 1 | 2; hitChance?: number; critChance?: number; perks?: readonly string[]; category?: ItemCategory; abilityId?: AbilityId; capacityBonus?: number; consumableResource?: ConsumableResource; quickSlotAction?: "restore-resource" | "throwing-knives"; isStackable?: boolean; quantity?: number }
export interface QuickSlot { item: Item; quantity: number }
export type Equipment = Record<EquipmentGroup, (Item | null)[]>;
export interface TerrainCell { walkable: boolean; role: string; protected?: boolean }
export type EnemyAiState = "idle" | "pursue" | "attack" | "blocked";
export interface EnemyAi { state: EnemyAiState; targetId: "player" | null }
export interface Enemy extends MassBearingPosition {
  id: string; kind: "enemy"; name: string; hp: number; maxHp: number; damage: number; xp: number;
  resources: Resources; awareness: number; actionCooldown: number; nextActionAt: number; heading?: CharacterHeading;
  /** World-generation presentation contract. */
  character?: string; graphic?: string; idle?: string;
  /** Slime lineage depth. Map-born enemies start at generation 1. */
  generation?: number;
  ai: EnemyAi;
  /** Melee attacks require cardinal adjacency. Ranged attacks may target diagonals within their range. */
  attackKind?: "melee" | "ranged"; attackRange?: number;
}
export type Entity = Enemy
  | (Position & { id: string; kind: "potion"; resource: ConsumableResource; name?: string; quantity?: number })
  | (Position & { id: string; kind: "key" | "gold"; amount?: number; name?: string })
  | (Position & { id: string; kind: "stairs"; direction?: "forward" | "back"; name?: string })
  | (Position & { id: string; kind: "teleport-arrow"; destination: string; name?: string })
  | (Position & { id: string; kind: "discovery"; name?: string })
  | (Position & { id: string; kind: "chest"; opened?: boolean; rewardAmount?: number; rewardQuality?: number; rewardItem?: Item })
  | (Position & { id: string; kind: "crate"; health: number; opened?: boolean; openFrame?: 1 | 5; rewardAmount?: number; rewardQuality?: number; rewardItem?: Item })
  | (Position & { id: string; kind: "campfire"; name?: string })
  | (Position & { id: string; kind: "item"; item: Item });
export type ObjectSetRegionRole = "optional-reward" | "exit";
export interface FloorTriggerDoorBarrelSet {
  id: string; kind: "floor-trigger-door-barrel"; barrel: MassBearingPosition; trigger: Position; door: Position;
  barrelStart?: Position; barrelReturnUsed?: boolean;
  requiresKey?: boolean;
  regionRole: ObjectSetRegionRole;
}
export type ObjectSet = FloorTriggerDoorBarrelSet;
export interface WorldDecoration extends Position { id: string; kind: "torch" | "trap"; wallMounted: boolean }
export interface Floor {
  seed: number; width: number; height: number; cells: TerrainCell[][]; map?: number[][];
  start: Position; entities: Entity[]; time: number; level: number; depth?: number; generatorVersion?: string;
  scenario?: string; progressionXpAwarded?: boolean;
  generationProfile?: FloorGenerationProfile;
  worldDiagnostics?: {
    repairs: number; shortfall: number; routeLength: number; rewardBudget: number;
    balanceVersion?: string;
    contentCounts?: { potions: number; gold: number; keys: number; worldItems: number; enemies: number; traps: number; chests: number; crates: number; campfires: number; keyedDoors: number };
  };
  generation?: { seed: number; generator: string | null; passes?: { id: string; diagnostics: number }[] };
  tiledGrounds?: number[]; tiledWalls?: number[];
  decorations?: WorldDecoration[];
  objectSets?: ObjectSet[];
  prefabPlacements?: { prefabId: string; origin: Position }[];
  projectiles?: RangedProjectile[];
}
export interface RangedProjectile { id: string; sourceId: string; from: Position; to: Position; direction: Direction; createdAt: number; kind?: "arrow" | "magic" | "web" | "throwing-knife" }
/** The persisted difference between a deterministic base floor and its current runtime state. */
export interface LevelStateDelta {
  time: number;
  removedGeneratedIds: string[];
  entityOverrides: Record<string, Entity>;
  spawnedEntities: Entity[];
  objectSetOverrides: Record<string, ObjectSet>;
}
export type QuestItemId = "walk-through-stairs" | "collect-health-potion" | "collect-coin";
export interface QuestItem { id: QuestItemId; title: string; complete: boolean }
export interface Quest { id: "my-first-quest"; title: "My First Quest"; items: QuestItem[]; activeItemId: QuestItemId | null }
export interface Campaign {
  version: number; world: string; realm: string; floor: Floor; combatRollState?: number;
  /** The currently presented standalone map, when the player is inside a teleport prefab. */
  activePrefab?: { id: "player-home"; returnLevel: number; returnPosition: Position; prefabPosition: Position };
  /** Inputs used to regenerate this run's floors deterministically. */
  worldSeed?: number; slot?: number; run?: number; generatorVersion?: string;
  /** Compact state for visited generated levels, keyed by level. */
  levelStates?: Record<string, LevelStateDelta>;
  floorProfiles?: Record<string, FloorGenerationProfile>;
  worldAttributes?: WorldAttributes;
  worldGrowth?: WorldGrowthEvent[];
  worldSchemaVersion?: 1;
  worldLegacyPoints?: number;
  /** Legacy snapshot compatibility. New campaigns never write this field. */
  floors?: Record<string, Floor>;
  progression: { attributes: Attributes; level: number; xp: number; nextXp: number; totalKills: number; difficulty: number; attributePoints: number };
  player: MassBearingPosition & { pixel?: Position; resources: Resources; equipment: Equipment; inventory: Item[]; inventoryCapacity: number; abilities: (AbilityId | null)[]; quickSlots?: [QuickSlot | null, QuickSlot | null]; sneaking: boolean; heading?: CharacterHeading; encumberedDirection?: Direction | null };
  starterConsumablesSeeded?: boolean;
  counters: { keys: number; gold: number }; objective: string; quest?: Quest; log: LogEntry[]; savedAt?: number;
}
export interface Preferences { movementMode: MovementMode; zoom: number; camera: "center" | "deadzone" | "screen"; fullscreenDesired: boolean; sfxVolume: number; musicVolume: number; muteAll: boolean; urlArgs: boolean }
export interface StorageAccess { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }
export interface StorageCollection extends StorageAccess { length: number; key(index: number): string | null }
export type Action =
  | { type: "move-pixels"; to: Position; hazardElapsedMs?: number }
  | { type: "center-player" }
  | { type: "move"; direction: string; hazardElapsedMs?: number }
  | { type: "trap-strike"; hazardElapsedMs: number }
  | { type: "enter-stairs" }
  | { type: "enter-teleport" }
  | { type: "return-barrel"; setId: string }
  | { type: "wait" }
  | { type: "rest" }
  | { type: "toggle-sneak" }
  | { type: "spend-attribute-points"; allocation: Partial<Record<AttributeName, number>> }
  | { type: 'acknowledge-world-growth'; id: string }
  | { type: "ability"; index: number }
  | { type: "resolve-ability"; abilityId: AbilityId; targetId?: string }
  | { type: "assign-ability"; from: number; to: number }
  | { type: "store-ability"; index: number }
  | { type: "assign-ability-from-inventory"; itemId: string; index: number }
  | { type: "equip"; group: EquipmentGroup; index: number; itemId: string }
  | { type: "unequip"; group: EquipmentGroup; index: number }
  | { type: "reorder-equipment"; group: EquipmentGroup; index: number; other: number }
  | { type: "assign-quick-slot"; itemId: string; index: number }
  | { type: "move-quick-slot"; from: number; to: number }
  | { type: "return-quick-slot"; index: number }
  | { type: "use-quick-slot"; index: number }
  | { type: "drop-item"; source: DropSourceReference };
export type DropSourceReference = { kind: "inventory"; itemId: string } | { kind: "slot"; group: EquipmentGroup; index: number } | { kind: "quick-slot"; index: number } | { kind: "ability"; index: number };
export interface EventFacts {
  reason?: string; previous?: number; current?: number; previousMax?: number; currentMax?: number;
  resource?: ResourceName; position?: Position; targetPosition?: Position; damage?: number;
  target?: string; targetId?: string; previousHealth?: number; currentHealth?: number;
  amount?: number; cause?: string; level?: number; threshold?: number; points?: number;
  stat?: AttributeName; active?: boolean; from?: Position | number; to?: Position | number;
  realm?: string; itemId?: string; name?: string; item?: string; lootTier?: number; xp?: number;
  action?: string; source?: string | DropSourceReference | { group: EquipmentGroup; index: number } | { quickSlot: number };
  destination?: string | Position | { group: EquipmentGroup; index: number } | { quickSlot: number }; group?: EquipmentGroup; index?: number; other?: number;
  id?: string; title?: string; manaCost?: number; targetType?: string; transactionId?: string; actionType?: string; ticks?: number; abilityId?: AbilityId;
  error?: string; message?: string; quantity?: number; quickSlot?: number;
  displacedItemIds?: string[]; displacedItems?: { id: string; name: string }[]; occupiedSlots?: number[]; slotSpan?: 1 | 2;
  hitChance?: number; critChance?: number; roll?: number; attackDirection?: Direction; mitigation?: number; projectileId?: string; outcome?: string;
  childIds?: string[]; generation?: number;
}
export interface GameEvent { type: string; facts: EventFacts; source?: string; gameTime: number; sequence: number; eventId?: string; transactionId?: string | null; outcome?: string }
export interface ActionResult { state: Campaign; events: GameEvent[]; accepted: boolean; ticks: number; transactionId?: string; system?: boolean }
export interface LogEntry { id?: string; text: string }
export interface SelectedCell extends Position { pixel?: Position; pressed?: boolean; sprint?: boolean; left?: number; top?: number; size?: number; kind?: string }
export interface Feedback extends Position { id?: string; kind: string; text: string; color: string; duration: number }
export type DragSource = { kind: "inventory"; item: Item } | { kind: "slot"; item: Item; group: EquipmentGroup; index: number } | { kind: "quick-slot"; item: Item; index: number } | { kind: "ability"; item: Item; index: number };
export type DropDestination = { kind: "inventory"; index?: number } | { kind: "slot"; group: EquipmentGroup; index: number } | { kind: "quick-slot"; index: number } | { kind: "drop-item" };
export interface Rect extends Position { width: number; height: number }
