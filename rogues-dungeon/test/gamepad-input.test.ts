import test from "node:test";
import assert from "node:assert/strict";
import { getGamepadDirection } from "../src/game/gamepad-input.ts";
import { GamepadReticleController, getGamepadReticleInput, getReticleNeighbor } from "../src/game/gamepad-reticle.ts";

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

test("mouse mode persists until a gamepad button press hides the reticle and fresh aiming reveals it", () => {
  const controller = reticle();
  assert.deepEqual(controller.advance({ ...neutral, x: 1 })!.offset, { x: 1, y: 0 });
  controller.mouseMoved({ x: 100, y: 200 });
  assert.equal(controller.source, "mouse");
  assert.equal(controller.advance({ ...neutral, y: -1 }), null);
  assert.equal(controller.source, "mouse");
  const hidden = controller.advance({ ...neutral, y: -1, buttons: [true] });
  assert.deepEqual(hidden, { offset: null, click: null });
  assert.equal(controller.source, "gamepad");
  assert.equal(controller.advance({ ...neutral, y: -1 }), null);
  assert.deepEqual(controller.advance({ ...neutral, x: 1, y: -1 })!.offset, { x: 1, y: -1 });
  assert.equal(controller.mouseMoved({ x: 100, y: 200 }), false);
  assert.equal(controller.source, "gamepad");
});

test("any gamepad button hides aiming; triggers click once before hiding", () => {
  for (let button = 0; button < 16; button++) {
    const controller = reticle();
    controller.advance({ ...neutral, x: 1 });
    controller.advance({ ...neutral, buttons: Array.from({ length: 16 }, (_, index) => index === button) });
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
