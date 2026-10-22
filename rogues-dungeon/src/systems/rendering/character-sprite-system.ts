import type { Sprite2DHandle, Sprite2DProps } from "@babylonjs/lite";
import { patchSprite as updateSprite2D } from "./sprite-patch-system.ts";
import { countPerformance } from "./performance-system.ts";

type Point = readonly [number, number];

export interface CharacterSpriteChild {
  readonly handle: Sprite2DHandle;
  readonly offsetPx: Point;
}

/** A character is positioned as one unit; its art stays independently offset from its grid centre. */
export interface CharacterSprite {
  readonly main: CharacterSpriteChild;
  readonly shadow: CharacterSpriteChild;
}

export function createCharacterSprite(main: CharacterSpriteChild, shadow: CharacterSpriteChild): CharacterSprite {
  return { main, shadow };
}
type Tint = readonly [number, number, number, number];
const characterTints = new WeakMap<CharacterSprite, Tint>();
const baseColors = new WeakMap<Sprite2DHandle, Tint>();
const multiply = (base: Tint, tint: Tint): [number, number, number, number] => [base[0] * tint[0], base[1] * tint[1], base[2] * tint[2], base[3] * tint[3]];
/** Reapply intrinsic alpha and color only when the owning cell's light or fog changes. */
export function setCharacterSpriteTint(character: CharacterSprite, tint: Tint) {
  const prior = characterTints.get(character);
  if (prior?.every((value, i) => value === tint[i])) return;
  characterTints.set(character, tint);
  for (const child of [character.main, character.shadow]) {
    if (!child.handle.layer.visible) continue;
    if (updateSprite2D(child.handle, { color: multiply(baseColors.get(child.handle) ?? [1, 1, 1, 1], tint) })) countPerformance("anchor tint patches");
  }
}

/** Keep a composite entity's two visual children adjacent in the shared world-depth pass. */
export function setCharacterSpriteOrder(character: CharacterSprite, order: number) {
  character.shadow.handle.layer.order = order;
  character.main.handle.layer.order = order + 1;
}

export const CHARACTER_HOP_HEIGHT_PX = 6.4;
export const PLAYER_HOP_HEIGHT_PX = CHARACTER_HOP_HEIGHT_PX - 2;
const SHADOW_MINIMUM_WIDTH = 0.65;
const SHADOW_MINIMUM_OPACITY = 0.8;

/** Updates a composite character and its renderer-only hop/shadow movement pulse. */
export function updateCharacterSprite(character: CharacterSprite, positionPx: Point, order: number, mainPatch: Partial<Sprite2DProps> = {}, movementPulse = 0, hopHeightPx = CHARACTER_HOP_HEIGHT_PX, opacity = 1, shadowSizePx?: Point) {
  if (!character.main.handle.layer.visible && !character.shadow.handle.layer.visible) return;
  const [x, y] = positionPx;
  const pulse = Math.max(0, Math.min(1, movementPulse));
  const shadowWidthScale = 1 - (1 - SHADOW_MINIMUM_WIDTH) * pulse;
  const shadowOpacity = 1 - (1 - SHADOW_MINIMUM_OPACITY) * pulse;
  const tint = characterTints.get(character) ?? [1, 1, 1, 1];
  const shadowBase: Tint = [1, 1, 1, shadowOpacity * opacity];
  const mainBase = mainPatch.color ?? baseColors.get(character.main.handle) ?? [1, 1, 1, 1];
  baseColors.set(character.shadow.handle, shadowBase); baseColors.set(character.main.handle, mainBase);
  setCharacterSpriteOrder(character, order);
  updateSprite2D(character.shadow.handle, { positionPx: [x + character.shadow.offsetPx[0], y + character.shadow.offsetPx[1]], sizePx: shadowSizePx ? [shadowSizePx[0], shadowSizePx[1]] : [32 * shadowWidthScale, 32], color: multiply(shadowBase, tint) });
  updateSprite2D(character.main.handle, { ...mainPatch, color: multiply(mainBase, tint), positionPx: mainPatch.positionPx ?? [x + character.main.offsetPx[0], y + character.main.offsetPx[1] - hopHeightPx * pulse] });
}

export function hideCharacterSprite(character: CharacterSprite) {
  updateCharacterSprite(character, [-10000, -10000], -10000);
}
