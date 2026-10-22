async page => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.addInitScript(() => {
    window.testGamepad = { connected: true, mapping: "standard", axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })) };
    Object.defineProperty(navigator, "getGamepads", { configurable: true, value: () => window.testGamepad ? [null, window.testGamepad] : [] });
  });
  const base = "http://127.0.0.1:6080/blockchain-rogues-dungeon-game/";
  const input = async (x = 0, y = 0, button = -1) => {
    await page.evaluate(({ x, y, button }) => {
      window.testGamepad.axes = [x, y];
      window.testGamepad.buttons.forEach((entry, index) => { entry.pressed = index === button; entry.value = Number(entry.pressed); });
    }, { x, y, button });
    await page.waitForTimeout(100);
  };
  const position = () => page.locator(".world-view").evaluate(el => ({ x: Number(el.dataset.playerPixelX), y: Number(el.dataset.playerPixelY) }));
  const reset = async (mode, battle = false) => {
    await page.goto(`${base}?mute=1`);
    await page.evaluate(async ({ mode, battle }) => {
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
      localStorage.setItem("rogues-dungeon.preferences.v1", JSON.stringify({ movementMode: mode, zoom: 1, camera: "center" }));
    }, { mode, battle });
    await page.reload();
    await page.bringToFront();
    await page.getByRole("button", { name: /Saved Game 1/ }).click();
    await page.locator(".game-screen").waitFor({ state: "visible" });
    await page.waitForFunction(() => !document.body.textContent.includes("Preparing the crypt..."));
    await page.waitForFunction(() => /FPS: [0-9]/.test(document.body.innerText));
    await page.waitForTimeout(300);
    if (!await page.locator("canvas").count()) throw Error("No canvas");
    if (await page.getByText(/WebGPU.*unavailable|WebGPU.*not supported/i).count()) throw Error("WebGPU unavailable");
  };
  const reports = [];
  for (const mode of ["grid-snap", "grid-tween", "gridless"]) {
    await reset(mode);
    const start = await position();
    await input(.2, -.2);
    if (JSON.stringify(await position()) !== JSON.stringify(start)) throw Error(`${mode}: stick drift`);
    await input(1);
    await page.waitForTimeout(650);
    await input();
    const stick = await position();
    if (stick.x <= start.x || stick.y !== start.y) throw Error(`${mode}: left stick did not move east`);
    await page.waitForTimeout(450);
    if (JSON.stringify(await position()) !== JSON.stringify(stick)) throw Error(`${mode}: release did not stop`);
    await input(0, 0, 13);
    await page.waitForTimeout(450);
    await input();
    const dpad = await position();
    if (dpad.y <= stick.y || dpad.x !== stick.x) throw Error(`${mode}: D-pad did not move south`);
    await input(-1);
    await page.evaluate(() => { window.testGamepad.connected = false; });
    await page.waitForTimeout(150);
    const disconnected = await position();
    await page.waitForTimeout(500);
    if (JSON.stringify(await position()) !== JSON.stringify(disconnected)) throw Error(`${mode}: disconnect did not stop`);
    reports.push({ mode, start, stick, dpad, disconnected });
  }
  await reset("grid-tween", true);
  if (await page.locator(".world-view").getAttribute("data-game-mode") !== "Battle") throw Error("Battle fixture missing");
  await input(-1);
  await page.waitForTimeout(800);
  const step = await position();
  if (step.x !== 1584) throw Error(`Battle repeated held stick: ${JSON.stringify(step)}`);
  await input(); await input(-1); await input();
  if ((await position()).x !== 1552) throw Error("Battle fresh stick press did not take another step");
  reports.push({ battle: "one step per press" });
  await reset("gridless");
  await input(1);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await page.waitForTimeout(200);
  const blurred = await position();
  await page.waitForTimeout(500);
  if (JSON.stringify(await position()) !== JSON.stringify(blurred)) throw Error("Blur resumed a held stick");
  await input(); await input(1); await input();
  if ((await position()).x <= blurred.x) throw Error("Fresh stick input did not recover after blur");
  reports.push({ blur: "stops until neutral" });
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("dialog", { name: "Settings", exact: true }).waitFor();
  const menuStart = await position();
  await input(1); await page.waitForTimeout(500);
  if (JSON.stringify(await position()) !== JSON.stringify(menuStart)) throw Error("Controller moved behind Settings");
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.waitForTimeout(500);
  if (JSON.stringify(await position()) !== JSON.stringify(menuStart)) throw Error("Closing Settings resumed held input");
  await input(); await input(1); await input();
  if ((await position()).x <= menuStart.x) throw Error("Fresh stick input did not recover after Settings");
  reports.push({ settings: "blocks movement and requires neutral on close" });
  if (errors.length) throw Error(errors.join("\n"));
  return { reports, errors };
}
