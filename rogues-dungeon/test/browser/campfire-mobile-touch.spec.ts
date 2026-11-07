import { expect, test } from "@playwright/test";
import { createCampaign } from "../../src/systems/procedural/world-procedural-system.ts";
import { revealDiscovery } from "../../src/systems/procedural/map-discovery-system.ts";
import { installCampaignFixture } from "./campaign-fixture.ts";
import { openSavedGame } from "./start-saved-game.ts";

test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36" });
test("mobile taps distinguish a nearby floor destination from the campfire", async ({ page }) => {
  const campaign = createCampaign(1);
  campaign.floor.cells = Array.from({ length: 100 }, () => Array.from({ length: 100 }, () => ({ walkable: true, role: "floor" })));
  delete campaign.floor.map;
  campaign.floor.start = { x: 50, y: 50 }; campaign.player.x = 50; campaign.player.y = 50;
  campaign.player.pixel = { x: 1616, y: 1616 };
  campaign.floor.entities = [{ id: "fixture-campfire", kind: "campfire", x: 54, y: 54 }];
  campaign.floor.objectSets = []; campaign.floor.decorations = []; campaign.floor.prefabPlacements = [];
  campaign.counters.gold = 100;
  revealDiscovery(campaign, campaign.player, 10);
  await installCampaignFixture(page, saved => localStorage.setItem("rogues-dungeon.slot.3", JSON.stringify(saved)), campaign);
  await page.goto("/blockchain-rogues-dungeon-game/?mute=1");
  await page.getByRole("button", { name: "Fullscreen", exact: true }).click();
  await openSavedGame(page, 3);
  const world = page.locator(".world-view");
  await page.evaluate(() => {
    (window as typeof window & { campfireShows?: number }).campfireShows = 0;
    new MutationObserver(() => { if (document.querySelector('.movement-prompt h3')?.textContent === 'Campfire') (window as typeof window & { campfireShows: number }).campfireShows++; }).observe(document.body, { childList: true, subtree: true });
  });
  const box = (await world.boundingBox())!;
  await page.touchscreen.tap(box.x + box.width / 2 + 96, box.y + box.height / 2 + 128);
  await expect.poll(async () => {
    const x = Number(await world.getAttribute("data-player-x")), y = Number(await world.getAttribute("data-player-y"));
    return Math.abs(54 - x) + Math.abs(54 - y);
  }, { timeout: 10000 }).toBe(1);
  await expect(world).toHaveAttribute("data-player-x", "53");
  await expect(world).toHaveAttribute("data-player-y", "54");
  await expect(page.getByRole("heading", { name: "Campfire" })).toHaveCount(0);
  expect(await page.evaluate(() => (window as typeof window & { campfireShows: number }).campfireShows)).toBe(0);
  const x = Number(await world.getAttribute("data-player-x")), y = Number(await world.getAttribute("data-player-y"));
  await page.touchscreen.tap(box.x + box.width / 2 + (54 - x) * 32, box.y + box.height / 2 + (54 - y) * 32);
  await expect(page.getByRole("heading", { name: "Campfire" })).toBeVisible();
  await page.getByRole("button", { name: "Bump to rest (walk to cancel)" }).tap();
  await expect(page.getByRole("heading", { name: "Campfire" })).toHaveCount(0);
  await expect(page.getByText("Resting ...", { exact: true })).toBeVisible();
});

