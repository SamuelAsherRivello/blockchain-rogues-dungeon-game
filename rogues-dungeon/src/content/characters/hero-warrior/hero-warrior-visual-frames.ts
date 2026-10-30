import type { SpriteFrame } from "../../../systems/animation/sprite-animation-system.ts";
import { HERO_WARRIOR_APPEARANCES, type HeroWarriorAppearance } from "./hero-warrior-appearance.ts";
import { heroWarriorAnimationCatalog } from "./hero-warrior-animation.ts";

/** Image selection has no access to the animation clock and cannot restart it. */
export function createHeroWarriorVisualFrames(baseUrl = "/") {
  const catalogs = new Map(HERO_WARRIOR_APPEARANCES.map((appearance) => [appearance, new Map(heroWarriorAnimationCatalog(baseUrl, appearance).map((clip) => [clip.name, clip.frames]))]));
  const frames = Object.freeze([...catalogs.values()].flatMap((clips) => [...clips.values()].flat()));
  function resolve(appearance: HeroWarriorAppearance, animation: string, frameIndex: number): SpriteFrame {
    const sequence = catalogs.get(appearance)?.get(animation);
    if (!sequence || !Number.isInteger(frameIndex) || frameIndex < 0 || !sequence[frameIndex]) throw new Error(`Missing Hero Warrior frame: ${appearance}/${animation}/${frameIndex}`);
    return sequence[frameIndex]!;
  }
  return Object.freeze({ frames, resolve });
}
