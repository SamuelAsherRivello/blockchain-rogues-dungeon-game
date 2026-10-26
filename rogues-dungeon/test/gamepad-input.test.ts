import test from "node:test";
import assert from "node:assert/strict";
import { getGamepadDirection } from "../src/game/gamepad-input.ts";
import { GamepadReticleController, getGamepadReticleInput, getReticleNeighbor } from "../src/game/gamepad-reticle.ts";
import { claimMovement, getLatestMovement } from "../src/game/keyboard-input.ts";
import { MovementPromptController, rightStickPromptResponse } from "../src/game/movement-prompt-controller.ts";

function pad(x = 0, y = 0, pressed: number[] = []) {
  return { connected: true, mapping: "standard" as const, axes: [x, y], buttons: Array.from({ length: 16 }, (_, index) => ({ pressed: pressed.includes(index), touched: false, value: pressed.includes(index) ? 1 : 0 })) };
}

test("left stick maps cardinal directions with a dead zone and dominant axis", () => {
  for (const [x, y, direction] of [[-1, 0, "w"], [1, 0, "e"], [0, -1, "n"], [0, 1, "s"], [.4, -.8, "n"], [-.8, .4, "w"]] as const) {
    assert.equal(getGamepadDirection([pad(x, y)]), direction);
  }
  assert.equal(getGamepadDirection([pad(.25, -.25)]), null);
  assert.equal(getGamepadDirection([pad(NaN, 1)]), null);
});

test("D-pad overrides the left stick and opposing buttons cancel", () => {
  for (const [button, direction] of [[12, "n"], [13, "s"], [14, "w"], [15, "e"]] as const) {
    assert.equal(getGamepadDirection([pad(1, 1, [button])]), direction);
  }
  assert.equal(getGamepadDirection([pad(0, 0, [12, 13, 14, 15])]), null);
  assert.equal(getGamepadDirection([pad(0, 0, [12, 15])]), "n");
});

test("missing, neutral, disconnected and nonstandard controllers do not move", () => {
  assert.equal(getGamepadDirection([]), null);
  assert.equal(getGamepadDirection([null, pad()]), null);
  assert.equal(getGamepadDirection([{ ...pad(1), connected: false }]), null);
  assert.equal(getGamepadDirection([{ ...pad(1), mapping: "" }]), null);
  assert.equal(getGamepadDirection([null, pad(), pad(0, -1)]), "n");
  assert.equal(getGamepadDirection([{ ...pad(), axes: [0, 0, 1, 1] }]), null);
  assert.equal(getGamepadDirection([pad(0, 0, [0, 1, 4, 5])]), null);
});

const neutral = { x: 0, y: 0, left: false, right: false };

test("exclusive UI reset blocks held aiming and triggers until neutral and does not revive hidden targets", () => {
  const controller = reticle();
  controller.advance({ ...neutral, x: 1 }); controller.reset();
  assert.equal(controller.offset, null);
  for (let frame = 0; frame < 5; frame++) assert.equal(controller.advance({ ...neutral, x: 1, left: true }), null);
  controller.advance(neutral);
  assert.deepEqual(controller.advance({ ...neutral, y: -1 })!.offset, { x: 0, y: -1 });
});

test("prompt directions preserve confirmation and cancellation while blocking disabled and pending confirmations", () => {
  assert.equal(rightStickPromptResponse("e", { direction: "e" }), "confirm");
  assert.equal(rightStickPromptResponse("w", { direction: "e" }), "cancel");
  assert.equal(rightStickPromptResponse("e", { direction: "e", disabled: true }), "blocked");
  assert.equal(rightStickPromptResponse("e", { direction: "e", confirming: true }), "blocked");
  assert.equal(rightStickPromptResponse("n"), "cancel");
});

test("right-stick prompt context requires neutral, consumes one gesture and cannot leak into aiming", () => {
  const controller = reticle();
  controller.advance({ ...neutral, x: 1 });
  assert.deepEqual(controller.advance({ ...neutral, x: 1 }, 1, true), { offset: null, click: null });
  assert.equal(controller.advance({ ...neutral, x: 1 }, 1, true), null);
  controller.advance(neutral, 1, true);
  assert.deepEqual(controller.advance({ ...neutral, x: -1 }, 1, true), { offset: null, click: null, prompt: "w" });
  assert.equal(controller.advance({ ...neutral, x: -1 }, 1, true), null);
  controller.advance({ ...neutral, x: -1 }, 2, false);
  assert.equal(controller.advance({ ...neutral, x: -1 }, 2, false), null);
  controller.advance(neutral, 2, false);
  assert.deepEqual(controller.advance({ ...neutral, y: 1 }, 2, false)!.offset, { x: 0, y: 1 });
});

