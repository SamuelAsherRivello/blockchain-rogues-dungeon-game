import { expect, test, type Locator, type Page } from "@playwright/test";
import { createCampaign, abilityItemInstance } from "../../src/systems/procedural/world-procedural-system.ts";
import type { Item } from "../../src/game/types.ts";
import { installCampaignFixture, readSavedCampaign } from "./campaign-fixture.ts";
import { openSavedGame } from "./start-saved-game.ts";

async function hoverDrop(page: Page, source: Locator, target: Locator) {
  await source.waitFor({ state: "visible" }); await target.waitFor({ state: "visible" });
  await source.scrollIntoViewIfNeeded(); await target.scrollIntoViewIfNeeded();
  let bounds = { from: await source.boundingBox(), to: await target.boundingBox() };
  await expect.poll(async () => {
    bounds = { from: await source.boundingBox(), to: await target.boundingBox() };
    return Boolean(bounds.from && bounds.to);
  }, { message: 'Both drag controls must finish rendering before the next gesture' }).toBe(true);
  const { from, to } = bounds;
  if (!from || !to) throw new Error('Drag controls lost their rendered bounds');
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 10 });
  await expect(target).toHaveClass(/drag_landing/);
  return page.getByLabel("Equipment comparison");
}

test("abilities and quick slots compare and swap occupied slots without losing items", async ({ page }) => {
  // WebGPU startup and four gestures share this total budget; assertion waits
  // still independently require each transaction to finish promptly.
  test.setTimeout(60_000);
  const campaign = createCampaign(9044); campaign.floor.entities = [];
  campaign.player.abilities = ["heal", "wand", null];
  const potion = (resource: "health" | "mana" | "stamina", quantity: number): Item => ({ id: resource, name: `${resource[0].toUpperCase()}${resource.slice(1)} Potion`, group: "weapons", modifiers: {}, category: "consumable", consumableResource: resource, isStackable: true, quantity });
  campaign.player.inventory = [abilityItemInstance("wand", "incoming-wand"), potion("mana", 4)];
  campaign.player.quickSlots = [{ item: potion("health", 1), quantity: 7 }, { item: potion("stamina", 3), quantity: 3 }];
  await installCampaignFixture(page, saved => localStorage.setItem("rogues-dungeon.slot.1", JSON.stringify(saved)), campaign);
  await page.goto("/blockchain-rogues-dungeon-game/?mute=1");
  await openSavedGame(page);
  const ability = page.locator("[data-drop-ability='0']");
  const popup = await hoverDrop(page, page.locator("[data-drag-id='incoming-wand']"), ability);
  await expect(popup).toContainText("Heal"); await expect(popup).toContainText("Wand");
  await expect(popup).toContainText("7 damage");
  const comparisonBounds = (await popup.boundingBox())!, screenBounds = (await page.locator(".game-screen").boundingBox())!;
  expect(comparisonBounds.y).toBeGreaterThanOrEqual(screenBounds.y);
  expect(comparisonBounds.x).toBeGreaterThanOrEqual(screenBounds.x);
  expect((await readSavedCampaign(page)).player.abilities[0]).toBe("heal");
  await page.mouse.up();
  await expect(popup).toHaveCount(0);
  await expect.poll(async () => (await readSavedCampaign(page)).player.abilities[0]).toBe("wand");
  expect((await readSavedCampaign(page)).player.inventory.some(item => item.abilityId === "heal")).toBe(true);

  const quick = page.locator("[data-drop-quick-slot='0']");
  await hoverDrop(page, page.locator("[data-inventory-item-id='mana']"), quick);
  await expect(popup).toContainText("Health Potion x 7"); await expect(popup).toContainText("Mana Potion x 4");
  expect((await readSavedCampaign(page)).player.quickSlots?.[0]?.item.consumableResource).toBe("health");
  await page.mouse.up();
  await expect.poll(async () => (await readSavedCampaign(page)).player.quickSlots?.[0]?.item.consumableResource).toBe("mana");
  expect((await readSavedCampaign(page)).player.inventory.find(item => item.consumableResource === "health")?.quantity).toBe(7);

  await hoverDrop(page, quick, page.locator("[data-drop-quick-slot='1']"));
  await expect(popup).toContainText("Stamina Potion x 3");
  await page.mouse.up();
  await expect.poll(async () => (await readSavedCampaign(page)).player.quickSlots?.map(slot => [slot?.item.consumableResource, slot?.quantity])).toEqual([["stamina", 3], ["mana", 4]]);

  await hoverDrop(page, page.locator("[data-inventory-item-id='incoming-wand']"), page.locator("[data-drop-ability='2']"));
  await page.keyboard.press("Escape"); await page.mouse.up();
  await expect(popup).toHaveCount(0);
  expect((await readSavedCampaign(page)).player.abilities[2]).toBeNull();
});
