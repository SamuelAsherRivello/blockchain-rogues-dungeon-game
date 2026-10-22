import { expect, test } from "@playwright/test";
import { createCampaign } from "../../src/systems/procedural/world-procedural-system.ts";
import { installCampaignFixture } from "./campaign-fixture.ts";
import { openSavedGame } from "./start-saved-game.ts";

test("opens the campfire rest menu without a turn and rests for exactly one turn", async ({ page }) => {
  const campaign = createCampaign(1);
  campaign.floor.cells = Array.from({ length: 100 }, (_, y) => Array.from({ length: 100 }, (_, x) => ({ walkable: x >= 48 && x <= 53 && y >= 48 && y <= 53, role: "floor" })));
  delete campaign.floor.map;
  campaign.floor.start = { x: 50, y: 50 }; campaign.player.x = 50; campaign.player.y = 50;
  campaign.floor.entities = [{ id: "fixture-campfire", kind: "campfire", x: 51, y: 51 }];
  campaign.floor.cells[51][49].walkable = false;
  campaign.floor.objectSets = []; campaign.floor.decorations = []; campaign.floor.prefabPlacements = [];
  campaign.counters.gold = 100;
  campaign.player.resources.health.current = 1; campaign.player.resources.stamina.current = 1; campaign.player.resources.mana.current = 1;
  await installCampaignFixture(page, saved => localStorage.setItem("rogues-dungeon.slot.3", JSON.stringify(saved)), campaign);
  await page.goto("/blockchain-rogues-dungeon-game/?mute=1");
  await openSavedGame(page, 3);
  await expect(page.locator(".world-view canvas")).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await expect.poll(() => page.evaluate(() => {
    const campaign = JSON.parse(localStorage.getItem("rogues-dungeon.slot.3")!);
    return { x: campaign.player.x, y: campaign.player.y };
  })).toEqual({ x: 50, y: 51 });
  let beforeRest = await page.evaluate(() => { const campaign = JSON.parse(localStorage.getItem("rogues-dungeon.slot.3")!); return { time: campaign.floor.time, gold: campaign.counters.gold }; });
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("heading", { name: "Interact" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Campfire" })).toBeVisible();
  await expect(page.getByText("Spend 20 gold to rest and replenish status.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Bump to rest (walk to cancel)" })).toHaveJSProperty("disabled", false);
  await expect(page.locator(".movement-prompt button.movement-prompt__action")).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.3")!).floor.time)).toBe(beforeRest.time);
  // A different direction cancels even when the attempted step hits a wall.
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("heading", { name: "Campfire" })).toHaveCount(0);
  await expect(page.locator(".world-view")).toHaveAttribute("data-player-x", "50");
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.3")!).counters.gold)).toBe(beforeRest.gold);
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("heading", { name: "Campfire" })).toBeVisible();
  await page.keyboard.press("ArrowUp");
  await expect(page.getByRole("heading", { name: "Campfire" })).toHaveCount(0);
  await expect(page.locator(".world-view")).toHaveAttribute("data-player-y", "50");
  await page.keyboard.press("ArrowDown");
  await expect(page.locator(".world-view")).toHaveAttribute("data-player-y", "51");
  beforeRest = await page.evaluate(() => { const campaign = JSON.parse(localStorage.getItem("rogues-dungeon.slot.3")!); return { time: campaign.floor.time, gold: campaign.counters.gold }; });
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("heading", { name: "Campfire" })).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByText("Resting ...", { exact: true })).toBeVisible();
  await expect(page.getByText("Loading world...", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Campfire" })).toHaveCount(0);
  await expect(page.getByText("Replenishing status ...", { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.3")!).player.resources)).toMatchObject({
    health: expect.objectContaining({ current: expect.any(Number), currentMax: expect.any(Number) }),
    stamina: expect.objectContaining({ current: expect.any(Number), currentMax: expect.any(Number) }),
    mana: expect.objectContaining({ current: expect.any(Number), currentMax: expect.any(Number) }),
  });
  await expect.poll(() => page.evaluate(() => {
    const resources = JSON.parse(localStorage.getItem("rogues-dungeon.slot.3")!).player.resources;
    return resources.health.current === resources.health.currentMax && resources.stamina.current === resources.stamina.currentMax && resources.mana.current === resources.mana.currentMax;
  })).toBe(true);
  await expect(page.getByText("Replenishing status ...", { exact: true })).toHaveCount(0, { timeout: 15_000 });
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.3")!).counters.gold)).toBe(beforeRest.gold - 20);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.3")!).floor.time)).toBe(beforeRest.time + 1);
});
