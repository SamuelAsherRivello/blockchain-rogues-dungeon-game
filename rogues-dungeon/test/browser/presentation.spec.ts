import { expect, test } from "@playwright/test";
import { openSavedGame } from "./start-saved-game.ts";

test("desktop and mobile preview retain playable landscape layouts", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 975, height: 450 });
  await page.goto("/blockchain-rogues-dungeon-game/?mute=1");
  await openSavedGame(page);
  const viewport = page.locator("#viewport");
  await expect(viewport).toHaveAttribute("data-layout", "desktop");
  await expect(page.locator(".status-bar")).toBeVisible();
  await expect(page.getByLabel("Zoom")).toHaveValue("1");
  await page.getByRole("button", { name: "Fullscreen" }).click();
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
  await page.getByRole("button", { name: "Fullscreen" }).click();
  await page.getByRole("button", { name: "L:D" }).click();
  await expect(viewport).toHaveAttribute("data-layout", "mobile");
  await expect(page.locator(".status-bar")).toHaveCount(0);
  await expect(page.locator(".mobile-information-panels .info-panel--primary")).toBeVisible();
  await expect(page.locator(".mobile-minimap-hud")).toBeVisible();
  expect((await viewport.boundingBox())!.width).toBeCloseTo(975, 0);
  await page.getByRole("button", { name: "Panels" }).click();
  await expect(page.locator(".mobile-information-panels .info-panel--secondary")).toBeVisible();
  await expect(page.locator(".minimap-view")).toHaveCount(2);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Layout: Desktop" }).click();
  await expect(viewport).toHaveAttribute("data-layout", "desktop");
});
