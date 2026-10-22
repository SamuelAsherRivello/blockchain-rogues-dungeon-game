import { useEffect, useRef } from "react";
import type { Direction } from "./types.ts";

const STICK_DEAD_ZONE = 0.25;

export type MovementGamepad = Pick<Gamepad, "axes" | "buttons" | "connected" | "mapping">;

export function getGamepadDirection(gamepads: readonly (MovementGamepad | null)[]): Direction | null {
  for (const gamepad of gamepads) {
    if (!gamepad?.connected || gamepad.mapping !== "standard") continue;
    const pressed = (index: number) => gamepad.buttons[index]?.pressed || (gamepad.buttons[index]?.value ?? 0) > 0.5;
    const dx = Number(pressed(15)) - Number(pressed(14));
    const dy = Number(pressed(13)) - Number(pressed(12));
    if (dy) return dy < 0 ? "n" : "s";
    if (dx) return dx < 0 ? "w" : "e";
    const x = gamepad.axes[0] ?? 0;
    const y = gamepad.axes[1] ?? 0;
    if (!Number.isFinite(x) || !Number.isFinite(y) || Math.max(Math.abs(x), Math.abs(y)) <= STICK_DEAD_ZONE) continue;
    return Math.abs(x) > Math.abs(y) ? x < 0 ? "w" : "e" : y < 0 ? "n" : "s";
  }
  return null;
}

export function useGamepadMovement(enabled: boolean, resetKey: string, onDirection: (direction: Direction | null) => void) {
  const callback = useRef(onDirection);
  callback.current = onDirection;
  useEffect(() => {
    if (!enabled || !navigator.getGamepads) return;
    let frame = 0;
    let previous: Direction | null = null;
    // A held control must return to neutral after a dialog, floor or Battle change.
    let needsNeutral = true;
    const release = () => {
      needsNeutral = true;
      if (previous) { previous = null; callback.current(null); }
    };
    const poll = () => {
      const focused = document.hasFocus() && !document.hidden;
      const editable = document.activeElement instanceof HTMLElement && (document.activeElement.isContentEditable || document.activeElement.closest("input, textarea, select, [contenteditable='true']"));
      if (!focused || editable) release();
      else {
        const direction = getGamepadDirection(navigator.getGamepads());
        if (!direction) needsNeutral = false;
        const next = needsNeutral ? null : direction;
        if (next !== previous) { previous = next; callback.current(next); }
      }
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