test("tapping a distant campfire approaches it and a second tap opens the prompt", async ({ page }) => {
  const campaign = createCampaign(1);
  campaign.floor.cells = Array.from({ length: 100 }, () => Array.from({ length: 100 }, () => ({ walkable: true, role: "floor" })));
  delete campaign.floor.map;
  campaign.floor.start = { x: 50, y: 50 }; campaign.player.x = 50; campaign.player.y = 50;
  campaign.player.pixel = { x: 1616, y: 1616 };
  campaign.floor.entities = [{ id: "fixture-campfire", kind: "campfire", x: 54, y: 54 }];
  campaign.floor.objectSets = []; campaign.floor.decorations = []; campaign.floor.prefabPlacements = []; campaign.counters.gold = 100;
  revealDiscovery(campaign, campaign.player, 10);
  await installCampaignFixture(page, saved => localStorage.setItem("rogues-dungeon.slot.3", JSON.stringify(saved)), campaign);
  await page.goto("/blockchain-rogues-dungeon-game/?mute=1");
  await page.getByRole("button", { name: "Fullscreen", exact: true }).click();
  await openSavedGame(page, 3);
  const world = page.locator(".world-view"), box = (await world.boundingBox())!;
  await page.evaluate(() => {
    (window as typeof window & { earlyCampfire?: boolean }).earlyCampfire = false;
    new MutationObserver(() => {
      if (document.querySelector('.movement-prompt h3')?.textContent === 'Campfire') (window as typeof window & { earlyCampfire: boolean }).earlyCampfire = true;
    }).observe(document.body, { childList: true, subtree: true });
  });
  await page.touchscreen.tap(box.x + box.width / 2 + 128, box.y + box.height / 2 + 128);
  await expect.poll(async () => Math.abs(54 - Number(await world.getAttribute("data-player-x"))) + Math.abs(54 - Number(await world.getAttribute("data-player-y"))), { timeout: 15000 }).toBe(1);
  await page.waitForTimeout(500);
  await expect(page.getByRole("heading", { name: "Campfire" })).toHaveCount(0);
  expect(await page.evaluate(() => (window as typeof window & { earlyCampfire: boolean }).earlyCampfire)).toBe(false);
  const x = Number(await world.getAttribute("data-player-x")), y = Number(await world.getAttribute("data-player-y"));
  expect(Math.abs(54 - x) + Math.abs(54 - y)).toBe(1);
  await page.touchscreen.tap(box.x + box.width / 2 + (54 - x) * 32, box.y + box.height / 2 + (54 - y) * 32);
  await expect(page.getByRole("heading", { name: "Campfire" })).toBeVisible();
});

test.describe("short mobile viewport", () => {
  test.use({ viewport: { width: 480, height: 240 } });
  test("an adjacent campfire prompt remains visible and can be dismissed", async ({ page }) => {
    const campaign = createCampaign(1);
    campaign.floor.cells = Array.from({ length: 100 }, () => Array.from({ length: 100 }, () => ({ walkable: true, role: "floor" })));
    delete campaign.floor.map;
    campaign.floor.start = { x: 50, y: 50 }; campaign.player.x = 50; campaign.player.y = 50;
    campaign.player.pixel = { x: 1616, y: 1616 };
    campaign.floor.entities = [{ id: "fixture-campfire", kind: "campfire", x: 51, y: 50 }];
    campaign.floor.objectSets = []; campaign.floor.decorations = []; campaign.floor.prefabPlacements = []; campaign.counters.gold = 100;
    revealDiscovery(campaign, campaign.player, 10);
    await installCampaignFixture(page, saved => localStorage.setItem("rogues-dungeon.slot.3", JSON.stringify(saved)), campaign);
    await page.goto("/blockchain-rogues-dungeon-game/?mute=1");
    await page.getByRole("button", { name: "Fullscreen", exact: true }).click();
    await openSavedGame(page, 3);
    const world = page.locator(".world-view"), box = (await world.boundingBox())!;
    await page.touchscreen.tap(box.x + box.width / 2 + 32, box.y + box.height / 2);
    const prompt = page.locator(".movement-prompt").filter({ has: page.getByRole("heading", { name: "Campfire" }) });
    await expect(prompt).toBeVisible();
    const rest = page.getByRole("button", { name: "Bump to rest (walk to cancel)" });
    await expect(rest).toBeVisible();
    await rest.tap();
    await expect(prompt).toHaveCount(0);
  });
});
