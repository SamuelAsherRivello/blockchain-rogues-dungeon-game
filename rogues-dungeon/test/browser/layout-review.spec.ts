import { expect, test } from "@playwright/test";
import { openSavedGame } from "./start-saved-game.ts";

test("@layout mobile landscape uses one column and square minimap", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 975, height: 450 });
  await page.goto("/blockchain-rogues-dungeon-game/?mute=1");
  await openSavedGame(page);
  await page.getByRole("button", { name: "L:D" }).click();
  const shell = page.locator(".game-screen");
  const world = page.locator(".world-view-region");
  const column = page.locator(".mobile-information-panels");
  const minimap = page.locator(".mobile-minimap-hud");
  const [shellBox, worldBox, columnBox, mapBox] = await Promise.all([shell.boundingBox(), world.boundingBox(), column.boundingBox(), minimap.boundingBox()]);
  expect(shellBox).not.toBeNull();
  expect(Math.abs(worldBox!.width + columnBox!.width - shellBox!.width)).toBeLessThan(2);
  expect(Math.abs(mapBox!.width - mapBox!.height)).toBeLessThan(2);
  expect(mapBox!.x + mapBox!.width).toBeLessThanOrEqual(worldBox!.x + worldBox!.width + 1);
  await expect(page.locator(".world-view canvas")).toBeVisible();
});
