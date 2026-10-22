import { expect, test } from "@playwright/test";

test("opens the campfire rest menu without a turn and rests for exactly one turn", async ({ page }) => {
  await page.goto("/blockchain-rogues-dungeon-game/?seed=1&level=1&level-1-test-mode=true&slot=3&mute=1");
  await expect(page.locator(".world-view canvas")).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await expect.poll(() => page.evaluate(() => {
    const campaign = JSON.parse(localStorage.getItem("rogues-dungeon.slot.3")!);
    return { x: campaign.player.x, y: campaign.player.y };
  })).toEqual({ x: 50, y: 51 });
  const beforeRest = await page.evaluate(() => { const campaign = JSON.parse(localStorage.getItem("rogues-dungeon.slot.3")!); return { time: campaign.floor.time, gold: campaign.counters.gold }; });
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("heading", { name: "Interact" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Campfire" })).toBeVisible();
  await expect(page.getByText("Spend 20 gold to rest", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Bump to rest (walk to cancel)" })).toBeEnabled();
  await expect(page.locator(".world-view__campfire-menu button")).toHaveCount(1);
  await expect.poll(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.3")!).floor.time).toBe(beforeRest.time);
  await page.keyboard.press("ArrowRight");
  await expect(page.getByText("Resting ...", { exact: true })).toBeVisible();
  await expect.poll(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.3")!).counters.gold).toBe(beforeRest.gold - 20);
  await expect(page.getByText("Loading world...", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Campfire" })).toHaveCount(0);
  await page.waitForTimeout(1300);
  await expect(page.getByText("Replenishing stats ...", { exact: true })).toBeVisible();
  await page.waitForTimeout(1700);
  await expect(page.getByText("Replenishing stats ...", { exact: true })).toHaveCount(0);
  await expect.poll(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.3")!).floor.time).toBe(beforeRest.time + 1);
});
