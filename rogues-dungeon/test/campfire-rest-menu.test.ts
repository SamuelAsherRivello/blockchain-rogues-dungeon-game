import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { CAMPFIRE_IDLE_FRAME_COUNT, CAMPFIRE_IDLE_FRAME_DURATION_MS, CAMPFIRE_IDLE_FRAME_SIZE_PX, campfireIdleSpriteSheetPath } from "../src/content/world/campfire-idle-animation.ts";

test("campfire idle animation uses the three-frame sprite sheet at hero idle cadence", async () => {
  assert.equal(CAMPFIRE_IDLE_FRAME_DURATION_MS, 140);
  assert.equal(CAMPFIRE_IDLE_FRAME_COUNT, 3);
  assert.equal(CAMPFIRE_IDLE_FRAME_SIZE_PX, 30);
  assert.equal(campfireIdleSpriteSheetPath(), "/assets/art/game-view/campfire/campfire-idle-sheet.png");
  await access(new URL("../public/assets/art/game-view/campfire/campfire-idle-sheet.png", import.meta.url));
});

test("campfire confirmation preserves the bump timing and protected rest-time turn", async () => {
  const [game, renderer, world] = await Promise.all([
    readFile(new URL("../src/game/game.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/systems/rendering/babylon-render-system.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/systems/procedural/world-procedural-system.ts", import.meta.url), "utf8"),
  ]);
  assert.match(game, /\}, INTERACTIVE_BUMP_APEX_MS\);/);
  assert.match(game, /sessionRef\.current\?\.dispatch\(\{ type: "rest" \}\)/);
  assert.match(renderer, /campfireRestTransition\) \{ campfireRestReplenishmentCompleteRef\.current = false; setCampfireRestMessage\("Resting \.\.\."\); setCampfireRestPhase\("resting"\); setWorldAlive\(false\); setIrisRequested\(true\);/);
  assert.match(renderer, /setCampfireRestPhase\("resting"\); setWorldAlive\(false\); setIrisRequested\(true\)/);
  assert.match(renderer, /label=\{campfireRestPhase === "resting" \? campfireRestMessage : undefined\}/);
  assert.match(renderer, /CAMPFIRE_REST_PHASE_DURATION_MS = 1500/);
  assert.match(renderer, /setCampfireRestMessage\("Replenishing status \.\.\."\)/);
  assert.match(renderer, /CAMPFIRE_REST_SHIMMER_COUNT = 2/);
  assert.match(renderer, /onCampfireRestReplenish\?\.\(shimmerPass \/ CAMPFIRE_REST_SHIMMER_COUNT\)/);
  assert.match(game, /campfireMenu=\{campfireMenu\}/);
  assert.match(renderer, /findWorldTooltipPosition\(rect, \{ width: panel\.offsetWidth, height: panel\.offsetHeight \}, \[cellRect\(campfireMenu\.x, campfireMenu\.y\), cellRect\(campaign\.player\.x, campaign\.player\.y\)\], size \+ 8\)/);
  assert.match(world, /if \(action\.type === "rest"\) \{\s+if \(state\.counters\.gold < REST_GOLD_COST\) return reject\("insufficient-gold"/);
  assert.match(world, /state\.counters\.gold -= REST_GOLD_COST/);
  assert.match(world, /changeResource\(state, events, key, effectiveAttributes\(state\)\[key\], "campfire-rest"\)/);
  assert.match(world, /previousStatus = resourceState\(state\)/);
  assert.match(world, /replenishedStatus = resourceState\(state\)/);
  assert.match(game, /RESOURCE_WILL_REPLENISH/);
  assert.match(game, /data-will-replenish=\{RESOURCE_WILL_REPLENISH\[name\]\}/);
  assert.match(game, /const segmentStart = progress >= 1 \? \.5 : 0/);
  assert.match(world, /if \(!restTime\) \{[^}]*enemyPhase\(state, events\)/);
});
