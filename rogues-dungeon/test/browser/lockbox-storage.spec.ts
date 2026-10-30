import { test, expect } from '@playwright/test';
import { openSavedGame } from './start-saved-game.ts';

test('authored lockboxes share storage, pause play and retain chosen slots @smoke', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/blockchain-rogues-dungeon-game/?mute=1');
  await page.evaluate(async () => {
    const root = '/blockchain-rogues-dungeon-game/src/systems/';
    const world = await import(root + 'procedural/world-procedural-system.ts');
    const save = await import(root + 'persistence/save-system.ts');
    const campaign = world.createRunCampaign(42, 1, 1);
    const arrow = campaign.floor.entities.find((entity: { kind: string }) => entity.kind === 'teleport-arrow');
    campaign.player.x = arrow.x; campaign.player.y = arrow.y;
    const home = world.applyAction(campaign, { type: 'enter-teleport' }).state;
    home.player.x = 2; home.player.y = 8;
    home.player.inventory = [world.worldDroppableItemInstance('Sword', 'browser-sword'), world.worldDroppableItemInstance('Sword', 'throwaway-sword')];
    save.writeSlot(localStorage, 1, home, { version: 1, revision: 0, containers: {}, journal: [] });
    save.writePreferences(localStorage, { ...save.readPreferences(localStorage), movementMode: 'grid-snap' });
  });
  await page.reload(); await openSavedGame(page);
  // Opening after a world-drop animation must not wait on an expired timer.
  const discard = await page.locator('[data-drag-id="throwaway-sword"]').boundingBox();
  const drop = await page.locator('[data-drop-item]').boundingBox();
  await page.mouse.move(discard!.x + 20, discard!.y + 10); await page.mouse.down();
  await page.mouse.move(drop!.x + 20, drop!.y + 10, { steps: 8 }); await page.mouse.up();
  await expect(page.locator('[data-drag-id="throwaway-sword"]')).toHaveCount(0);
  await page.keyboard.press('a');
  const box = page.locator('.lockbox-window'); await expect(box).toBeVisible();
  await expect(box.locator('[data-slot-empty="true"]')).toHaveCount(10);
  await expect(box.locator('[data-drop-item]')).toHaveCount(0);
  const source = await page.locator('[data-drag-id="browser-sword"]').boundingBox();
  const target = await box.locator('[data-drop-index="7"]').boundingBox();
  await page.mouse.move(source!.x + 20, source!.y + 10); await page.mouse.down();
  await page.mouse.move(target!.x + 20, target!.y + 10, { steps: 8 });
  await expect(page.locator('.drag_landing')).toHaveCount(1);
  await expect(box.locator('[data-drop-index="7"]')).toHaveClass(/drag_landing/);
  await page.mouse.up();
  await expect(box.locator('[data-drag-kind="lockbox"]')).toHaveCount(1);
  await expect(box.locator('[data-drop-index="7"]')).toHaveAttribute('data-drag-id', 'browser-sword');
  const saved = () => page.evaluate(() => localStorage.getItem('rogues-dungeon.slot.1'));
  const before = await saved();
  await page.keyboard.press('d'); await page.keyboard.press('x');
  expect(await saved()).toBe(before);
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  for (let x = 3; x <= 7; x++) {
    await page.keyboard.press('d');
    await expect.poll(async () => JSON.parse((await saved())!).campaign.player.x).toBe(x);
  }
  await page.keyboard.press('d');
  await expect(box).toBeVisible();
  await expect(box.locator('[data-drop-container="shared-lockbox"]')).toHaveCount(1);
  await expect(box.locator('[data-drop-index="7"]')).toHaveAttribute('data-drag-id', 'browser-sword');
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.reload(); await openSavedGame(page); await page.keyboard.press('d');
  await expect(box.locator('[data-drop-index="7"]')).toHaveAttribute('data-drag-id', 'browser-sword');
  const stored = await box.locator('[data-drag-id="browser-sword"]').boundingBox();
  const inventory = page.locator('[data-drop-inventory-slot="3"]');
  const back = await inventory.boundingBox();
  await page.mouse.move(stored!.x + 20, stored!.y + 10); await page.mouse.down();
  await page.mouse.move(back!.x + 20, back!.y + 10, { steps: 8 });
  await expect(page.locator('.drag_landing')).toHaveCount(1);
  await expect(inventory).toHaveClass(/drag_landing/);
  await page.mouse.up();
  await expect(inventory).toHaveAttribute('data-drag-id', 'browser-sword');
  await page.reload(); await openSavedGame(page);
  await expect(page.locator('[data-drop-inventory-slot="3"]')).toHaveAttribute('data-drag-id', 'browser-sword');
});
