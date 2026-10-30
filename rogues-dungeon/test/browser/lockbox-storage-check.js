async page => {
  const errors = [], checks = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const check = (condition, label) => { if (!condition) throw new Error(label); checks.push(label); };
  const read = () => page.evaluate(async () => {
    const save = await import('/blockchain-rogues-dungeon-game/src/systems/persistence/save-system.ts');
    return { campaign: save.readSlot(localStorage, '1'), storage: save.readLockboxState(localStorage, '1') };
  });
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.evaluate(async () => {
    const world = await import('/blockchain-rogues-dungeon-game/src/systems/procedural/world-procedural-system.ts');
    const save = await import('/blockchain-rogues-dungeon-game/src/systems/persistence/save-system.ts');
    const dev = await import('/blockchain-rogues-dungeon-game/src/systems/persistence/development-storage-system.ts');
    localStorage.setItem(dev.DEVELOPMENT_STORAGE_COMPATIBILITY_KEY, dev.DEVELOPMENT_STORAGE_COMPATIBILITY_EPOCH);
    const state = world.createRunCampaign(42, 1, 1);
    const arrow = state.floor.entities.find(entity => entity.kind === 'teleport-arrow');
    state.player.x = arrow.x; state.player.y = arrow.y;
    const home = world.applyAction(state, { type: 'enter-teleport' }).state;
    home.player.x = 2; home.player.y = 8;
    home.player.inventoryCapacity = 10;
    home.player.inventory = [world.worldDroppableItemInstance('Sword', 'test-sword'), { id: 'test-potion', name: 'Health Potion', group: 'weapons', modifiers: {}, category: 'consumable', consumableResource: 'health', isStackable: true, quantity: 3 }];
    save.writeSlot(localStorage, '1', home, { version: 1, revision: 0, containers: {}, journal: [] });
    save.writePreferences(localStorage, { ...save.readPreferences(localStorage), movementMode: 'grid-snap' });
  });
  await page.reload();
  await page.getByRole('button', { name: /Saved Game 1/ }).click();
  await page.locator('.world-view[data-renderer-ready="true"]').waitFor({ timeout: 30000 });
  await page.getByText('Preparing the crypt...', { exact: true }).waitFor({ state: 'hidden' });
  await page.locator('.world-view .ui_iris_transition').waitFor({ state: 'hidden', timeout: 15000 });
  check(await page.locator('canvas').count() >= 1, 'WebGPU canvas is visible');
  check(!await page.getByText(/WebGPU.*unavailable/i).count(), 'No unsupported-browser message');
  const before = await read();
  await page.keyboard.press('ArrowLeft');
  const box = page.locator('.lockbox-window'); await box.waitFor();
  check(await box.locator('[data-slot-empty="true"]').count() === 10, 'Ten empty positions');
  check(await box.locator('[data-drop-item]').count() === 0, 'No storage Drop Item');
  check((await read()).campaign.floor.time === before.campaign.floor.time, 'Bump takes no turn');
  check((await read()).campaign.player.x === 2, 'Blocking collision preserves player position');
  const geometry = async () => page.evaluate(() => {
    const world = document.querySelector('.world-view-region').getBoundingClientRect();
    const box = document.querySelector('.lockbox-window').getBoundingClientRect();
    return { dx: box.x + box.width / 2 - world.x - world.width / 2, dy: box.y + box.height / 2 - world.y - world.height / 2, width: box.width, height: box.height, backdrop: getComputedStyle(document.querySelector('.dialog_backdrop')).backgroundColor };
  });
  check(Math.abs((await geometry()).dx) < 2 && Math.abs((await geometry()).dy) < 2, 'Centered in available game view');
  const move = async (source, target, release = true) => {
    await source.scrollIntoViewIfNeeded(); await target.scrollIntoViewIfNeeded();
    const a = await source.boundingBox(), b = await target.boundingBox();
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
    if (release) await page.mouse.up();
  };
  const item = () => page.locator('[data-drag-kind="inventory"][data-drag-id="test-sword"]');
  const empty = () => box.locator('[data-slot-empty="true"]').first();
  await move(item(), empty(), false); await page.keyboard.press('Escape'); await page.mouse.up();
  check((await read()).storage.revision === 0, 'Escape cancels an uncommitted drag');
  await move(item(), empty());
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('rogues-dungeon.slot.1')).storage.revision === 1);
  check((await read()).storage.containers['shared-lockbox'].length === 1, 'Deposit persists immediately');
  const paused = await read();
  for (const key of ['ArrowRight', 'x', '1', 'q', 'v']) await page.keyboard.press(key);
  check(JSON.stringify((await read()).campaign) === JSON.stringify(paused.campaign), 'World input and turns remain paused');
  await move(box.locator('[data-drag-kind="lockbox"]').first(), page.locator('[data-drop-container="inventory"] [data-slot-empty="true"]').first());
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('rogues-dungeon.slot.1')).storage.revision === 2);
  check((await read()).campaign.player.inventory.some(item => item.id === 'test-sword'), 'Withdrawal persists into Inventory');
  await move(item(), empty());
  await page.reload(); await page.getByRole('button', { name: /Saved Game 1/ }).click();
  await page.locator('.world-view[data-renderer-ready="true"]').waitFor({ timeout: 30000 });
  await page.locator('.world-view .ui_iris_transition').waitFor({ state: 'hidden', timeout: 15000 });
  await page.keyboard.press('ArrowLeft'); await box.waitFor();
  check(await box.locator('[data-drag-kind="lockbox"]').count() === 1, 'Reload retains deposited contents');
  await page.screenshot({ path: 'output/project-run/lockbox-landscape.png' });
  for (const size of [{ width: 1100, height: 750 }, { width: 600, height: 1000 }]) {
    await page.setViewportSize(size);
    await page.waitForTimeout(200);
    const g = await geometry(); check(Math.abs(g.dx) < 2 && Math.abs(g.dy) < 2, `Center follows resize ${size.width}`);
    check(await page.locator('[data-drop-container="inventory"]').isVisible(), `Inventory available ${size.width}`);
    check(await box.getByRole('button', { name: 'Close dialog' }).isVisible(), `Close available ${size.width}`);
  }
  await page.screenshot({ path: 'output/project-run/lockbox-portrait.png' });
  check(errors.length === 0, `Console errors: ${errors.join('|')}`);
  return { checks, errors, geometry: await geometry() };
}
