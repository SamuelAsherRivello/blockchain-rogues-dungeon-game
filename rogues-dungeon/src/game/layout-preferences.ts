import type { GameLayout } from "../ui/layout.ts";
import type { Preferences } from "./types.ts";

export function preferencesForLayout(preferences: Preferences, layout: GameLayout): Preferences {
  return layout === "mobile"
    ? { ...preferences, zoom: 1, camera: "center", movementMode: "grid-tween" }
    : preferences;
}
