async page => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const fixture = async (active = true) => {
    await page.evaluate(async active => {
      const m = await import('/blockchain-rogues-dungeon-game/src/systems/procedural/world-procedural-system.ts');
      const c = m.createCampaign(4321);
      const enemy = c.floor.entities.find(e => e.kind === 'enemy');
      c.player.x = 50; c.player.y = 50; c.player.pixel = { x: 1616, y: 1616 };
      c.progression.attributes.perception = 0;
      c.floor.entities = active ? [{ ...enemy, x: 53, y: 47, awareness: 6, nextActionAt: 9999 }] : [];
      c.floor.cells = Array.from({ length: 100 }, () => Array.from({ length: 100 }, () => ({ walkable: true, role: 'floor' })));
      c.floor.map = Array.from({ length: 100 }, () => Array(100).fill(0));
      c.floor.objectSets = []; c.floor.decorations = []; c.floor.prefabPlacements = [];
      c.floor.generatorVersion = 'battle-test-snapshot'; delete c.generatorVersion;
      delete c.worldSchemaVersion; delete c.levelStates; delete c.floorProfiles;
      localStorage.setItem('rogues-dungeon.slot.3', JSON.stringify(c));
    }, active);
    await page.reload();
    await page.getByRole('button', { name: /Saved Game 3/ }).click();
    await page.locator('.game-screen').waitFor();
    await page.locator('.world-view[data-renderer-ready="true"]').waitFor({ timeout: 30000 });
  };
  await fixture(true);
  await page.locator('.battle-indicator[data-phase="settled"]').waitFor({ timeout: 30000 });
  const view = page.locator('.world-view');
  if (await view.getAttribute('data-game-mode') !== 'Battle') throw new Error('Expected Battle fixture');
  const spatialFocus = await page.evaluate(async () => {
    const { readSlot } = await import('/blockchain-rogues-dungeon-game/src/systems/persistence/save-system.ts');
    const { detectedEnemyIds } = await import('/blockchain-rogues-dungeon-game/src/game/enemy-detection.ts');
    const { tacticalRectangles, tacticalContains } = await import('/blockchain-rogues-dungeon-game/src/game/tactical-area.ts');
    const campaign = readSlot(localStorage, '3');
    const enemy = campaign.floor.entities.find(entity => entity.kind === 'enemy');
    return { detected: detectedEnemyIds(campaign).size, reachesEnemy: tacticalContains(tacticalRectangles(campaign), enemy) };
  });
  if (spatialFocus.detected !== 0 || !spatialFocus.reachesEnemy) throw new Error('Spatial warning must extend before sprite detection');
  await page.getByRole('button', { name: /Battle visuals/ }).click();
  await page.locator('.tactical-area[data-variant="1"]').waitFor();
  await page.getByRole('button', { name: /Battle visuals/ }).click();
  await page.locator('.tactical-area[data-variant="2"]').waitFor();
  if (await page.locator('.battle-indicator').getAttribute('data-phase') !== 'settled') throw new Error('Variant replayed banner');
  const zoomControl = page.getByRole('combobox', { name: 'Zoom', exact: true });
  const highestZoom = await zoomControl.evaluate(select => String(Math.max(...Array.from(select.options, option => Number(option.value)))));
  await zoomControl.selectOption(highestZoom);
  await page.waitForFunction(() => document.querySelector('.battle-indicator')?.getAttribute('data-phase') === 'settled');
  const bounds = await page.evaluate(() => {
    const view = document.querySelector('.world-view').getBoundingClientRect();
    const icon = document.querySelector('.battle-indicator__icon').getBoundingClientRect();
    return { view: { x: view.x, y: view.y, width: view.width, height: view.height }, icon: { x: icon.x, y: icon.y, width: icon.width, height: icon.height }, pointer: getComputedStyle(document.querySelector('.battle-indicator')).pointerEvents, shading: getComputedStyle(document.querySelector('.tactical-area')).pointerEvents };
  });
  if (bounds.icon.y + bounds.icon.height >= bounds.view.y + bounds.view.height / 2) throw new Error('Icon covers center');
  if (bounds.pointer !== 'none' || bounds.shading !== 'none') throw new Error('Overlay blocks pointers');
  await page.screenshot({ path: '.playwright-cli/battle-feedback-max-zoom.png' });
  await page.setViewportSize({ width: 800, height: 600 });
  await page.screenshot({ path: '.playwright-cli/battle-feedback-compact.png' });
  await page.setViewportSize({ width: 1280, height: 800 });
  // Fresh keypresses carry the player beyond both warning ranges.
  for (let i = 0; i < 13; i++) await page.keyboard.press('ArrowDown');
  await page.locator('.world-view[data-game-mode="General"]').waitFor();
  await page.locator('.battle-indicator').waitFor({ state: 'detached' });
  for (let i = 0; i < 13; i++) await page.keyboard.press('ArrowUp');
  await page.locator('.world-view[data-game-mode="Battle"]').waitFor();
  await page.locator('.battle-indicator[data-phase="entry"]').waitFor();
  await page.waitForFunction(() => {
    const animation = document.querySelector('.battle-indicator__ribbon')?.getAnimations()[0];
    return Number(animation?.currentTime) >= 1100;
  });
  await page.screenshot({ path: '.playwright-cli/battle-feedback-banner.png' });
  await page.locator('.battle-indicator[data-phase="settled"]').waitFor();
  await page.bringToFront();
  await page.getByRole('button', { name: 'Fullscreen', exact: true }).click();
  await page.waitForFunction(() => Boolean(document.fullscreenElement));
  if (!await page.locator('.battle-indicator__icon').isVisible()) throw new Error('Battle icon missing in fullscreen');
  await page.getByRole('button', { name: 'Fullscreen', exact: true }).click();
  await page.waitForFunction(() => !document.fullscreenElement);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  if (await page.locator('.battle-indicator__ribbon').isVisible()) throw new Error('Reduced motion still shows animated ribbon');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  if (errors.length) throw new Error(errors.join('\n'));
  return { bounds, errors, canvases: await page.locator('canvas').count() };
}
