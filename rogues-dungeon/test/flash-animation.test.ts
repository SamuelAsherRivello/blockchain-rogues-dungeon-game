import assert from "node:assert/strict";
import test from "node:test";
import { flashStrength, TurnPresentationSystem } from "../src/systems/animation/turn-presentation-system.ts";

test("flash fades in, holds, and fades out over three 100ms phases", () => {
  assert.deepEqual([-1, 0, 50, 100, 150, 200, 250, 300].map(flashStrength), [0, 0, .5, 1, 1, 1, .5, 0]);
});

test("a new flash replaces the previous color and expires", () => {
  const presentation = new TurnPresentationSystem();
  presentation.beginFlash("player", "white", 0);
  assert.deepEqual(presentation.flashOf("player", 100), { color: "white", strength: 1 });
  presentation.beginDamageReaction("player", 100);
  assert.deepEqual(presentation.flashOf("player", 150), { color: "red", strength: .5 });
  presentation.sample(400);
  assert.equal(presentation.flashOf("player", 400).strength, 0);
});