test("only the newest visible right-stick prompt responds and membership revisions are stable", () => {
  const prompts = new MovementPromptController(); const calls: string[] = [];
  assert.equal(prompts.respondToRightStick("e"), false);
  const closeA = prompts.subscribeRightStick(direction => calls.push(`a:${direction}`));
  const closeB = prompts.subscribeRightStick(direction => calls.push(`b:${direction}`));
  const revision = prompts.revision;
  assert.equal(prompts.respondToRightStick("e"), true);
  assert.deepEqual(calls, ["b:e"]);
  assert.equal(prompts.revision, revision);
  closeB(); prompts.respondToRightStick("w"); closeA();
  assert.deepEqual(calls, ["b:e", "a:w"]);
  assert.equal(prompts.hasRightStickPrompt, false);
});

test("movement handoff removes incompatible held entries without stale fallback and keeps keyboard combinations", () => {
  const held = new Map<string, { direction: "n" | "s" | "e" | "w" }>();
  claimMovement(held, "gamepad", "e");
  claimMovement(held, "KeyW", "n");
  assert.deepEqual([...held.keys()], ["KeyW"]);
  held.delete("KeyW");
  assert.equal(getLatestMovement(held), null);
  claimMovement(held, "KeyW", "n"); claimMovement(held, "KeyA", "w");
  assert.equal(held.size, 2);
  claimMovement(held, "gamepad", "s");
  assert.deepEqual([...held.keys()], ["gamepad"]);
  held.delete("gamepad");
  assert.equal(getLatestMovement(held), null);
});
function reticle(gamepadMode = true) {
  const controller = new GamepadReticleController();
  controller.advance(neutral);
  if (gamepadMode) {
    controller.advance({ ...neutral, buttons: [true] });
    controller.advance(neutral);
  }
  return controller;
}

test("right stick has a dead zone and standard triggers; every gamepad button is sampled", () => {
  const read = (x: number, y: number, buttons: number[] = []) => getGamepadReticleInput([{ ...pad(0, 0, buttons), axes: [0, 0, x, y] }]);
  assert.equal(read(.1, -.1).x, 0);
  assert.equal(read(.1, -.1).y, 0);
  assert.equal(read(0, 0, [6]).left, true);
  assert.equal(read(0, 0, [7]).right, true);
  assert.equal(read(0, 0, [4, 5]).buttons?.[4], true);
  assert.equal(read(0, 0, [4, 5]).buttons?.[5], true);
  assert.equal(read(NaN, 1).y, 0);
  assert.equal(getGamepadReticleInput([{ ...pad(), connected: false }]).connected, false);
});

test("right stick selects exactly eight neighboring offsets regardless of intensity or hold duration", () => {
  const offsets = new Set<string>();
  for (const [x, y] of [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]]) {
    const controller = reticle();
    const offset = controller.advance({ ...neutral, x, y })!.offset!;
    assert.deepEqual(offset, { x, y });
    offsets.add(`${offset.x},${offset.y}`);
    for (let frame = 0; frame < 100; frame++) controller.advance({ ...neutral, x, y });
    assert.deepEqual(controller.offset, offset);
    assert.deepEqual(getReticleNeighbor(x * .3, y * .3), offset);
  }
  assert.equal(offsets.size, 8);
  assert.deepEqual(getReticleNeighbor(1, .1), { x: 1, y: 0 });
  assert.equal(getReticleNeighbor(0, 0), null);
});

test("right stick takes aiming immediately and unchanged held input cannot override a newer mouse move", () => {
  const controller = reticle();
  assert.deepEqual(controller.advance({ ...neutral, x: 1 })!.offset, { x: 1, y: 0 });
  controller.mouseMoved({ x: 100, y: 200 });
  assert.equal(controller.source, "mouse");
  assert.equal(controller.advance({ ...neutral, x: 1 }), null);
  assert.deepEqual(controller.advance({ ...neutral, y: -1 })!.offset, { x: 0, y: -1 });
  assert.equal(controller.source, "gamepad");
  assert.equal(controller.advance({ ...neutral, y: -1 }), null);
  assert.deepEqual(controller.advance({ ...neutral, x: 1, y: -1 })!.offset, { x: 1, y: -1 });
  assert.equal(controller.mouseMoved({ x: 100, y: 200 }), false);
  assert.equal(controller.source, "gamepad");
});

test("movement and face buttons preserve mouse aiming; triggers click once before hiding", () => {
  for (let button = 0; button < 16; button++) {
    const controller = reticle();
    controller.mouseMoved({ x: 100, y: 200 });
    assert.equal(controller.advance({ ...neutral, buttons: Array.from({ length: 16 }, (_, index) => index === button) }), null);
    assert.equal(controller.source, "mouse");
    assert.equal(controller.offset, null);
  }
  const controller = reticle();
  controller.advance({ ...neutral, x: 1 });
  assert.deepEqual(controller.advance({ ...neutral, left: true }), { offset: null, click: 0 });
  assert.equal(controller.advance({ ...neutral, left: true }), null);
  controller.advance(neutral);
  assert.deepEqual(controller.advance({ ...neutral, right: true }), { offset: null, click: 2 });
  controller.reset();
  assert.equal(controller.advance({ ...neutral, right: true }), null);
  controller.advance(neutral);
  assert.equal(controller.advance({ ...neutral, right: true })!.click, 2);
});
