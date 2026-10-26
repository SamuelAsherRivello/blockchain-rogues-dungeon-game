async page => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.setViewportSize({ width: 1440, height: 1000 });
  const reset = async (mode, battle = false) => {
    await page.goto("http://127.0.0.1:6080/blockchain-rogues-dungeon-game/?mute=1");
    await page.evaluate(async ({ mode, battle }) => {
      const { createCampaign } = await import("/blockchain-rogues-dungeon-game/src/systems/procedural/world-procedural-system.ts");
      const { revealDiscovery } = await import("/blockchain-rogues-dungeon-game/src/systems/procedural/map-discovery-system.ts");
      const campaign = createCampaign(90210);
      const enemy = campaign.floor.entities.find(entity => entity.kind === "enemy");
      campaign.floor.cells = Array.from({ length: 100 }, () => Array.from({ length: 100 }, () => ({ walkable: true, role: "ground" })));
      delete campaign.floor.map;
      campaign.floor.objectSets = []; campaign.floor.decorations = []; campaign.floor.entities = [];
      campaign.floor.start = { x: 20, y: 20 }; campaign.player.x = 50; campaign.player.y = 50; campaign.player.pixel = { x: 1616, y: 1616 };
      campaign.progression.attributes.perception = battle ? 0 : 5;
      campaign.player.equipment.weapons[0] = { id: "fixture-stick", name: "Wooden Stick", group: "weapons", modifiers: { offense: 1 } };
      if (battle) { Object.assign(enemy, { x: 55, y: 50, awareness: 6, nextActionAt: 9999 }); campaign.floor.entities = [enemy]; }
      // This fixture isolates Perception; fog walking has its own browser cases.
      revealDiscovery(campaign, campaign.player, 10);
      localStorage.setItem("rogues-dungeon.slot.1", JSON.stringify(campaign));
      localStorage.setItem("rogues-dungeon.preferences.v1", JSON.stringify({ movementMode: mode, zoom: 1, camera: "center" }));
    }, { mode, battle });
    await page.reload();
    await page.getByRole("button", { name: /Saved Game 1/ }).click();
    await page.locator(".game-screen").waitFor({ state: "visible" });
    await page.waitForFunction(() => !document.body.textContent.includes("Preparing the crypt..."));
    await page.waitForFunction(() => /FPS: [0-9]/.test(document.body.innerText)); await page.waitForTimeout(300);
    if (await page.locator("canvas").count() < 1) throw Error("No canvas");
    if (await page.getByText(/WebGPU.*unavailable|WebGPU.*not supported/i).count()) throw Error("WebGPU unavailable");
  };
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.1")));
  const reports = [];
  for (const mode of ["grid-snap", "grid-tween", "gridless"]) {
    await reset(mode);
    const select = page.getByRole("combobox", { name: "Movement mode" });
    if (await select.inputValue() !== mode) throw Error("Movement preference not selected");
    const box = await page.locator(".world-view").boundingBox();
    const x = box.x + box.width / 2; const y = box.y + box.height / 2;
    await page.mouse.move(x + 32, y);
    await page.waitForTimeout(80);
    if (await page.locator(".world-view__path-dot").count() !== 1) throw Error("Cardinal path dot changed");
    await page.mouse.move(x + 32, y + 32); await page.waitForTimeout(80);
    if (await page.locator(".world-view__path-dot").count() !== 2) throw Error("Diagonal path dots changed");
    await page.locator('label[aria-label="Zoom"] select').selectOption("2"); await page.waitForTimeout(150);
    await page.mouse.move(x + 64, y); await page.waitForTimeout(100);
    if (await page.locator(".world-view__path-dot").count() !== 1) throw Error("Zoom misaligned the path preview");
    const dotWidth = await page.locator(".world-view__path-dot").first().evaluate(el => el.getBoundingClientRect().width);
    if (Math.abs(dotWidth - 8) > .2) throw Error("Path dots did not scale with Zoom");
    await page.locator('label[aria-label="Zoom"] select').selectOption("1"); await page.waitForTimeout(150);
    await page.mouse.click(x + 96 + (mode === "gridless" ? 5 : 0), y);
    await page.waitForTimeout(1800);
    const result = await saved();
    if (result.player.x !== 53) throw Error(`${mode} did not complete released click: ${JSON.stringify(result.player)}`);
    if (mode === "gridless" && result.player.pixel.x !== 1712) throw Error(`Gridless did not stop at destination center: ${result.player.pixel.x}`);
    reports.push({ mode, x: result.player.x, pixel: result.player.pixel, time: result.floor.time });
    if (mode === "gridless") {
      await page.keyboard.down("ArrowDown"); await page.waitForTimeout(230); await page.keyboard.up("ArrowDown"); await page.waitForTimeout(400);
      const stopped = await saved(); await page.waitForTimeout(300);
      if (JSON.stringify((await saved()).player.pixel) !== JSON.stringify(stopped.player.pixel)) throw Error("Keyboard release failed");
      const liveY = Number(await page.locator(".world-view").getAttribute("data-player-pixel-y")); if (stopped.player.pixel.y !== liveY) throw Error("Released pixel position was not saved exactly");
    }
  }
  await reset("gridless", true);
  await page.locator('label[aria-label="Camera"] select').selectOption("screen");
  if (await page.locator(".world-view").getAttribute("data-game-mode") !== "Battle") throw Error("Hidden enemy did not trigger Battle");
  const border = await page.locator(".world-view").evaluate(el => getComputedStyle(el, "::after").borderTopWidth);
  if (border !== "2px") throw Error("Battle border is not two pixels");
  await page.keyboard.down("ArrowLeft"); await page.waitForFunction(() => /FPS: [0-9]/.test(document.body.innerText)); await page.waitForTimeout(300); await page.keyboard.up("ArrowLeft");
  if ((await saved()).player.x !== 49) throw Error("Battle repeated a held key");
  if (await page.getByRole("combobox", { name: "Movement mode" }).inputValue() !== "gridless") throw Error("Battle overwrote selection");
  const battleBox = await page.locator(".world-view").boundingBox();
  await page.mouse.click(battleBox.x + battleBox.width / 2 - 96, battleBox.y + battleBox.height / 2);
  await page.waitForTimeout(800);
  if ((await saved()).player.x !== 48) throw Error("Battle click did not move exactly one cell");
  if (await page.locator(".world-view").getAttribute("data-game-mode") !== "General") throw Error("Battle did not end outside awareness");
  await page.waitForTimeout(500);
  if ((await saved()).player.x !== 48) throw Error("Battle exit resumed stale route");
  await reset("grid-tween", true);
  let enemyBox = await page.locator(".world-view").boundingBox();
  await page.mouse.move(enemyBox.x + enemyBox.width / 2 + 160, enemyBox.y + enemyBox.height / 2);
  await page.waitForTimeout(150);
  if (await page.locator(".world-view").getAttribute("data-cursor") !== "neutral" || await page.locator(".world-view__enemy-tooltip").count()) throw Error("Undetected enemy disclosed by hover");
  for (let step = 0; step < 4; step++) { await page.keyboard.press("ArrowRight"); await page.waitForTimeout(280); }
  enemyBox = await page.locator(".world-view").boundingBox();
  await page.mouse.move(enemyBox.x + enemyBox.width / 2 + 32, enemyBox.y + enemyBox.height / 2);
  await page.waitForTimeout(200);
  if (await page.locator(".world-view").getAttribute("data-cursor") !== "fight" || await page.locator(".world-view__enemy-tooltip").count() !== 1) throw Error("Adjacent detected enemy missing hover presentation");
  await page.keyboard.press("ArrowLeft"); await page.waitForTimeout(400);
  if (await page.locator(".world-view__enemy-tooltip").count()) throw Error("Lost detection retained stale tooltip");
  if (await page.locator(".world-view").getAttribute("data-game-mode") !== "Battle") throw Error("Losing detection incorrectly ended Battle");
  const beforeFullscreen = await page.locator(".world-view").boundingBox();
  await page.getByRole("button", { name: "Fullscreen", exact: true }).click(); await page.waitForTimeout(300);
  if (await page.locator(".world-view").evaluate(el => getComputedStyle(el, "::after").borderTopWidth) !== "2px") throw Error("Battle border missing in fullscreen");
  await page.getByRole("button", { name: "Fullscreen", exact: true }).click(); await page.waitForTimeout(300);
  const afterFullscreen = await page.locator(".world-view").boundingBox();
  if (Math.abs(beforeFullscreen.width - afterFullscreen.width) > 1) throw Error("Fullscreen did not restore view geometry");
  await reset("grid-tween");
  const cancelBox = await page.locator(".world-view").boundingBox();
  await page.mouse.click(cancelBox.x + cancelBox.width / 2 - 192, cancelBox.y + cancelBox.height / 2);
  await page.evaluate(() => window.dispatchEvent(new Event("blur"))); await page.waitForTimeout(350);
  const blurred = (await saved()).player.x; await page.waitForTimeout(500);
  if ((await saved()).player.x !== blurred) throw Error("Blur retained a clicked destination");
  await page.mouse.click(cancelBox.x + cancelBox.width / 2 - 192, cancelBox.y + cancelBox.height / 2);
  await page.getByRole("button", { name: "Settings", exact: true }).click(); await page.waitForTimeout(350);
  const modal = (await saved()).player.x; await page.waitForTimeout(500);
  if ((await saved()).player.x !== modal) throw Error("Settings retained a clicked destination");
  await reset("gridless", true);
  await page.screenshot({ path: ".impeccable/review/desktop.png", fullPage: true });
  await page.getByRole("button", { name: "AR: L" }).click();
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(600);
  await page.screenshot({ path: ".impeccable/review/mobile.png", fullPage: true });
  if (errors.length) throw Error(JSON.stringify(errors));
  return { reports, battle: "one press per cell and selection restored", errors };
}
