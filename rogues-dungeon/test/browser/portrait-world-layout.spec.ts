import { expect, test } from "@playwright/test";

test("portrait world uses the full top section with either bottom panel", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => localStorage.setItem("rogues-dungeon.dev.aspect", "portrait"));
  await page.goto("/blockchain-rogues-dungeon-game/?mute=1&slot=1");
  await expect(page.locator('.game-screen[data-orientation="portrait"]')).toBeVisible();
  await expect(page.locator('.world-view[data-renderer-ready="true"]')).toBeVisible({ timeout: 30_000 });

  for (const panel of ["Info", "Control"]) {
    await page.getByRole("button", { name: panel, exact: true }).click();
    await expect.poll(async () => page.evaluate(() => {
      const section = document.querySelector(".game-screen__middle")!.getBoundingClientRect();
      const world = document.querySelector(".world-view")!.getBoundingClientRect();
      const canvas = document.querySelector(".world-view canvas")!.getBoundingClientRect();
      return Math.max(Math.abs(section.left - world.left), Math.abs(section.width - world.width), Math.abs(section.width - canvas.width));
    })).toBeLessThan(1);
  }
  await page.screenshot({ path: ".playwright-cli/portrait-world-full-width.png" });
});
