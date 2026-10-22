import { expect, test, type Page } from "@playwright/test";

async function expectFittedPortrait(page: Page) {
  await expect.poll(async () => page.locator("#viewport").evaluate((viewport) => {
    const frame = viewport.getBoundingClientRect();
    const surface = viewport.parentElement!.getBoundingClientRect();
    const expectedRatio = Math.min(10 / 16, Math.max(9 / 16, surface.width / surface.height));
    return Math.max(Math.abs(frame.width / frame.height - expectedRatio), Math.abs(frame.left + frame.width / 2 - surface.left - surface.width / 2));
  })).toBeLessThan(.01);
}

async function expectSettingsAligned(page: Page) {
  await expect.poll(async () => {
    const menu = await page.locator(".main-menu-window").boundingBox();
    const settings = await page.locator(".settings-window--menu").boundingBox();
    if (!menu || !settings) return Infinity;
    return Math.max(...(["x", "y", "width", "height"] as const).map((key) => Math.abs(menu[key] - settings[key])));
  }).toBeLessThan(1);
}

test("fullscreen preserves the portrait frame in menus and gameplay", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => localStorage.setItem("rogues-dungeon.dev.aspect", "portrait"));
  await page.goto("/blockchain-rogues-dungeon-game/?mute=1");
  await expectFittedPortrait(page);
  await page.getByRole("button", { name: "Toggle Fullscreen", exact: true }).click();
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
  await expectFittedPortrait(page);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.locator(".settings-window--menu")).toBeVisible();
  await expectSettingsAligned(page);
  await expectFittedPortrait(page);
  await expectSettingsAligned(page);
  // Browser-level exit can happen while a dialog remains open.
  await page.evaluate(() => document.exitFullscreen());
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(false);
  await expectFittedPortrait(page);
  await expectSettingsAligned(page);
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();

  await page.goto("/blockchain-rogues-dungeon-game/?mute=1&slot=1");
  await expect(page.locator('.world-view[data-renderer-ready="true"]')).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Fullscreen", exact: true }).click();
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
  await expectFittedPortrait(page);
  const world = await page.locator(".world-view").boundingBox();
  const viewport = await page.locator("#viewport").boundingBox();
  expect(Math.abs(world!.width - viewport!.width)).toBeLessThan(1);
  await page.screenshot({ path: ".playwright-cli/fullscreen-portrait-game.png" });
  await page.getByRole("button", { name: "Fullscreen", exact: true }).click();
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(false);
  await expectFittedPortrait(page);
});
