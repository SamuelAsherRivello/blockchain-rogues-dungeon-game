async page => {
  const checks = [];
  const check = (ok, label) => { if (!ok) throw new Error(label); checks.push(label); };
  const box = page.locator('.lockbox-window');
  const rect = await box.boundingBox();
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.waitForTimeout(250);
  const settings = await page.locator('.settings-window--game').boundingBox();
  check(Math.abs(rect.width - settings.width) < 1 && Math.abs(rect.height - settings.height) < 1, 'Settings and Lockbox share settled portrait size');
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.locator('.settings-window').waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: 'AR: P', exact: true }).click();
  await page.setViewportSize({ width: 1600, height: 1000 });
  for (const mode of ['grid-snap', 'grid-tween', 'gridless']) {
    await page.getByLabel('Movement mode', { exact: true }).selectOption(mode);
    await page.keyboard.down('a');
    await box.waitFor(); await page.keyboard.up('a');
    check(await box.locator('[data-drop-container="shared-lockbox"]').count() === 1, `${mode} opens authored left box`);
    await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
    await page.waitForTimeout(200);
  }
  await page.getByLabel('Movement mode', { exact: true }).selectOption('grid-snap');
  await page.evaluate(async () => {
    const save = await import('/blockchain-rogues-dungeon-game/src/systems/persistence/save-system.ts');
    const campaign = save.readSlot(localStorage, 1), storage = save.readLockboxState(localStorage, 1);
    const item = storage.containers['shared-lockbox'][0];
    storage.containers['shared-lockbox'] = Array.from({ length: 10 }, (_, i) => ({ ...item, id: 'full-' + i }));
    campaign.player.x = 7; campaign.player.y = 8; delete campaign.player.pixel;
    save.writeSlot(localStorage, 1, campaign, storage);
  });
  const ready = async () => {
    await page.reload(); await page.getByRole('button', { name: /Saved Game 1/ }).click();
    await page.locator('.world-view[data-renderer-ready="true"]').waitFor({ timeout: 30000 });
    await page.locator('.world-view .ui_iris_transition').waitFor({ state: 'hidden', timeout: 15000 });
    await page.waitForFunction(() => /FPS: [0-9]/.test(document.querySelector('.dev_settings output')?.textContent ?? ''));
  };
  await ready(); await page.keyboard.press('d'); await box.waitFor();
  check(await box.locator('[data-drag-kind="lockbox"]').count() === 10, 'Right box exposes the same full shared storage');
  const drag = async (source, target) => {
    const a = await source.boundingBox(), b = await target.boundingBox();
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 6 }); await page.mouse.up();
  };
  await drag(box.locator('[data-drag-kind="lockbox"]').first(), page.locator('[data-drop-inventory-slot][data-slot-empty="true"]').first());
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('rogues-dungeon.slot.1')).storage.containers['shared-lockbox']?.length === 9);
  await drag(page.locator('[data-drag-id="test-potion"]'), box.locator('[data-slot-empty="true"]').first());
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('rogues-dungeon.slot.1')).storage.containers['shared-lockbox']?.some(item => item.id === 'test-potion'));
  check(true, 'Right box withdraws and deposits into shared storage');
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.evaluate(async () => {
    const save = await import('/blockchain-rogues-dungeon-game/src/systems/persistence/save-system.ts');
    const campaign = save.readSlot(localStorage, 1);
    campaign.player.x = 2; campaign.player.y = 8; delete campaign.player.pixel;
    campaign.player.inventory = [{ id: 'overflow', name: 'Overflow Sword', group: 'weapons', modifiers: {} }];
    save.writeSlot(localStorage, 1, campaign);
  });
  await ready(); await page.keyboard.press('a'); await box.waitFor();
  check(await box.locator('[data-drag-id="test-potion"]').count() === 1, 'Left box exposes the item deposited through the right box');
  const raw = await page.evaluate(() => localStorage.getItem('rogues-dungeon.slot.1'));
  await drag(page.locator('[data-drag-id="overflow"]'), box.locator('[data-drag-kind="lockbox"]').first());
  check(await page.evaluate(() => localStorage.getItem('rogues-dungeon.slot.1')) === raw, 'Full lockbox rejects deposit without any saved mutation');
  await page.getByRole('button', { name: 'Fullscreen', exact: true }).click(); await page.waitForTimeout(200);
  const centered = await page.evaluate(() => {
    const b = document.querySelector('.lockbox-window').getBoundingClientRect(), v = document.querySelector('.world-view-region').getBoundingClientRect();
    return Boolean(document.fullscreenElement) && Math.abs(b.x + b.width / 2 - v.x - v.width / 2) < 2 && Math.abs(b.y + b.height / 2 - v.y - v.height / 2) < 2;
  });
  check(centered, 'Fullscreen retains available-view midpoint');
  await page.getByRole('button', { name: 'Fullscreen', exact: true }).click();
  return checks;
}
