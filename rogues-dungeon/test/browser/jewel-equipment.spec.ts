import { expect, test, type Locator, type Page } from '@playwright/test';
import { createCampaign, worldDroppableItemInstance } from '../../src/systems/procedural/world-procedural-system.ts';
import { setCell } from '../../src/systems/procedural/level-grid-system.ts';
import { campaignFixturesFrom, readSavedCampaign } from './campaign-fixture.ts';
import { fixtureCompatibilityMarker } from './fixture-storage.ts';
import { openSavedGame } from './start-saved-game.ts';

async function installJewels(page: Page) {
  const state = createCampaign(42); state.floor.entities = []; state.floor.objectSets = []; state.player.inventoryCapacity = 10;
  for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) setCell(state.floor, state.player.x + x, state.player.y + y, { walkable: true, role: 'ground' });
  state.player.equipment.jewels = [worldDroppableItemInstance('Prismatic Amulet', 'worn-prism'), null];
  state.player.inventory = [worldDroppableItemInstance('Sapphire Amulet', 'incoming-amulet'), worldDroppableItemInstance('Copper Ring of Vigor', 'incoming-ring')];
  state.player.abilities = ['heal', null, null];
  state.player.quickSlots = [{ item: { id: 'potion', name: 'Health Potion', group: 'weapons', modifiers: {}, category: 'consumable', isStackable: true, consumableResource: 'health' }, quantity: 3 }, null];
  state.floor.entities.push({ kind: 'item', id: 'ground-jewel', x: state.player.x + 1, y: state.player.y, item: worldDroppableItemInstance('Gold Guard Bracelet', 'ground-bracelet') });
  const records = campaignFixturesFrom(saved => localStorage.setItem('rogues-dungeon.slot.1', JSON.stringify(saved)), state);
  await page.addInitScript(({ records, marker }) => {
    localStorage.setItem(marker.name, marker.value);
    if (!sessionStorage.getItem('jewel-fixture-installed')) {
      for (const [key, value] of Object.entries(records)) localStorage.setItem(key, JSON.stringify(value));
      sessionStorage.setItem('jewel-fixture-installed', '1');
    }
  }, { records, marker: fixtureCompatibilityMarker });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/blockchain-rogues-dungeon-game/?mute=1'); await openSavedGame(page);
}

async function hoverDrop(page: Page, source: Locator, target: Locator) {
  await source.scrollIntoViewIfNeeded(); await target.scrollIntoViewIfNeeded();
  let bounds = { from: await source.boundingBox(), to: await target.boundingBox() };
  await expect.poll(async () => {
    bounds = { from: await source.boundingBox(), to: await target.boundingBox() };
    return Boolean(bounds.from && bounds.to);
  }, { message: 'Both drag controls must have rendered bounds after pickup presentation' }).toBe(true);
  const { from, to } = bounds;
  if (!from || !to) throw new Error('Drag controls lost their rendered bounds');
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2); await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 10 });
}

