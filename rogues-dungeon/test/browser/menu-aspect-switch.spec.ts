import { expect, test, type Page } from "@playwright/test";

async function expectMenuBounds(page: Page, selector: string) {
  await expect.poll(async () => {
    const menu = await page.locator(".main-menu-window").boundingBox();
    const dialog = await page.locator(selector).boundingBox();
    if (!menu || !dialog) return Infinity;
    return Math.max(...(["x", "y", "width", "height"] as const).map((key) => Math.abs(menu[key] - dialog[key])));
  }).toBeLessThan(1);
}

test("open menu dialogs retain their bounds while the viewport resizes", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/blockchain-rogues-dungeon-game/?mute=1");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expectMenuBounds(page, ".settings-window--menu");

  await expect(page.getByRole("button", { name: /Aspect Ratio:/ })).toHaveCount(0);
  for (const size of [{ width: 1280, height: 720 }, { width: 700, height: 500 }]) {
    await page.setViewportSize(size);
    await expectMenuBounds(page, ".settings-window--menu");
  }
  await page.getByRole("button", { name: "How To Play", exact: true }).click();
  await expectMenuBounds(page, ".how-to-play-window--menu");
  await page.setViewportSize({ width: 1440, height: 900 });
  await expectMenuBounds(page, ".how-to-play-window--menu");
});
