import type { Entity } from "../../game/types.ts";
import { jewelDefinition, type JewelName } from '../../content/items/jewel-catalog.ts';

/** Shared by WebGPU sprites and DOM pickup-transfer cropping. */
export const DROPPABLE_ITEM_ATLAS_LAYOUT = Object.freeze({ cellWidthPx: 362, cellHeightPx: 362, columns: 4, rows: 6 });

export const DUNGEON_STAIR_UP_FRAME = 42;
export const OBJECTS_OVERLAY_BARREL_FRAME = 0;
// The horizontal atlas pair is visually opposite its source-file names.
export const OBJECTS_OVERLAY_DOOR_OPEN_FRAME = 0;
export const OBJECTS_OVERLAY_DOOR_CLOSED_FRAME = 1;
export const OBJECTS_OVERLAY_SIDE_DOOR_OPEN_FRAME = 2;
export const OBJECTS_OVERLAY_SIDE_DOOR_CLOSED_FRAME = 3;
// objects-overlay is a 7 × 6 sheet; the crate is bottom row, second tile.
export const OBJECTS_OVERLAY_CRATE_CLOSED_FRAME = 36;
export const PROPS_STATIC_CRATE_OPEN_FRAMES = Object.freeze([1, 5] as const);

// Chests and linked puzzle doors use distinct art assets and anchor rules.
export const CHEST_MAIN_ART_ANCHOR_OFFSET_PX = 16;
export const DOOR_CLOSED_MAIN_ART_ANCHOR_OFFSET_PX = 32;
export const DOOR_OPEN_MAIN_ART_ANCHOR_OFFSET_PX = 16;

export function doorMainArtAnchorOffset(open: boolean) {
  return open ? DOOR_OPEN_MAIN_ART_ANCHOR_OFFSET_PX : DOOR_CLOSED_MAIN_ART_ANCHOR_OFFSET_PX;
}

type ItemKind = Entity["kind"] | undefined;
const WORLD_DROPPABLE_SPRITE_FRAMES = Object.freeze({
  "Extra Carrying Capacity +5": 0,
  Heal: 1,
  Wand: 2,
  "Dagger (Magic)": 3,
  Sword: 4,
  "Two-Handed Sword": 5,
  "Leg Armor (Magic)": 6,
  "Chest Armor": 7,
  "Suit of Armor": 8,
  "Oak Shield 03": 9,
  "Wooden Stick": 10,
  "Wooden Vest": 11,
} as const);
export type WorldDroppableSpriteName = keyof typeof WORLD_DROPPABLE_SPRITE_FRAMES | JewelName;
export function droppableItemSpriteFrame(name?: string | null) {
  if (!name) return null;
  const jewel = jewelDefinition(name);
  return jewel ? jewel.frame : Object.hasOwn(WORLD_DROPPABLE_SPRITE_FRAMES, name) ? WORLD_DROPPABLE_SPRITE_FRAMES[name as keyof typeof WORLD_DROPPABLE_SPRITE_FRAMES] : null;
}

/** Jewels use half-size world art for settled, thrown, and collected items. */
export function droppableItemSpriteSizePx(name?: string | null) {
  return name && jewelDefinition(name) ? 16 : 32;
}

/** Align the shield and full suit artwork within their world cells. */
export function droppableItemMainOffsetXPx(name?: string | null) {
  return name === "Oak Shield 03" || name === "Suit of Armor" ? -8 : 0;
}

export interface PickupMainArtPresentation {
  mainOffsetPx: number;
  oscillationAmplitudePx: number;
  shadowWidthScale: number;
  shadowHeightScale: number;
}

/** Returns main-art-only presentation settings; shadows stay at ground contact. */
export function pickupMainArtPresentation(kind: ItemKind, resource?: "health" | "stamina" | "mana" | null): PickupMainArtPresentation {
  if (kind === "key") return { mainOffsetPx: -8, oscillationAmplitudePx: 0, shadowWidthScale: 0.5, shadowHeightScale: 0.5 };
  if (kind !== "potion") return { mainOffsetPx: 0, oscillationAmplitudePx: 0, shadowWidthScale: 1, shadowHeightScale: 1 };
  return { mainOffsetPx: -8, oscillationAmplitudePx: resource === "health" || resource === "stamina" || resource === "mana" ? 1.5 : 0, shadowWidthScale: 1, shadowHeightScale: 1 };
}

/** Returns the items-static atlas frame for ordinary world objects. */
export function itemSpriteFrame(kind: ItemKind, resource?: "health" | "stamina" | "mana" | null) {
  if (kind === "item") return 2;
  if (kind === "key") return 5;
  if (kind === "gold") return 3;
  if (kind === "potion") return resource === "health" ? 6 : 7;
  if (kind === "teleport-arrow") return 8;
  return 8;
}

export function puzzleObjectSpriteFrame(kind: "barrel" | "door", active: boolean, wallAxis: "horizontal" | "vertical" = "vertical") {
  if (kind === "barrel") return OBJECTS_OVERLAY_BARREL_FRAME;
  if (wallAxis === "horizontal") return active ? OBJECTS_OVERLAY_SIDE_DOOR_CLOSED_FRAME : OBJECTS_OVERLAY_SIDE_DOOR_OPEN_FRAME;
  return active ? OBJECTS_OVERLAY_DOOR_OPEN_FRAME : OBJECTS_OVERLAY_DOOR_CLOSED_FRAME;
}

/** Inventory drops retain their item data but share the native potion artwork. */
export function worldPickupPresentation(entity: Entity) {
  const resource = entity.kind === "potion" ? entity.resource : entity.kind === "item" ? entity.item.consumableResource ?? null : null;
  return { kind: resource ? "potion" as const : entity.kind, resource };
}
