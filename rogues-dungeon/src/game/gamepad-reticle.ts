import { useEffect, useRef } from "react";
import type { MovementGamepad } from "./gamepad-input.ts";
import type { Direction, Position } from "./types.ts";
import { movementDirection } from "./movement-prompt-controller.ts";

const DEAD_ZONE = 0.2;
const neutralInput = () => ({ x: 0, y: 0, left: false, right: false });
export type GamepadReticleInput = ReturnType<typeof neutralInput> & { buttons?: readonly boolean[]; connected?: boolean };
interface ReticleUpdate { offset: Position | null; click: 0 | 2 | null; prompt?: Direction }

export function getGamepadReticleInput(gamepads: readonly (MovementGamepad | null)[]): GamepadReticleInput {
  for (const pad of gamepads) {
    if (!pad?.connected || pad.mapping !== "standard") continue;
    let x = pad.axes[2] ?? 0; let y = pad.axes[3] ?? 0;
    if (!Number.isFinite(x) || !Number.isFinite(y)) { x = 0; y = 0; }
    const length = Math.hypot(x, y);
    const scale = length > DEAD_ZONE ? (Math.min(1, length) - DEAD_ZONE) / (1 - DEAD_ZONE) / length : 0;
    const pressed = (index: number) => Boolean(pad.buttons[index]?.pressed || (pad.buttons[index]?.value ?? 0) > 0.5);
    return { x: scale ? x * scale : 0, y: scale ? y * scale : 0, left: pressed(6), right: pressed(7), buttons: pad.buttons.map((_, index) => pressed(index)), connected: true };
  }
  return { ...neutralInput(), connected: false };
}

export function getReticleNeighbor(x: number, y: number): Position | null {
  if (!x && !y) return null;
  const sector = Math.round(Math.atan2(y, x) / (Math.PI / 4));
  return { x: Math.round(Math.cos(sector * Math.PI / 4)) || 0, y: Math.round(Math.sin(sector * Math.PI / 4)) || 0 };
}

export class GamepadReticleController {
  source: "mouse" | "gamepad" = "mouse";
  private previous: GamepadReticleInput = neutralInput();
  private mouse: Position | null = null;
  private needsNeutral = true;
  private promptRevision = 0;
  offset: Position | null = null;

  mouseMoved(point: Position) {
    if (point.x === this.mouse?.x && point.y === this.mouse.y) return false;
    this.mouse = point;
    this.claimMouse();
    return true;
  }

  claimMouse() { this.source = "mouse"; this.offset = null; }

  reset() {
    this.needsNeutral = true;
    this.previous = neutralInput();
    this.offset = null;
    this.source = "mouse";
  }

  advance(input: GamepadReticleInput, promptRevision = 0, promptActive = false): ReticleUpdate | null {
    if (input.connected === false) {
      const hidden = this.source === "gamepad";
      this.reset();
      return hidden ? { offset: null, click: null } : null;
    }
    const active = Boolean(input.x || input.y);
    if (promptRevision !== this.promptRevision) {
      this.promptRevision = promptRevision;
      this.needsNeutral = true; this.offset = null; this.previous = input;
      return { offset: null, click: null };
    }
    const triggerPressed = input.left && !this.previous.left || input.right && !this.previous.right;
    if (this.needsNeutral) {
      if (!active && !input.left && !input.right) this.needsNeutral = false;
      this.previous = input;
      return null;
    }
    const stickChanged = Math.abs(input.x - this.previous.x) > .005 || Math.abs(input.y - this.previous.y) > .005;
    this.previous = input;
    if (promptActive) {
      if (!active) return null;
      this.needsNeutral = true; this.offset = null;
      return { offset: null, click: null, prompt: movementDirection({ x: 0, y: 0 }, input)! };
    }
    if (triggerPressed) {
      this.offset = null;
      return { offset: null, click: input.right ? 2 as const : 0 as const };
    }
    if (!active || !stickChanged) return null;
    this.source = "gamepad";
    this.offset = getReticleNeighbor(input.x, input.y);
    return { offset: this.offset, click: null };
  }
}

export function useGamepadReticle(enabled: boolean, resetKey: string, onInput: (input: GamepadReticleInput) => void, onRelease: () => void) {
  const callbacks = useRef({ onInput, onRelease });
  callbacks.current = { onInput, onRelease };
  useEffect(() => {
    callbacks.current.onRelease();
    if (!enabled || !navigator.getGamepads) return;
    let frame = 0;
    const release = () => callbacks.current.onRelease();
    const poll = () => {
      const editable = document.activeElement instanceof HTMLElement && (document.activeElement.isContentEditable || document.activeElement.closest("input, textarea, select, [contenteditable='true']"));
      if (document.hidden || !document.hasFocus() || editable) release();
      else callbacks.current.onInput(getGamepadReticleInput(navigator.getGamepads()));
      frame = requestAnimationFrame(poll);
    };
    window.addEventListener("blur", release);
    document.addEventListener("visibilitychange", release);
    frame = requestAnimationFrame(poll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("blur", release);
      document.removeEventListener("visibilitychange", release);
      release();
    };
  }, [enabled, resetKey]);
}
