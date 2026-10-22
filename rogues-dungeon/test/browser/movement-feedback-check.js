async page => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("http://127.0.0.1:6080/blockchain-rogues-dungeon-game/?mute=1");
  await page.evaluate(async () => {
    const { createCampaign } = await import("/blockchain-rogues-dungeon-game/src/systems/procedural/world-procedural-system.ts");
    const campaign = createCampaign(90210);
    campaign.floor.cells = Array.from({ length: 100 }, () => Array.from({ length: 100 }, () => ({ walkable: true, role: "floor" })));
    delete campaign.floor.map;
    campaign.floor.entities = []; campaign.floor.decorations = []; campaign.floor.objectSets = [];
    campaign.floor.start = { x: 20, y: 20 };
    campaign.player.x = 50; campaign.player.y = 50; campaign.player.pixel = { x: 1616, y: 1616 };
    localStorage.setItem("rogues-dungeon.slot.1", JSON.stringify(campaign));
    localStorage.setItem("rogues-dungeon.preferences.v1", JSON.stringify({ movementMode: "grid-tween", camera: "center", zoom: 1 }));
  });
  await page.reload();
  await page.getByRole("button", { name: /Saved Game 1/ }).click();
  await page.waitForFunction(() => /FPS: [0-9]/.test(document.body.innerText));
  const world = page.locator(".world-view");
  const position = () => world.evaluate(el => ({ x: Number(el.dataset.playerPixelX), y: Number(el.dataset.playerPixelY) }));
  const report = [];
  for (const mode of ["grid-snap", "grid-tween", "gridless"]) {
    const select = page.getByRole("combobox", { name: "Movement mode" });
    await select.focus();
    await select.selectOption(mode);
    if (await select.evaluate(el => el === document.activeElement)) throw Error(`${mode} retained dropdown focus`);
    for (const [key, axis, sign] of [["ArrowRight", "x", 1], ["ArrowLeft", "x", -1], ["ArrowDown", "y", 1], ["ArrowUp", "y", -1], ["d", "x", 1], ["a", "x", -1], ["s", "y", 1], ["w", "y", -1]]) {
      const before = await position();
      await page.keyboard.down(key); await page.waitForTimeout(85); await page.keyboard.up(key);
      await page.waitForTimeout(180);
      const after = await position();
      const distance = (after[axis] - before[axis]) * sign;
      if (!(distance > 0)) throw Error(`${mode}: ${key} did not move`);
      if (mode === "gridless" && !Number.isInteger(after[axis])) throw Error(`${key} did not stop on a whole pixel`);
      if (mode !== "gridless" && distance !== 32) throw Error(`${mode}: ${key} did not move exactly one cell`);
      const settled = await position();
      if (JSON.stringify(settled) !== JSON.stringify(after)) throw Error(`${mode} ${key} release drifted: ${JSON.stringify({ after, settled })}`);
    }
    report.push({ mode, keyboard: "all eight keys passed" });
  }
  for (const button of ["left", "right"]) {
    const box = await world.boundingBox();
    const before = await position();
    const destination = { x: Math.floor((before.x + 195) / 32) * 32 + 16, y: Math.floor((before.y + 5) / 32) * 32 + 16 };
    await page.mouse.click(box.x + box.width / 2 + 195, box.y + box.height / 2 + 5, { button });
    await page.waitForFunction(() => document.querySelector(".world-view")?.getAttribute("data-player-animation") === "run/side");
    await page.waitForTimeout(200);
    if (await world.getAttribute("data-player-animation") !== "run/side") throw Error(`${button} did not sustain run`);
    await page.waitForFunction(destination => {
      const el = document.querySelector(".world-view");
      return Number(el?.getAttribute("data-player-pixel-x")) === destination.x && Number(el?.getAttribute("data-player-pixel-y")) === destination.y;
    }, destination);
    await page.waitForFunction(() => document.querySelector(".world-view")?.getAttribute("data-player-animation")?.startsWith("idle/"));
    const after = await position();
    if (after.x <= before.x + 150) throw Error(`${button} did not finish its destination`);
    if ((after.x - 16) % 32 || (after.y - 16) % 32) throw Error(`${button} did not finish at the grid center`);
    await page.waitForTimeout(200);
    if (JSON.stringify(after) !== JSON.stringify(await position())) throw Error(`${button} drifted after arrival`);
    report.push({ button, animation: "run then idle" });
  }
  if (await page.locator(".game-screen").count() !== 1 || await page.locator("canvas").count() < 1) throw Error("Missing game/canvas");
  if (await page.getByText(/requires WebGPU|WebGPU.*unavailable/i).count()) throw Error("WebGPU unavailable");
  if (errors.length) throw Error(JSON.stringify(errors));
  return { report, errors };
}
