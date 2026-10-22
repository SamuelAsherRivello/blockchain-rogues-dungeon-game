async page => {
  const results = [];
  for (const [name, viewport, userAgent] of [
    ['mobile', {width:390,height:844}, 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'],
    ['compact', {width:800,height:600}, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36'],
  ]) {
    const context = await page.context().browser().newContext({ viewport, userAgent });
    const target = await context.newPage();
    await target.goto('http://127.0.0.1:6080/blockchain-rogues-dungeon-game/?mute=1');
    await target.getByRole('button', {name:'Saved Game 1 New Game'}).click();
    await target.getByRole('button',{name:'Roll',exact:true}).click();
    await target.getByRole('button',{name:'Confirm',exact:true}).click();
    await target.getByRole('heading',{name:'Create World',exact:true}).waitFor();
    await target.getByRole('button',{name:'Roll',exact:true}).click();
    await target.waitForFunction(() => !document.querySelector('.create-world-window .create-character-window__actions button:last-child')?.disabled);
    await target.locator('[data-renderer-ready="true"]').waitFor();
    const metrics = await target.evaluate(() => {
      const dialog = document.querySelector('.create-world-window').getBoundingClientRect();
      const confirm = document.querySelector('.create-world-window .create-character-window__actions button:last-child').getBoundingClientRect();
      const canvas = document.querySelector('canvas').getBoundingClientRect();
      return {dialog:dialog.toJSON(), confirm:confirm.toJSON(), canvas:canvas.toJSON()};
    });
    await target.screenshot({path:`.playwright-cli/world-${name}.png`});
    if (metrics.confirm.bottom > metrics.dialog.bottom || metrics.canvas.height <= 0) throw new Error(`${name} controls or preview overflow: ${JSON.stringify(metrics)}`);
    await target.getByRole('button',{name:'Close dialog'}).click();
    await target.getByRole('heading',{name:'Start Game',exact:true}).waitFor();
    if (await target.evaluate(() => localStorage.getItem('rogues-dungeon.slot.1'))) throw new Error('Cancel must leave save empty');
    results.push({name, ...metrics}); await context.close();
  }
  return results;
}
