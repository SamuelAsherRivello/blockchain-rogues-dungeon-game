import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { aspectRatioPresets, fitViewport } from "../src/ui/layout.ts";

const css = await readFile(new URL("../src/ui/style.css", import.meta.url), "utf8");

// These are CSS-pixel fitted-shell budgets, not outer browser viewport sizes.
// Generous: >= 960px wide, intermediate: 720-959px, minimum supported: 640-719px.
const tiers = [
  { name: "generous", width: 960, height: 540 },
  { name: "intermediate", width: 720, height: 405 },
  { name: "minimum", width: 640, height: 360 },
] as const;

test("compact PC tiers preserve the fitted 16:9 viewport geometry", () => {
  for (const tier of tiers) {
    const fitted = fitViewport(tier.width, tier.height, { orientation: "landscape", ...aspectRatioPresets.landscape });
    assert.equal(fitted.width / fitted.height, 16 / 9, tier.name);
    assert.equal(fitted.width, tier.width, tier.name);
    assert.equal(fitted.height, tier.height, tier.name);
  }
});

test("responsive CSS uses the fitted landscape container and staged budgets", () => {
  assert.match(css, /#viewport\s*\{[^}]*container-type:\s*size/);
  assert.match(css, /@container \(max-width: 960px\)/);
  assert.match(css, /@container \(max-width: 720px\)/);
  assert.match(css, /@container \(max-width: 640px\)/);
  assert.match(css, /#viewport\[data-orientation="landscape"\]/);
  assert.match(css, /\.dialog_backdrop--bounded[^}]*overflow:hidden/);
  assert.match(css, /\.dialog_backdrop--bounded \.dialog[^}]*max-width:calc\(var\(--project-viewport-width\) - 1rem\) !important/);
  assert.match(css, /\.settings-window--game[^}]*width:46% !important/);
  assert.match(css, /\.main-menu-window__footer[^}]*margin-top:\.3rem/);
  assert.match(css, /\.information-panels[^}]*inset:0 0 0 66%/);
  assert.doesNotMatch(css, /#viewport\[data-orientation="portrait"\][^}]*@container/);
});

test("compact layout keeps page scrolling disabled and existing scroll areas owned", () => {
  assert.match(css, /#content_layer\s*\{[^}]*overflow: auto/);
  assert.match(css, /\.menu-screen[^}]*overflow:hidden/);
  assert.match(css, /\.game-screen[^}]*overflow:hidden/);
  assert.match(css, /\.scroll-area__viewport[^}]*overflow-y:scroll/);
  assert.match(css, /\.dialog_body[^}]*overflow:auto/);
});
