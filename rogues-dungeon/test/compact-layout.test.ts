import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { aspectRatioPresets, fitViewport, mobileLandscapeLayout, selectGameLayout } from "../src/ui/layout.ts";
import { preferencesForLayout } from "../src/game/layout-preferences.ts";
import type { Preferences } from "../src/game/types.ts";

test("mobile defaults do not mutate or replace saved desktop preferences", () => {
  const saved: Preferences = { mobileMovementSpeed: "walk", movementMode: "grid-snap", zoom: 2, camera: "deadzone", fullscreenDesired: false, sfxVolume: 80, musicVolume: 1, muteAll: false, urlArgs: false };
  const mobile = preferencesForLayout(saved, "mobile");
  assert.deepEqual([mobile.zoom, mobile.camera, mobile.movementMode], [1, "center", "grid-tween"]);
  assert.deepEqual([saved.zoom, saved.camera, saved.movementMode], [2, "deadzone", "grid-snap"]);
  assert.equal(preferencesForLayout(saved, "desktop"), saved);
});

test("layout selection distinguishes physical mobile from desktop preview", () => {
  assert.equal(selectGameLayout("pc", null, true), "desktop");
  assert.equal(selectGameLayout("pc", "mobile", true), "mobile");
  assert.equal(selectGameLayout("pc", "invalid", true), "desktop");
  assert.equal(selectGameLayout("pc", "mobile", false), "desktop");
  assert.equal(selectGameLayout("mobile", "desktop", false), "mobile");
});

test("mobile fits landscape surfaces from 16:10 through 20:9", () => {
  for (const ratio of [16 / 10, 16 / 9, 19.5 / 9, 20 / 9]) {
    const fitted = fitViewport(ratio * 900, 900, mobileLandscapeLayout);
    assert.equal(fitted.width / fitted.height, ratio);
    assert.equal(fitted.x, 0);
  }
});

const css = await readFile(new URL("../src/ui/style.css", import.meta.url), "utf8");

// These are CSS-pixel fitted-shell budgets, not outer browser viewport sizes.
// Generous: >= 960px wide, intermediate: 720-959px, minimum supported: 640-719px.
const tiers = [
  { name: "generous", width: 960, height: 540 },
  { name: "intermediate", width: 720, height: 405 },
  { name: "minimum", width: 640, height: 360 },
] as const;

test("compact PC tiers preserve a fitted landscape ratio within the supported range", () => {
  for (const tier of tiers) {
    const fitted = fitViewport(tier.width, tier.height, { orientation: "landscape", ...aspectRatioPresets.landscape });
    assert.equal(fitted.width / fitted.height, 16 / 9, tier.name);
    assert.equal(fitted.width, tier.width, tier.name);
    assert.equal(fitted.height, tier.height, tier.name);
  }
  const intermediate = fitViewport(840, 500, { orientation: "landscape", ...aspectRatioPresets.landscape });
  assert.equal(intermediate.width / intermediate.height, 840 / 500);
  const minimum = fitViewport(800, 500, { orientation: "landscape", ...aspectRatioPresets.landscape });
  assert.equal(minimum.width / minimum.height, 16 / 10);
});

test("responsive CSS uses the fitted landscape container and staged budgets", () => {
  assert.match(css, /#viewport\s*\{[^}]*container-type:\s*size/);
  assert.match(css, /@container \(max-width: 960px\)/);
  assert.match(css, /@container \(max-width: 720px\)/);
  assert.match(css, /@container \(max-width: 640px\)/);
  assert.match(css, /#viewport\[data-orientation="landscape"\]/);
  assert.match(css, /\.dialog_backdrop--bounded[^}]*overflow:hidden/);
  assert.match(css, /\.dialog_backdrop--bounded:has\(\.settings-window--game\)[^}]*\.dialog[^}]*max-width:calc\(var\(--project-viewport-width\) - 1rem\) !important/);
  assert.match(css, /\.settings-window--game[^}]*width:46% !important/);
  assert.match(css, /\.main-menu-window__footer[^}]*margin-top:\.3rem/);
  assert.match(css, /--landscape-panel-column-width:39\.111111cqh/);
  assert.match(css, /--landscape-panels-width:78\.222222cqh/);
  assert.match(css, /#viewport\[data-orientation="landscape"\] \.information-panels[^}]*width:var\(--landscape-panels-width\)/);
  assert.doesNotMatch(css, /#viewport\[data-orientation="portrait"\][^}]*@container/);
});

test("compact layout keeps page scrolling disabled and existing scroll areas owned", () => {
  assert.match(css, /#content_layer\s*\{[^}]*overflow: auto/);
  assert.match(css, /\.menu-screen[^}]*overflow:hidden/);
  assert.match(css, /\.game-screen[^}]*overflow:hidden/);
  assert.match(css, /\.scroll-area__viewport[^}]*overflow-y:scroll/);
  assert.match(css, /\.dialog_body[^}]*overflow:auto/);
});
