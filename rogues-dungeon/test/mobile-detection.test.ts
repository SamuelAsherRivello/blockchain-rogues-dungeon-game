import assert from "node:assert/strict";
import test from "node:test";
import { classifyPlatform } from "../src/ui/layout.ts";

test("detects emulated phone touch viewports with a desktop user agent", () => {
  for (const [viewportWidth, viewportHeight] of [[390, 844], [844, 390]]) {
    assert.equal(classifyPlatform({ userAgent: "Chrome Windows", userAgentDataMobile: false, maxTouchPoints: 1, viewportWidth, viewportHeight }), "mobile");
    assert.equal(classifyPlatform({ coarsePointer: true, viewportWidth, viewportHeight }), "mobile");
  }
});

test("detects iPad desktop user agents and preserves desktop browser use", () => {
  assert.equal(classifyPlatform({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X)", maxTouchPoints: 5 }), "mobile");
  assert.equal(classifyPlatform({ viewportWidth: 390, viewportHeight: 844 }), "pc");
  assert.equal(classifyPlatform({ maxTouchPoints: 10, viewportWidth: 1920, viewportHeight: 1080 }), "pc");
  assert.equal(classifyPlatform({ userAgent: "iPhone" }), "mobile");
});
