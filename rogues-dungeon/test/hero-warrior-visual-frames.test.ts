import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createHeroWarriorAppearanceSelection, HERO_WARRIOR_APPEARANCES } from "../src/content/characters/hero-warrior/hero-warrior-appearance.ts";
import { createHeroWarriorAnimationEntity, HERO_WARRIOR_ANIMATION_NAMES, heroWarriorAnimationCatalog } from "../src/content/characters/hero-warrior/hero-warrior-animation.ts";
import { heroWarriorAtlasFrameKey, heroWarriorFrameSourceRect } from "../src/content/characters/hero-warrior/hero-warrior-atlas.ts";
import { createHeroWarriorVisualFrames } from "../src/content/characters/hero-warrior/hero-warrior-visual-frames.ts";
import type { Equipment, Item } from "../src/game/types.ts";

test("all four appearances contain 48 correctly timed native frames and unique atlas keys", () => {
  const visuals = createHeroWarriorVisualFrames("/game/");
  assert.equal(visuals.frames.length, 192);
  assert.equal(new Set(visuals.frames.map(heroWarriorAtlasFrameKey)).size, 192);
  for (const appearance of HERO_WARRIOR_APPEARANCES) {
    const catalog = heroWarriorAnimationCatalog("/game/", appearance);
    assert.deepEqual(catalog.map(c => c.name), HERO_WARRIOR_ANIMATION_NAMES);
    assert.deepEqual(catalog.map(c => c.frameCount), [4,4,4,6,6,6,4,4,4,6]);
    for (const clip of catalog) {
      assert.equal(clip.frameDurationMs, clip.name.startsWith("idle") ? 140 : clip.name.startsWith("run") ? 100 : clip.name.startsWith("attack") ? 90 : 120);
      assert.equal(clip.loopCount, clip.name.startsWith("attack") || clip.name === "death" ? 0 : -1);
      clip.frames.forEach((frame,index) => {
        assert.equal(frame.heightPx,48); assert.equal(frame.widthPx,clip.name === "death" ? 48 : 32);
        assert.deepEqual(visuals.resolve(appearance,clip.name,index),frame);
        if (appearance !== "sword-and-shield") assert.equal(frame.sheetFrame,index);
      });
    }
  }
});

test("resolving appearances preserves fractional frame timing and stopped state", () => {
  const entity = createHeroWarriorAnimationEntity("/game/");
  const visuals = createHeroWarriorVisualFrames("/game/");
  entity.start(); entity.update(340);
  assert.equal(entity.getState().frameIndex,1);
  const before = entity.getState();
  for (const appearance of HERO_WARRIOR_APPEARANCES) visuals.resolve(appearance,before.animation,before.frameIndex);
  assert.deepEqual(entity.getState(),before);
  entity.update(219); assert.equal(entity.getState().frameIndex,1);
  entity.update(1); assert.equal(entity.getState().frameIndex,2);
  entity.stop(); const stopped = entity.getState();
  visuals.resolve("unarmed",stopped.animation,stopped.frameIndex);
  entity.update(1000); assert.deepEqual(entity.getState(),stopped);
});

test("resolving a completed death does not restart the one-shot or reset loop progress", () => {
  const entity = createHeroWarriorAnimationEntity(); const visuals = createHeroWarriorVisualFrames();
  entity.selectAnimation("death");entity.start();entity.update(1440);
  const completed = entity.getState();
  assert.equal(completed.completed,true);assert.equal(completed.frameIndex,5);assert.equal(completed.loopsCompleted,1);
  for (const appearance of HERO_WARRIOR_APPEARANCES) visuals.resolve(appearance,"death",5);
  assert.deepEqual(entity.getState(),completed);
});

test("missing clips and frame indices fail with an identifiable appearance instead of frame zero", () => {
  const visuals = createHeroWarriorVisualFrames();
  for (const index of [-1,4,0.5]) assert.throws(() => visuals.resolve("unarmed","idle/down",index),/unarmed\/idle\/down/);
  assert.throws(() => visuals.resolve("shield-only","missing",0),/shield-only\/missing\/0/);
});

test("sheet cropping validates dimensions and extracts the declared native frame", () => {
  const frame={path:"idle-down.png",widthPx:32,heightPx:48,sheetFrame:3};
  assert.deepEqual(heroWarriorFrameSourceRect(frame,192,48),[96,0,32,48]);
  assert.throws(() => heroWarriorFrameSourceRect(frame,191,48),/idle-down.png/);
  assert.throws(() => heroWarriorFrameSourceRect({...frame,sheetFrame:6},192,48),/idle-down.png#6/);
  assert.throws(() => heroWarriorFrameSourceRect({...frame,sheetFrame:undefined},192,48),/dimensions/);
  assert.deepEqual(heroWarriorFrameSourceRect({...frame,sheetFrame:undefined},32,48),[0,0,32,48]);
});

test("every catalog frame resolves to a real PNG with matching crop dimensions", () => {
  const visuals=createHeroWarriorVisualFrames();
  for (const frame of visuals.frames) {
    const png=readFileSync(new URL(`../public${frame.path}`,import.meta.url));
    assert.equal(png.subarray(1,4).toString(),"PNG");
    const rect=heroWarriorFrameSourceRect(frame,png.readUInt32BE(16),png.readUInt32BE(20));
    assert.equal(rect[2],frame.widthPx);assert.equal(rect[3],frame.heightPx);
  }
  assert.equal(new Set(visuals.frames.map(f=>f.path)).size,78);
});

test("loaded equipment derives appearance and fatal equipment is held until the replacement actor", () => {
  const item:Item={id:"sword",name:"Sword",group:"weapons",modifiers:{}};
  const fatal:Equipment={weapons:[item,null],armor:[{...item,id:"armor",group:"armor"},null],jewels:[null,null]};
  const empty:Equipment={weapons:[null,null],armor:[null,null],jewels:[null,null]};
  const select=createHeroWarriorAppearanceSelection();
  assert.equal(select(JSON.parse(JSON.stringify(fatal))),"sword-and-shield");
  assert.equal(select(fatal,true),"sword-and-shield");
  assert.equal(select(empty,true),"sword-and-shield");
  assert.equal(select(empty,false),"unarmed");
  assert.equal(select(empty,true),"unarmed");
});
