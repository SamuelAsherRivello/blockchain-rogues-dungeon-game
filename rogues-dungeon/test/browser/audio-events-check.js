// Run against the existing project-owned preview, without a second Vite server:
// playwright-cli -s=audio-catalog run-code --filename=rogues-dungeon/test/browser/audio-events-check.js
async page => {
  page.setDefaultTimeout(20000);
  page.setDefaultNavigationTimeout(30000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(() => {
    if (window.audioAudit) return;
    // Exercise real decoding and play() promises without emitting speaker audio.
    const NativeAudio = window.Audio;
    window.audioAudit = { played: [], errors: [], made: 0 };
    window.Audio = function(src) {
      const handle = new NativeAudio(src);
      handle.muted = true;
      window.audioAudit.made++;
      const play = handle.play.bind(handle);
      handle.play = () => {
        const record = { file: src.split('/').at(-1), volume: handle.volume, rate: handle.playbackRate, time: performance.now(), resolved: false };
        window.audioAudit.played.push(record);
        return play().then(() => { record.resolved = true; }).catch(error => {
          window.audioAudit.errors.push(`${record.file}: ${error.name}`); throw error;
        });
      };
      return handle;
    };
  });
  const base = 'http://127.0.0.1:6080/blockchain-rogues-dungeon-game/?mute=1';
  await page.goto(base);
  await page.getByRole('heading', { name: 'Start Game' }).waitFor();
  const hardMute = await page.evaluate(() => window.audioAudit.made);
  if (hardMute !== 0) throw new Error('URL mute created audio elements');
  await page.evaluate(async () => {
    const { createCampaign } = await import('/blockchain-rogues-dungeon-game/src/systems/procedural/world-procedural-system.ts');
    const { writeSlot, writePreferences } = await import('/blockchain-rogues-dungeon-game/src/systems/persistence/save-system.ts');
    const { revealDiscovery } = await import('/blockchain-rogues-dungeon-game/src/systems/procedural/map-discovery-system.ts');
    const state = createCampaign(90210);
    state.floor.cells = Array.from({ length: 100 }, () => Array.from({ length: 100 }, () => ({ walkable: true, role: 'floor' })));
    delete state.floor.map;
    state.floor.start = { x: 20, y: 20 };
    state.player.x = 20; state.player.y = 20; state.player.pixel = { x: 656, y: 656 };
    state.floor.cells[19][20].walkable = false;
    state.floor.entities = [{ id: 'audio-crate', kind: 'crate', x: 21, y: 20, health: 50, opened: false },
      { id: 'audio-pickup', kind: 'potion', resource: 'mana', x: 20, y: 21 },
      { id: 'audio-campfire', kind: 'campfire', x: 21, y: 21 }];
    state.floor.objectSets = []; state.floor.decorations = [];
    state.player.abilities = ['heal', 'wand', null];
    const potion = { id: 'audio-potion', name: 'Health Potion', group: 'weapons', modifiers: {}, category: 'consumable', consumableResource: 'health', quickSlotAction: 'restore-resource', isStackable: true, quantity: 1 };
    state.player.quickSlots = [{ item: potion, quantity: 1 }, null];
    state.progression.attributePoints = 1;
    state.player.resources.stamina.current = 1;
    state.player.resources.mana.current = 1;
    state.counters.gold = 100;
    revealDiscovery(state, state.player, 8);
    writeSlot(localStorage, 1, state);
    writePreferences(localStorage, { movementMode: 'grid-tween', sfxVolume: 80, musicVolume: 0, muteAll: false, camera: 'center', zoom: 1 });
  });
  await page.goto(base);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  // Only native elements are silenced, so the real manager and UI can be tested.
  await page.getByRole('checkbox', { name: 'Mute All' }).uncheck();
  await page.waitForFunction(() => window.audioAudit.played.some(a => a.file === 'ui-audio-control-01.wav' && a.resolved));
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: /Saved Game 1/ }).click();
  await page.locator('.game-screen').waitFor({ timeout: 30000 });
  await page.locator('.world-view canvas').waitFor({ timeout: 30000 });
  await page.locator('.world-view[data-world-alive="true"]').waitFor({ timeout: 30000 });
  await page.waitForFunction(() => !document.body.textContent.includes('Preparing the crypt...'));
  if (await page.getByText(/WebGPU.*unavailable|does not support WebGPU/i).count()) throw new Error('WebGPU unavailable');
  // Wait for world input, not just the game-screen shell.
  await page.waitForFunction(() => document.querySelector('.world-view canvas')?.width > 0);
  await page.keyboard.press('x');
  await page.waitForFunction(() => window.audioAudit.played.some(a => a.file === 'game-player-wait-01.wav' && a.resolved));
  await page.keyboard.press('q');
  await page.waitForFunction(() => window.audioAudit.played.some(a => a.file === 'ui-quick-slot-rejected-01.wav' && a.resolved));
  await page.keyboard.press('ArrowUp');
  await page.waitForFunction(() => window.audioAudit.played.some(a => a.file === 'game-move-blocked-01.wav' && a.resolved));
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => window.audioAudit.played.some(a => a.file === 'game-wood-break-01.wav' && a.resolved));
  await page.waitForFunction(() => window.audioAudit.played.some(a => a.file === 'ui-save-succeeded-01.wav' && a.resolved));
  // Simulate an actual storage failure, then dispatch through the game's input.
  await page.evaluate(() => {
    const set = Storage.prototype.setItem;
    window.restoreAudioTestStorage = () => { Storage.prototype.setItem = set; };
    Storage.prototype.setItem = function(key, value) {
      if (key === 'rogues-dungeon.slot.1') throw new DOMException('Audio test quota', 'QuotaExceededError');
      return set.call(this, key, value);
    };
  });
  await page.keyboard.press('x');
  await page.waitForFunction(() => window.audioAudit.played.some(a => a.file === 'ui-save-failed-01.wav' && a.resolved));
  await page.evaluate(() => window.restoreAudioTestStorage());
  const countCue = file => page.evaluate(file => window.audioAudit.played.filter(a => a.file === file).length, file);
  const panelChecks = [];
  const checkPanel = async (action, file) => {
    const before = await countCue(file);
    await action();
    await page.waitForFunction(({ file, before }) => window.audioAudit.played.filter(a => a.file === file && a.resolved).length >= before + 1, { file, before });
    const added = await countCue(file) - before;
    if (added !== 1) throw new Error(`Panel action played ${added} cues instead of one`);
    panelChecks.push({ file, added });
  };
  await checkPanel(() => page.getByRole('button', { name: 'Abilities', exact: true }).click(), 'ui-panel-expand-01.wav');
  await page.getByRole('region', { name: 'Abilities centered view' }).waitFor().catch(() => page.locator('.game-card--centered').waitFor());
  await checkPanel(() => page.getByRole('button', { name: 'Back', exact: true }).click(), 'ui-panel-collapse-01.wav');
  await checkPanel(() => page.getByRole('button', { name: 'Collapse primary information panel tab' }).click(), 'ui-panel-collapse-01.wav');
  await checkPanel(() => page.getByRole('button', { name: 'Expand primary information panel tab' }).press('Enter'), 'ui-panel-expand-01.wav');
  await checkPanel(() => page.keyboard.press('z'), 'ui-panel-expand-01.wav');
  await checkPanel(() => page.keyboard.press('z'), 'ui-panel-collapse-01.wav');
  await checkPanel(() => page.keyboard.press('c'), 'ui-panel-collapse-01.wav');
  await checkPanel(() => page.keyboard.press('c'), 'ui-panel-collapse-01.wav');
  await checkPanel(() => page.keyboard.press('c'), 'ui-panel-expand-01.wav');
  await checkPanel(() => page.keyboard.press('c'), 'ui-panel-expand-01.wav');
  // The real CSS reminder starts after its ten-second delay.
  await page.waitForFunction(() => window.audioAudit.played.some(a => a.file === 'ui-positive-shimmer-01.wav' && a.resolved));
  const reminderChimes = await countCue('ui-positive-shimmer-01.wav');
  await page.getByRole('button', { name: 'Open Progression', exact: true }).click();
  await page.getByRole('button', { name: 'Increase Health', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm 1 attribute point', exact: true }).click();
  await page.waitForFunction(() => !document.querySelector('.game-card--level-up'));
  await page.keyboard.press('ArrowDown');
  await page.waitForFunction(() => window.audioAudit.played.some(a => a.file === 'game-potion-pickup-02.wav' && a.resolved));
  const footsteps = await page.evaluate(() => window.audioAudit.played.filter(a => a.file === 'game-footstep-soft-01.wav'));
  if (!footsteps.length || footsteps.some(a => Math.abs(a.volume - .08) > .00001)) throw new Error('Footsteps did not use the new quiet cue');
  await page.keyboard.press('ArrowRight');
  await page.getByRole('heading', { name: 'Campfire', exact: true }).waitFor();
  const beforeRest = await countCue('ui-positive-shimmer-01.wav');
  await page.keyboard.press('ArrowRight');
  await page.getByText('Replenishing status ...', { exact: true }).waitFor({ timeout: 15000 });
  await page.locator('.world-view[data-world-alive="true"]').waitFor({ timeout: 15000 });
  const restChimes = await page.evaluate(before => window.audioAudit.played.filter(a => a.file === 'ui-positive-shimmer-01.wav').slice(before), beforeRest);
  if (restChimes.length !== 2 || restChimes.some(a => !a.resolved)) throw new Error(`Expected two shimmer chimes, got ${restChimes.length}`);
  if (await countCue('game-resource-restore-01.wav')) throw new Error('Rest added a third restoration sound');
  if (restChimes[1].time - restChimes[0].time < 600) throw new Error('Shimmer chimes were not separated into two passes');
  const applicationAudit = await page.evaluate(() => window.audioAudit.played.slice());

  // Decode every SFX and play it through native HTMLAudioElement, with physical
  // output muted. This catches missing assets, unsupported formats and play errors.
  const decoded = await page.evaluate(async () => {
    const { AUDIO_ASSETS } = await import('/blockchain-rogues-dungeon-game/src/systems/audio/audio-system.ts');
    const entries = Object.entries(AUDIO_ASSETS.sfx);
    const result = [];
    for (const [cue, src] of entries) {
      const handle = new Audio(src);
      handle.preload = 'auto';
      await handle.play();
      if (!Number.isFinite(handle.duration) || handle.duration <= 0) throw new Error(`Invalid duration: ${cue}`);
      result.push({ cue, file: src.split('/').at(-1), duration: handle.duration });
      handle.pause();
    }
    return result;
  });
  const audit = await page.evaluate(() => window.audioAudit);
  if (audit.errors.length) throw new Error(JSON.stringify(audit.errors));
  if (errors.length) throw new Error(JSON.stringify(errors));
  await page.screenshot({ path: 'output/audio-game-edge.png' });
  // Leave the isolated test context muted, including its URL and saved preference.
  await page.goto(base);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Mute All' }).check();
  return { context: 'Microsoft Edge', hardMuteCreatedElements: hardMute, decodedSfx: decoded, nativePlaybackCount: audit.played.filter(a => a.resolved).length, panelChecks, reminderChimes, restShimmerChimes: restChimes, errors, applicationCues: [...new Set(applicationAudit.map(a => a.file))] };
}