test('Jewel rows preserve the equipment layout and preview valid replacements only', async ({ page }) => {
  // Renderer startup and multiple drag gestures share this total budget.
  test.setTimeout(60_000);
  await installJewels(page);
  await expect(page.locator('.slot_group h3')).toHaveText(['Weapons', 'Armor', 'Jewels']);
  const rows = page.locator('[data-drop-group="jewels"]'); await expect(rows).toHaveCount(2);
  await expect(rows.nth(1).getByLabel('Empty equipment slot')).toHaveText('+');
  await expect(rows.nth(0).locator('.drag_handle')).toHaveCount(1);
  await expect(rows.nth(0)).toHaveAttribute('data-slot-category', 'equipment');
  const source = page.locator('[data-inventory-item-id="incoming-amulet"]'), before = await readSavedCampaign(page);
  await hoverDrop(page, source, rows.nth(0));
  const preview = page.getByLabel('Equipment comparison'); await expect(preview).toBeVisible();
  await expect(preview).toContainText('Prismatic Amulet'); await expect(preview).toContainText('Sapphire Amulet');
  await expect(preview).toContainText('-5'); await expect(preview).toContainText('+5');
  const attribute = (name: string) => page.locator('.information-panels .attribute_item').filter({ hasText: name }).locator('.delta_value_number');
  await expect(attribute('Health')).toHaveClass(/delta_value_red/);
  await expect(attribute('Mana')).toHaveClass(/delta_value_green/);
  await expect(attribute('Stamina')).not.toHaveClass(/delta_value_red|delta_value_green/);
  expect((await readSavedCampaign(page)).player.resources).toEqual(before.player.resources);
  await page.keyboard.press('Escape'); await page.mouse.up(); await expect(preview).toHaveCount(0);
  expect((await readSavedCampaign(page)).floor.time).toBe(before.floor.time);
  for (const target of [page.locator('[data-drop-ability="1"]'), page.locator('[data-drop-quick-slot="1"]')]) {
    await hoverDrop(page, source, target); await expect(preview).toHaveCount(0); await expect(target).not.toHaveClass(/drag_landing/); await page.mouse.up();
  }
  await hoverDrop(page, source, rows.nth(0)); await page.mouse.up();
  await expect.poll(async () => (await readSavedCampaign(page)).player.equipment.jewels[0]?.id).toBe('incoming-amulet');
  expect((await readSavedCampaign(page)).player.inventory.some(item => item.id === 'worn-prism')).toBe(true);
  expect((await readSavedCampaign(page)).player.quickSlots?.[0]?.quantity).toBe(3);
  expect((await readSavedCampaign(page)).player.abilities).toEqual(['heal', null, null]);
});

test('ordinary Jewel pickup, equipped drop, recollection and reload preserve the same item', async ({ page }) => {
  // Both renderer startups, transfers and the reload retain their own waits.
  test.setTimeout(60_000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await installJewels(page);
  await page.keyboard.press('d');
  await expect.poll(async () => (await readSavedCampaign(page)).player.inventory.some(item => item.id === 'ground-bracelet')).toBe(true);
  const jewel = page.locator('[data-inventory-item-id="ground-bracelet"]');
  await hoverDrop(page, jewel, page.locator('[data-drop-group="jewels"][data-drop-index="1"]')); await page.mouse.up();
  await expect.poll(async () => (await readSavedCampaign(page)).player.equipment.jewels[1]?.id).toBe('ground-bracelet');
  await hoverDrop(page, page.locator('[data-drag-id="ground-bracelet"]'), page.locator('[data-drop-item]')); await page.mouse.up();
  await expect.poll(async () => (await readSavedCampaign(page)).player.equipment.jewels[1]).toBeNull();
  const dropped = (await readSavedCampaign(page)).floor.entities.find(entity => entity.kind === 'item' && entity.item.id === 'ground-bracelet');
  expect(dropped?.kind).toBe('item');
  const state = await readSavedCampaign(page), dx = dropped!.x - state.player.x, dy = dropped!.y - state.player.y;
  for (let step = 0; step < Math.abs(dx); step++) await page.keyboard.press(dx > 0 ? 'd' : 'a');
  for (let step = 0; step < Math.abs(dy); step++) await page.keyboard.press(dy > 0 ? 's' : 'w');
  await expect.poll(async () => (await readSavedCampaign(page)).player.inventory.filter(item => item.id === 'ground-bracelet').length).toBe(1);
  await page.reload(); await openSavedGame(page);
  expect((await readSavedCampaign(page)).player.inventory.filter(item => item.id === 'ground-bracelet').length).toBe(1);
  expect((await readSavedCampaign(page)).player.equipment.jewels[1]).toBeNull();
  expect(await page.locator('canvas').count()).toBeGreaterThan(0); expect(errors).toEqual([]);
  await expect(page.getByText(/WebGPU.*unavailable|unsupported browser/i)).toHaveCount(0);
});
