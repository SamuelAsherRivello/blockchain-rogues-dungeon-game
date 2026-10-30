async page => {
  const errors = [], checks = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const check = (condition, message) => { if (!condition) throw new Error(message); checks.push(message); };
  const read = () => page.evaluate(async () => (await import('/blockchain-rogues-dungeon-game/src/systems/persistence/save-system.ts')).readSlot(localStorage, '1'));
  const ready = async () => {
    await page.locator('.world-view[data-renderer-ready="true"]').waitFor({ timeout: 30000 });
    await page.getByText('Preparing the crypt...', { exact: true }).waitFor({ state: 'hidden' });
    await page.locator('.world-view .ui_iris_transition').waitFor({ state: 'hidden', timeout: 15000 });
  };
  const hover = async (source, target) => {
    await source.scrollIntoViewIfNeeded(); await target.scrollIntoViewIfNeeded();
    const a = await source.boundingBox(), b = await target.boundingBox();
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 10 });
  };
  const waitForItem = async (id, location) => {
    await page.waitForFunction(async ({ id, location }) => {
      const state = (await import('/blockchain-rogues-dungeon-game/src/systems/persistence/save-system.ts')).readSlot(localStorage, '1');
      return location === 'inventory' ? state.player.inventory.some(item => item.id === id) : state.player.equipment.jewels.some(item => item?.id === id);
    }, { id, location });
  };
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('http://127.0.0.1:6080/blockchain-rogues-dungeon-game/?mute=1');
  await page.evaluate(async () => {
    const world = await import('/blockchain-rogues-dungeon-game/src/systems/procedural/world-procedural-system.ts');
    const grid = await import('/blockchain-rogues-dungeon-game/src/systems/procedural/level-grid-system.ts');
    const save = await import('/blockchain-rogues-dungeon-game/src/systems/persistence/save-system.ts');
    const state = world.createCampaign(42); state.floor.entities = []; state.floor.objectSets = []; state.player.inventoryCapacity = 10;
    for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) grid.setCell(state.floor, state.player.x + x, state.player.y + y, { walkable: true, role: 'ground' });
    state.player.equipment.jewels = [world.worldDroppableItemInstance('Prismatic Amulet', 'worn-prism'), null];
    state.player.inventory = [world.worldDroppableItemInstance('Sapphire Amulet', 'incoming-amulet'), world.worldDroppableItemInstance('Copper Ring of Vigor', 'incoming-ring')];
    state.player.abilities = ['heal', null, null];
    state.player.quickSlots = [{ item: { id: 'potion', name: 'Health Potion', group: 'weapons', modifiers: {}, category: 'consumable', isStackable: true, consumableResource: 'health' }, quantity: 3 }, null];
    state.floor.entities.push({ kind: 'item', id: 'ground-jewel', x: state.player.x + 1, y: state.player.y, item: world.worldDroppableItemInstance('Gold Guard Bracelet', 'ground-bracelet') });
    save.writeSlot(localStorage, '1', state);
  });
  await page.reload(); await page.getByRole('button', { name: /Saved Game 1/ }).click(); await ready();
  check(await page.locator('canvas').count() >= 1, 'Playable WebGPU canvas');
  check((await page.locator('.slot_group h3').allTextContents()).join('|') === 'Weapons|Armor|Jewels', 'Weapons, Armor, Jewels order');
  const rows = page.locator('[data-drop-group="jewels"]'); check(await rows.count() === 2, 'Exactly two Jewel positions');
  check(await rows.nth(1).getAttribute('data-slot-empty') === 'true', 'Empty Jewel marker');
  const incoming = page.locator('[data-inventory-item-id="incoming-amulet"]'), preview = page.getByLabel('Equipment comparison'), before = await read();
  await hover(incoming, rows.nth(0)); await preview.waitFor();
  const text = await preview.textContent(); check(text.includes('-5') && text.includes('+5'), 'Replacement preview includes Health loss and Mana gain');
  const attribute = name => page.locator('.information-panels .attribute_item').filter({ hasText: name }).locator('.delta_value_number');
  check((await attribute('Health').getAttribute('class')).includes('delta_value_red'), 'Health loss is red against current effective capacity');
  check((await attribute('Mana').getAttribute('class')).includes('delta_value_green'), 'Mana gain is green against current effective capacity');
  check(!/delta_value_red|delta_value_green/.test(await attribute('Stamina').getAttribute('class')), 'Unchanged Stamina stays white');
  check(JSON.stringify((await read()).player.resources) === JSON.stringify(before.player.resources), 'Hover preserves full resource state');
  await page.screenshot({ path: 'output/jewel-comparison.png' });
  await page.keyboard.press('Escape'); await page.mouse.up(); check((await read()).floor.time === before.floor.time, 'Canceled drag costs no time');
  for (const selector of ['[data-drop-ability="1"]', '[data-drop-quick-slot="1"]', '[data-drop-group="armor"][data-drop-index="0"]']) {
    const target = page.locator(selector); await hover(incoming, target);
    check(await preview.count() === 0 && !(await target.getAttribute('class')).includes('drag_landing'), `Reject Jewel destination ${selector}`); await page.mouse.up();
  }
  await hover(incoming, rows.nth(0)); await page.mouse.up(); await waitForItem('incoming-amulet', 'equipment');
  check((await read()).player.inventory.some(item => item.id === 'worn-prism'), 'Replaced Jewel returns to Inventory');
  await page.evaluate(() => {
    window.__jewelTransfers = [];
    window.__jewelTransferObserver = new MutationObserver(records => { for (const record of records) for (const node of record.addedNodes) {
      if (node instanceof Element) for (const img of node.querySelectorAll('img.world-view__ui-animation-sprite--droppable')) window.__jewelTransfers.push({ source: img.getAttribute('src'), width: img.style.getPropertyValue('--droppable-atlas-width'), height: img.style.getPropertyValue('--droppable-atlas-height'), transform: img.style.transform });
    } });
    window.__jewelTransferObserver.observe(document.body, { childList: true, subtree: true });
  });
  await page.keyboard.press('d'); await waitForItem('ground-bracelet', 'inventory');
  check((await read()).player.equipment.jewels[1] === null, 'Pickup credits Inventory without auto-equipping');
  const transfers = await page.evaluate(() => window.__jewelTransfers);
  check(transfers.some(entry => entry.width === '400%' && entry.height === '600%' && entry.transform.includes('-25%')), 'Pickup transfer crops Jewel frame in six-row atlas');
  await hover(page.locator('[data-inventory-item-id="ground-bracelet"]'), rows.nth(1)); await page.mouse.up(); await waitForItem('ground-bracelet', 'equipment');
  await hover(page.locator('[data-drag-id="ground-bracelet"]'), page.locator('[data-drop-item]')); await page.mouse.up();
  await page.waitForFunction(async () => (await import('/blockchain-rogues-dungeon-game/src/systems/persistence/save-system.ts')).readSlot(localStorage, '1').player.equipment.jewels[1] === null);
  await page.screenshot({ path: 'output/jewel-world-drop.png' });
  const state = await read(), dropped = state.floor.entities.find(entity => entity.kind === 'item' && entity.item.id === 'ground-bracelet');
  check(Boolean(dropped), 'Worn drop creates the same world item');
  const dx = dropped.x - state.player.x, dy = dropped.y - state.player.y;
  for (let i = 0; i < Math.abs(dx); i++) await page.keyboard.press(dx > 0 ? 'd' : 'a');
  for (let i = 0; i < Math.abs(dy); i++) await page.keyboard.press(dy > 0 ? 's' : 'w');
  await waitForItem('ground-bracelet', 'inventory');
  check((await read()).player.inventory.filter(item => item.id === 'ground-bracelet').length === 1, 'Recollection preserves one instance');
  check((await read()).player.quickSlots[0].quantity === 3 && (await read()).player.abilities[0] === 'heal', 'Abilities and consumable Quick Slots remain unchanged');
  await page.evaluate(() => window.__jewelTransferObserver.disconnect());
  await page.reload(); await page.getByRole('button', { name: /Saved Game 1/ }).click(); await ready();
  check((await read()).player.inventory.filter(item => item.id === 'ground-bracelet').length === 1, 'Actual app reload preserves Jewel identity');
  await page.screenshot({ path: 'output/jewel-landscape.png' });
  check(errors.length === 0, 'No application console or page errors');
  return { checks, errors, transfers };
}
