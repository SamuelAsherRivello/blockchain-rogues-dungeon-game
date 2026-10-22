async page => {
  const reports = []; const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const mode of ["grid-snap", "grid-tween", "gridless"]) {
    await page.goto("http://127.0.0.1:6080/blockchain-rogues-dungeon-game/?mute=1");
    await page.evaluate(async mode => {
      const { createCampaign } = await import("/blockchain-rogues-dungeon-game/src/systems/procedural/world-procedural-system.ts");
      const state = createCampaign(90210);
      state.floor.cells = Array.from({ length: 100 }, (_, y) => Array.from({ length: 100 }, (_, x) => ({ walkable: y === 50 && x >= 30 && x <= 80, role: "floor" })));
      delete state.floor.map; state.floor.entities = []; state.floor.objectSets = []; state.floor.decorations = [];
      state.floor.start = { x: 30, y: 50 }; state.player.x = 30; state.player.y = 50; state.player.pixel = { x: 976, y: 1616 };
      localStorage.setItem("rogues-dungeon.slot.1", JSON.stringify(state));
      localStorage.setItem("rogues-dungeon.preferences.v1", JSON.stringify({ movementMode: mode, zoom: .25, camera: "center" }));
    }, mode);
    await page.reload(); await page.getByRole("button", { name: /Saved Game 1/ }).click();
    await page.waitForFunction(() => /FPS: [0-9]/.test(document.body.innerText));
    const world = page.locator(".world-view"); const box = await world.boundingBox();
    await page.mouse.move(box.x + box.width / 2 + 320, box.y + box.height / 2);
    await page.waitForFunction(() => document.querySelectorAll(".world-view__path-dot").length === 30);
    await page.mouse.click(box.x + box.width / 2 + 320, box.y + box.height / 2, { button: "right" });
    await page.waitForFunction(() => document.querySelector(".world-view")?.getAttribute("data-player-pixel-x") === "1936");
    await page.waitForTimeout(800);
    if (await world.getAttribute("data-player-pixel-x") !== "1936") throw Error(`${mode} exceeded 30 steps`);
    reports.push({ mode, steps:30, stopCell:60 });
  }
  if (errors.length) throw Error(JSON.stringify(errors));
  return { reports, errors };
}
