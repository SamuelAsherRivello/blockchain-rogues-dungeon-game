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
  const reset = async (mode, kind) => {
    await page.goto(`${base}?mute=1`);
    await page.evaluate(async ({ mode, kind }) => {
      const { createCampaign } = await import("/blockchain-rogues-dungeon-game/src/systems/procedural/world-procedural-system.ts");
      const campaign = createCampaign(90210);
      const enemy = campaign.floor.entities.find(entity => entity.kind === "enemy");
      campaign.floor.cells = Array.from({ length: 100 }, () => Array.from({ length: 100 }, () => ({ walkable: true, role: "ground" })));
      delete campaign.floor.map;
      campaign.floor.objectSets = []; campaign.floor.decorations = []; campaign.floor.entities = [];
      campaign.floor.start = { x: 20, y: 20 }; campaign.player.x = 50; campaign.player.y = 50; campaign.player.pixel = { x: 1616, y: 1616 };
      campaign.progression.attributes.perception = 0;
      campaign.player.equipment.weapons[0] = { id: "fixture-stick", name: "Wooden Stick", group: "weapons", modifiers: { offense: 1 } };
      if (kind === "enemy") { Object.assign(enemy, { id: "fixture-enemy", x: 51, y: 50, hp: 1000, maxHp: 1000, awareness: 6, nextActionAt: 9999 }); enemy.resources.health = {current: 1000, currentMax: 1000}; campaign.floor.entities = [enemy]; } else campaign.floor.entities = [{id: "fixture-crate", kind: "crate", x: 51, y: 50, health: 1000}];
      localStorage.setItem("rogues-dungeon.slot.1", JSON.stringify(campaign));
      localStorage.setItem("rogues-dungeon.preferences.v1", JSON.stringify({ movementMode: mode, zoom: 1, camera: "center" }));
    }, { mode, kind });
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
    for (const control of ["left-stick", "dpad"]) {
      for (const kind of ["crate", "enemy"]) {
        await reset(mode, kind);
        await input(control === "left-stick" ? 1 : 0, 0, control === "dpad" ? 15 : -1);
        try {
          await page.waitForFunction(async kind => {
            const { readSlot } = await import("/blockchain-rogues-dungeon-game/src/systems/persistence/save-system.ts");
            const saved = readSlot(localStorage, "1");
            const target = saved?.floor.entities.find(entity => entity.id === `fixture-${kind}`);
            return target && (kind === "enemy" ? target.hp : target.health) < 1000;
          }, kind, { timeout: 5000 });
        } catch (error) { throw Error(`${mode}/${control}/${kind}: ${error.message}`); }
        finally { await input(); }
        // Gridless alignment and contact finish after releasing the control.
        await page.waitForTimeout(500);
        const saved = await page.evaluate(async () => {
          const { readSlot } = await import("/blockchain-rogues-dungeon-game/src/systems/persistence/save-system.ts");
          return readSlot(localStorage, "1");
        });
        if (saved.player.x !== 50 || saved.player.y !== 50) throw Error(`${mode}/${control} walked into ${kind}`);
        const target = saved.floor.entities.find(entity => entity.id === `fixture-${kind}`);
        if (!target || (kind === "enemy" ? target.hp : target.health) >= 1000) throw Error(`${mode}/${control}/${kind}: bump did not persist`);
        reports.push({ mode, control, kind, health: kind === "enemy" ? target.hp : target.health });
      }
    }
  }
  if (errors.length) throw Error(errors.join("\n"));
  return { reports, errors };
}
