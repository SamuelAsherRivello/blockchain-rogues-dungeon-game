import { expect, test, type Page } from "@playwright/test";

const gameUrl = "/blockchain-rogues-dungeon-game/?mute=1&slot=1";

async function expectFittedRatio(page: Page, minimum: number, maximum: number) {
  await expect.poll(() => page.locator("#viewport").evaluate((viewport, bounds: { minimum: number; maximum: number }) => {
    const frame = viewport.getBoundingClientRect();
    const surface = viewport.parentElement!.getBoundingClientRect();
    const expectedRatio = Math.min(bounds.maximum, Math.max(bounds.minimum, surface.width / surface.height));
    return Math.max(Math.abs(frame.width / frame.height - expectedRatio), Math.abs(frame.left + frame.width / 2 - surface.left - surface.width / 2), Math.abs(frame.top + frame.height / 2 - surface.top - surface.height / 2));
  }, { minimum, maximum })).toBeLessThan(.01);
}

test("@smoke landscape aspect range preserves panel widths and a ready world", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto(gameUrl);
  await expect(page.locator('.world-view[data-renderer-ready="true"]')).toBeVisible({ timeout: 30_000 });

  for (const size of [{ width: 1600, height: 1000 }, { width: 1680, height: 1000 }, { width: 1920, height: 1000 }]) {
    await page.setViewportSize(size);
    await expectFittedRatio(page, 16 / 10, 16 / 9);
    await expect.poll(() => page.evaluate(() => {
      const viewport = document.querySelector("#viewport")!.getBoundingClientRect();
      const world = document.querySelector(".world-view-region")!.getBoundingClientRect();
      const primary = document.querySelector(".information-panels .info-panel--primary")!.getBoundingClientRect();
      const secondary = document.querySelector(".information-panels .info-panel--secondary")!.getBoundingClientRect();
      const expectedColumnWidth = viewport.height * 16 / 9 * .22;
      return Math.max(Math.abs(primary.width - expectedColumnWidth), Math.abs(secondary.width - expectedColumnWidth), Math.abs(primary.width - secondary.width), Math.abs(world.right - primary.left));
    })).toBeLessThan(1.5);
    await expect(page.locator('.world-view[data-renderer-ready="true"]')).toBeVisible();
  }
});

test("@smoke mobile keeps the landscape game visible in either device orientation", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: "Mozilla/5.0 (Linux; Android 14) Mobile",
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  try {
    await page.goto("/blockchain-rogues-dungeon-game/?mute=1");
    await expect(page.locator("#viewport")).toBeVisible();
    await expect(page.locator("#viewport")).toHaveAttribute("data-orientation", "landscape");
    await expect(page.getByText("Turn your device sideways to play.")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Fullscreen", exact: true })).toBeVisible();
    await expect(page.locator("#viewport")).toHaveAttribute("inert", "");
    await page.getByRole("button", { name: "Fullscreen", exact: true }).click();
    await expect(page.getByRole("button", { name: "Fullscreen", exact: true })).toHaveCount(0);
    await expect(page.locator("#viewport")).not.toHaveAttribute("inert", "");
    await expect.poll(() => page.locator("#browser_surface").evaluate((element) => ({ width: element.clientWidth, height: element.clientHeight }))).toEqual({ width: 844, height: 390 });
    await expect(page.getByRole("button", { name: /Saved Game 1/ })).toBeVisible();
    await page.setViewportSize({ width: 844, height: 390 });
    await expect(page.locator("#viewport")).toBeVisible();
    await expect(page.locator("#viewport")).toHaveAttribute("data-orientation", "landscape");
    await expect.poll(() => page.locator("#browser_surface").evaluate((element) => ({ width: element.clientWidth, height: element.clientHeight }))).toEqual({ width: 844, height: 390 });
  } finally {
    await context.close();
  }
});
