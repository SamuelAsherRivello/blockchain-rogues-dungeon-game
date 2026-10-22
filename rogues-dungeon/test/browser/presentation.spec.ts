import type { Page } from '@playwright/test';
import { expect, test } from "@playwright/test";
import { openSavedGame } from "./start-saved-game.ts";

const mobileAgent = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";

async function startCampaign(page: Page) {
  await page.goto("/blockchain-rogues-dungeon-game/?mute=1");
  await openSavedGame(page);
  await expect(page.locator(".game-screen")).toBeVisible();
}

test("PC aspect preview and portrait/mobile layouts keep controls and information reachable", async ({ page, browser }) => {
  // Four browser contexts and two complete WebGPU campaign startups share this budget.
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  await startCampaign(page);
  await expect(page.locator("#viewport")).toHaveAttribute("data-orientation", "landscape");
  await expect(page.getByRole("button", { name: "AR: L", exact: true })).toBeVisible();
  expect(await page.locator(".title-bar").evaluate((element) => element.getBoundingClientRect().height / element.parentElement!.getBoundingClientRect().height)).toBeCloseTo(0.04, 2);
  expect(await page.locator(".status-bar").evaluate((element) => element.getBoundingClientRect().height / element.parentElement!.getBoundingClientRect().height)).toBeCloseTo(0.04, 2);
  expect(await page.locator(".app_corner, .corner").count()).toBe(0);

  await page.getByRole("button", { name: "Fullscreen" }).click();
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
  await page.getByRole("button", { name: "Fullscreen" }).click();
  await page.getByRole("button", { name: "AR: L", exact: true }).click();
  await expect(page.locator("#viewport")).toHaveAttribute("data-orientation", "portrait");
  await expect(page.getByRole("button", { name: "Control" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".mobile-controls")).toBeVisible();
  await page.getByRole("button", { name: "Info" }).click();
  await expect(page.locator(".mobile-information-panels")).toBeVisible();
  await page.locator(".mobile_bottom").evaluate((element) => { element.scrollTop = element.scrollHeight; });
  await expect(page.locator(".mobile-information-panels").getByRole("heading", { name: /inventory/i })).toBeVisible();
  await expect(page.locator(".mobile-information-panels .inventory_scroll .scroll-area__viewport")).toHaveCSS("overflow-y", "scroll");

  for (const [width, height, deviceScaleFactor] of [[360, 640, 1], [390, 693, 2]]) {
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor,
      isMobile: true,
      hasTouch: true,
      userAgent: mobileAgent,
    });
    const mobilePage = await context.newPage();
    await mobilePage.goto("/blockchain-rogues-dungeon-game/?mute=1");
    await expect(mobilePage.getByText("Mobile browser version is WIP. Play on laptop browser instead.", { exact: true })).toBeVisible();
    await expect(mobilePage.locator("canvas, .game-screen")).toHaveCount(0);
    expect(await mobilePage.evaluate(() => devicePixelRatio)).toBe(deviceScaleFactor);
    await test.info().attach(`portrait-${width}x${height}-dpr-${deviceScaleFactor}`, {
      body: await mobilePage.screenshot(),
      contentType: "image/png",
    });
    await context.close();
  }

  // A 1280×720 display at 125% browser zoom exposes a 1024×576 CSS viewport.
  const zoomContext = await browser.newContext({
    viewport: { width: 1024, height: 576 },
    deviceScaleFactor: 1.25,
  });
  const zoomPage = await zoomContext.newPage();
  await startCampaign(zoomPage);
  await expect(zoomPage.locator("#viewport")).toHaveAttribute("data-orientation", "landscape");
  expect(await zoomPage.evaluate(() => devicePixelRatio)).toBe(1.25);
  await expect(zoomPage.getByLabel("Zoom")).toHaveValue("1");
  // The collapsed, transparent keyboard tray sits below the shell for its
  // slide animation and contributes to scrollHeight. Check the visible layout
  // and its clipping boundary rather than that hidden animation geometry.
  expect(await zoomPage.locator(".game-screen").evaluate((element) => {
    const frame = element.getBoundingClientRect();
    const clipped = getComputedStyle(element).overflow === "hidden";
    const contained = [".title-bar", ".game-screen__middle", ".status-bar"].every((selector) => {
      const rect = element.querySelector(selector)!.getBoundingClientRect();
      return rect.left >= frame.left - 1 && rect.right <= frame.right + 1
        && rect.top >= frame.top - 1 && rect.bottom <= frame.bottom + 1;
    });
    return clipped && contained && frame.right <= innerWidth && frame.bottom <= innerHeight;
  })).toBe(true);
  await test.info().attach("pc-effective-125-percent-browser-zoom", {
    body: await zoomPage.screenshot(),
    contentType: "image/png",
  });
  await zoomContext.close();

  await test.info().attach("pc-aspect-preview", { body: await page.screenshot(), contentType: "image/png" });
});
