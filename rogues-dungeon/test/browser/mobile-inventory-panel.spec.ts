import { expect, test, type Locator, type Page } from "@playwright/test";
import { abilityItemInstance, createCampaign, worldDroppableItemInstance } from "../../src/systems/procedural/world-procedural-system.ts";
import { installCampaignFixture, readSavedCampaign } from "./campaign-fixture.ts";
import { openSavedGame } from "./start-saved-game.ts";

async function drag(page: Page, source: Locator, target: Locator) {
  await source.scrollIntoViewIfNeeded();
  await target.scrollIntoViewIfNeeded();
  const from = (await source.boundingBox())!, to = (await target.boundingBox())!;
  await page.mouse.move(from.x + 8, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 10 });
  await expect(target).toHaveClass(/drag_landing/);
  await page.mouse.up();
}

test("mobile equipment scrolls and expanded inventory transfers items with the panel column", async ({ page }) => {
  test.setTimeout(90_000);
  const campaign = createCampaign(9044); campaign.floor.entities = [];
  campaign.player.inventory = [abilityItemInstance("wand", "mobile-wand"), worldDroppableItemInstance("Sword", "mobile-sword"), { id: "mobile-potion", name: "Health Potion", group: "weapons", modifiers: {}, category: "consumable", consumableResource: "health", isStackable: true, quantity: 3 }];
  campaign.player.abilities = [null, null, null];
  campaign.player.quickSlots = [null, null];
  await installCampaignFixture(page, saved => localStorage.setItem("rogues-dungeon.slot.1", JSON.stringify(saved)), campaign);
  await page.setViewportSize({ width: 690, height: 320 });
  await page.goto("/blockchain-rogues-dungeon-game/?mute=1"); await openSavedGame(page);
  await page.getByRole("button", { name: "L:D" }).click();
  const column = page.locator(".mobile-information-panels");
  const equipment = column.locator(".slot_scroll");
  const inventoryHeader = column.locator(".info-panel__inventory-card .game-card__title-trigger");
  await expect(inventoryHeader).toBeVisible();
  expect(await equipment.evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true);
  await inventoryHeader.click();
  const inventory = page.getByLabel("Inventory centered view"); await expect(inventory).toBeVisible();
  const ability = column.locator('[data-drop-ability="0"]');
  const quick = column.locator('[data-drop-quick-slot="0"]');
  const weapon = column.locator('[data-drop-group="weapons"][data-drop-index="0"]');
  await drag(page, inventory.locator('[data-drag-id="mobile-wand"]'), ability);
  await expect.poll(async () => (await readSavedCampaign(page)).player.abilities[0]).toBe("wand");
  await drag(page, inventory.locator('[data-drag-id="mobile-potion"]'), quick);
  await expect.poll(async () => (await readSavedCampaign(page)).player.quickSlots?.[0]?.item.id).toBe("mobile-potion");
  await drag(page, inventory.locator('[data-drag-id="mobile-sword"]'), weapon);
  await expect.poll(async () => (await readSavedCampaign(page)).player.equipment.weapons[0]?.id).toBe("mobile-sword");
  await drag(page, weapon, inventory.locator('[data-drop-inventory-slot="0"]'));
  await expect.poll(async () => (await readSavedCampaign(page)).player.inventory.some(item => item.id === "mobile-sword")).toBe(true);
  await drag(page, quick, inventory.locator('[data-drop-inventory-slot="1"]'));
  await expect.poll(async () => (await readSavedCampaign(page)).player.inventory.some(item => item.id === "mobile-potion")).toBe(true);
  await drag(page, ability, inventory.locator('[data-drop-inventory-slot="2"]'));
  await expect.poll(async () => (await readSavedCampaign(page)).player.abilities[0]).toBeNull();
});


