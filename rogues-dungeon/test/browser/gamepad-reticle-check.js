async page => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.addInitScript(() => {
    window.testGamepad = { connected: true, mapping: "standard", axes: [0, 0, 0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })) };
    Object.defineProperty(navigator, "getGamepads", { configurable: true, value: () => [window.testGamepad] });
  });
  const base = "http://127.0.0.1:6080/blockchain-rogues-dungeon-game/";
  const aim = async (x = 0, y = 0, trigger = -1) => {
    await page.evaluate(({ x, y, trigger }) => {
      window.testGamepad.axes = [0, 0, x, y];
      window.testGamepad.buttons.forEach((button, index) => { button.pressed = index === trigger; button.value = Number(button.pressed); });
    }, { x, y, trigger });
    await page.waitForTimeout(60);
  };
  const reset = async (battle = false) => {
    await page.goto(`${base}?mute=1`);
    await page.evaluate(async battle => {
      const { createCampaign } = await import("/blockchain-rogues-dungeon-game/src/systems/procedural/world-procedural-system.ts");
      const campaign = createCampaign(90210);
      const enemy = campaign.floor.entities.find(entity => entity.kind === "enemy");
      campaign.floor.cells = Array.from({ length: 100 }, () => Array.from({ length: 100 }, () => ({ walkable: true, role: "ground" })));
      delete campaign.floor.map;
      campaign.floor.objectSets = []; campaign.floor.decorations = []; campaign.floor.entities = [];
      campaign.floor.start = { x: 20, y: 20 }; campaign.player.x = 50; campaign.player.y = 50; campaign.player.pixel = { x: 1616, y: 1616 };
      campaign.progression.attributes.perception = 0;
      campaign.player.equipment.weapons[0] = { id: "fixture-stick", name: "Wooden Stick", group: "weapons", modifiers: { offense: 1 } };
      if (battle) { Object.assign(enemy, { x: 55, y: 50, awareness: 6, nextActionAt: 9999 }); campaign.floor.entities = [enemy]; }
      localStorage.setItem("rogues-dungeon.slot.1", JSON.stringify(campaign));
      localStorage.setItem("rogues-dungeon.preferences.v1", JSON.stringify({ movementMode: "grid-tween", zoom: 1, camera: "center" }));
    }, battle);
    await page.reload(); await page.bringToFront();
    await page.getByRole("button", { name: /Saved Game 1/ }).click();
    await page.locator(".game-screen").waitFor({ state: "visible" });
    await page.waitForFunction(() => !document.body.textContent.includes("Preparing the crypt..."));
    await page.waitForFunction(() => /FPS: [0-9]/.test(document.body.innerText));
    await page.waitForTimeout(300);
  };
  const position = () => page.locator(".world-view").evaluate(el => ({ x: Number(el.dataset.playerX), y: Number(el.dataset.playerY) }));
  const reticle = () => page.locator(".world-view__grid-reticle").evaluate(el => ({ x: parseFloat(el.style.left), y: parseFloat(el.style.top) }));
  const mouse = async (dx = 0, dy = 0) => {
    const box = await page.locator(".world-view").boundingBox();
    await page.mouse.move(box.x + box.width / 2 + dx, box.y + box.height / 2 + dy);
    await page.waitForTimeout(80);
  };
  const reports = [];
  const expectNeighbor = async (dx, dy) => {
    const actual = await reticle();
    const box = await page.locator(".world-view").boundingBox();
    const size = await page.locator(".world-view__grid-reticle").evaluate(el => parseFloat(el.style.width));
    if (Math.abs(actual.x - box.width / 2 - dx * size) > 2 || Math.abs(actual.y - box.height / 2 - dy * size) > 2) throw Error(`Expected neighbor ${dx},${dy}: ${JSON.stringify(actual)}, tile ${size}`);
  };
  const hidden = async () => {
    if (await page.locator(".world-view__grid-reticle").count()) throw Error("Gamepad button did not hide reticle");
  };
  await reset();
  await mouse(128, 64);
  const mouseTarget = await reticle();
  await aim(1, -1); await page.waitForTimeout(150);
  if (JSON.stringify(await reticle()) !== JSON.stringify(mouseTarget)) throw Error("Right stick overrode mouse mode without a button press");
  await aim(0, 0, 0); await hidden(); await aim();
  for (const [x, y] of [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]]) {
    await aim(x, y); await expectNeighbor(x, y);
    await page.waitForTimeout(180); await expectNeighbor(x, y);
    await aim(x * .6, y * .6); await expectNeighbor(x, y);
    await aim();
  }
  if (JSON.stringify(await position()) !== JSON.stringify({ x: 50, y: 50 })) throw Error("Aiming moved the player");
  await page.keyboard.press("ArrowDown"); await page.waitForTimeout(400);
  await expectNeighbor(1, -1);
  reports.push({ gamepadAim: "eight adjacent tiles, no drift, follows character" });
  await mouse(129, 64); const freeMouse = await reticle();
  await aim(-1, 0); await page.waitForTimeout(200);
  if (JSON.stringify(await reticle()) !== JSON.stringify(freeMouse)) throw Error("Mouse mode did not persist");
  await aim(0, 0, 3); await hidden(); await aim();
  await aim(1); await expectNeighbor(1, 0); await aim();
  const beforeLeft = await position();
  await aim(0, 0, 6); await hidden(); await page.waitForTimeout(600); await aim();
  if ((await position()).x !== beforeLeft.x + 1) throw Error("Left trigger did not click the adjacent target");
  const noAim = await position();
  await aim(0, 0, 7); await page.waitForTimeout(400); await aim();
  if (JSON.stringify(await position()) !== JSON.stringify(noAim)) throw Error("Trigger clicked a hidden stale target");
  await aim(1); await aim(); await aim(0, 0, 7); await hidden(); await page.waitForTimeout(600); await aim();
  if ((await position()).x !== noAim.x + 1) throw Error("Right trigger did not click the new target");
  reports.push({ switching: "mouse resumes until any gamepad button; buttons hide reticle", triggers: "click once and hide; no stale clicks" });
  await reset(true);
  await aim(0, 0, 0); await aim(); await aim(-1); await aim();
  await aim(0, 0, 6); await page.waitForTimeout(1000);
  if ((await position()).x !== 49) throw Error("Held left trigger repeated in Battle");
  await aim(); await aim(-1); await aim(); await aim(0, 0, 7); await page.waitForTimeout(1000);
  if ((await position()).x !== 48) throw Error("Right trigger did not take one Battle step");
  await aim();
  reports.push({ battle: "one step per trigger press" });
  if (errors.length) throw Error(errors.join("\n"));
  return { reports, errors };
}
