async page => {
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('rogues-dungeon.slot.2'));
    saved.progression.level = 2; saved.progression.attributePoints = 3;
    saved.worldGrowth = [{ id: 'world-growth-2', seed: saved.floor.seed, level: 2, difficulty: 1, spent: 0 }];
    localStorage.setItem('rogues-dungeon.slot.2', JSON.stringify(saved));
  });
  await page.reload();
  await page.getByRole('button', { name: /Saved Game 2/ }).click();
  await page.locator('.game-screen').waitFor();
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('rogues-dungeon.slot.2')));
  await page.getByRole('button', { name: 'Open Progression', exact: true }).click();
  const increase = page.getByRole('button', { name: 'Increase Health', exact: true });
  await increase.click(); await increase.click(); await increase.click();
  await page.getByRole('button', { name: 'Confirm 3 attribute points', exact: true }).click();
  await page.getByRole('heading', { name: 'Level Up — World', exact: true }).waitFor();
  const changed = await page.locator('.world-progression-window .delta_value_green').count();
  if (changed < 1 || changed > 3) throw new Error('Expected one to three changed world values');
  if (await page.locator('.world-progression-window .attribute_adjustment').count()) throw new Error('World growth must not have controls');
  await page.keyboard.press('ArrowRight');
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('rogues-dungeon.slot.2')));
  if (before.floor.time !== after.floor.time) throw new Error('World progression must not advance time');
  if (JSON.stringify(before.floorProfiles) !== JSON.stringify(after.floorProfiles)) throw new Error('Active profile must remain frozen');
  const delta = Object.keys(before.worldAttributes).reduce((n, key) => n + after.worldAttributes[key] - before.worldAttributes[key], 0);
  if (delta !== 3) throw new Error('Expected three world points');
  await page.screenshot({ path: '.playwright-cli/world-progression.png' });
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: /Saved Game 2/ }).click();
  await page.locator('.game-screen').waitFor();
  if (await page.locator('.world-progression-window').count()) throw new Error('Acknowledged result must stay dismissed');
  return { changed, delta, time: after.floor.time, before: before.worldAttributes, after: after.worldAttributes };
}
