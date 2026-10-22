import assert from "node:assert/strict";
import test from "node:test";
import { createEnemyAnimationDefinitions, createEnemyAnimationEntities, createEnemyIdleAnimationDefinitions, enemyCharacterForName, enemyStaticIdleFramePath } from "../src/content/enemies/enemy-idle-animation.ts";

test("enemy idle definitions enumerate the source frames at their native dimensions", () => {
  const definitions = createEnemyIdleAnimationDefinitions("/game/");
  assert.equal(definitions.length, 8);
  assert.deepEqual(definitions.slice(0, 2).map(({ name, source }) => [name, source.kind === "frames" ? source.frames.length : 0, source.kind === "frames" ? source.frames[0] : null]), [
    ["idle", 5, { path: "/game/assets/art/game-view/enemies/rat/frames/idle/00.png", widthPx: 32, heightPx: 32 }],
    ["idle/down", 4, { path: "/game/assets/art/game-view/enemies/skeleton-warrior/frames/idle/down/00.png", widthPx: 32, heightPx: 48 }],
  ]);
});

test("every enemy exposes the complete supplied animation set", () => {
  const animations = createEnemyAnimationEntities("/game/", 1);
  for (const name of Object.keys(animations) as (keyof typeof animations)[]) {
    const catalog = animations[name].listAnimations();
    assert.ok(catalog.some((animation) => animation.name === "idle" || animation.name === "idle/down"));
    assert.ok(catalog.some((animation) => animation.name === "move" || animation.name === "move/down"));
    assert.ok(catalog.some((animation) => animation.name === "attack" || animation.name === "attack/down"));
    assert.ok(catalog.some((animation) => animation.name === "death"));
    animations[name].start(); animations[name].update(700);
    assert.equal(animations[name].getState().completed, false);
  }
});

test("full animation definitions preserve directional and prefixed source paths", () => {
  const archer = createEnemyAnimationDefinitions("/game/", "skeleton-archer");
  const archerAttack = archer.find((definition) => definition.name === "attack/side")?.source;
  assert.equal(archerAttack?.kind === "frames" ? archerAttack.frames.length : 0, 6);
  const blueSlime = createEnemyAnimationDefinitions("/game/", "slime-blue");
  const blueIdle = blueSlime.find((definition) => definition.name === "idle")?.source;
  assert.equal(blueIdle?.kind === "frames" ? blueIdle.frames[0].path : "", "/game/assets/art/game-view/enemies/slime-blue/frames/idle/idle00.png");
});

test("generated character IDs resolve to their authored static idle poses", () => {
  assert.equal(enemyCharacterForName("skeleton-warrior"), "skeleton-warrior");
  assert.equal(enemyCharacterForName("slime-blue"), "slime-blue");
  assert.equal(enemyStaticIdleFramePath("/game/", "skeleton-mage"), "/game/assets/art/game-view/enemies/skeleton-mage/frames/idle/down/00.png");
});
