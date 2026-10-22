async page => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  const reports = [];
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const mode of ["grid-snap", "grid-tween", "gridless"]) {
    await page.goto("http://127.0.0.1:6080/blockchain-rogues-dungeon-game/?mute=1");
    await page.evaluate(async mode => {
      const { createCampaign } = await import("/blockchain-rogues-dungeon-game/src/systems/procedural/world-procedural-system.ts");
      const campaign = createCampaign(90210);
      campaign.floor.cells = Array.from({ length: 100 }, (_, y) => Array.from({ length: 100 }, (_, x) => ({ walkable: y === 50 && x >= 50 && x <= 56, role: "floor" })));
      delete campaign.floor.map;
      campaign.floor.entities = []; campaign.floor.objectSets = [];
      campaign.floor.decorations = [{ id: "test-trap", kind: "trap", x: 53, y: 50, wallMounted: false }];
      campaign.floor.start = { x: 50, y: 50 }; campaign.player.x = 50; campaign.player.y = 50; campaign.player.pixel = { x: 1616, y: 1616 };
      localStorage.setItem("rogues-dungeon.slot.1", JSON.stringify(campaign));
      localStorage.setItem("rogues-dungeon.preferences.v1", JSON.stringify({ movementMode: mode, zoom: 1, camera: "center" }));
    }, mode);
    await page.reload();
    await page.getByRole("button", { name: /Saved Game 1/ }).click();
    await page.waitForFunction(() => /FPS: [0-9]/.test(document.body.innerText));
    const world = page.locator(".world-view"); const box = await world.boundingBox();
    await page.mouse.move(box.x + box.width / 2 + 192, box.y + box.height / 2);
    await page.waitForFunction(() => document.querySelectorAll(".world-view__path-dot").length === 6);
    if (await page.locator(".world-view__path-dot--hazard").count() !== 1) throw Error("Missing red hazard dot");
    await page.mouse.click(box.x + box.width / 2 + 192, box.y + box.height / 2);
    await page.waitForFunction(() => document.querySelector(".world-view")?.getAttribute("data-player-pixel-x") === "1680");
    await page.waitForTimeout(700);
    const pixel = await world.getAttribute("data-player-pixel-x");
    if (pixel !== "1680") throw Error(`${mode} crossed the trap approach: ${pixel}`);
    const nextBox = await world.boundingBox();
    await page.mouse.move(nextBox.x + nextBox.width / 2 + 128, nextBox.y + nextBox.height / 2);
    await page.waitForFunction(() => document.querySelectorAll(".world-view__path-dot").length === 4);
    const dotCount = await page.locator(".world-view__path-dot").count();
    if (dotCount !== 4) throw Error(`${mode} did not retain its complete preview: ${dotCount}`);
    await page.mouse.click(nextBox.x + nextBox.width / 2 + 128, nextBox.y + nextBox.height / 2);
    await page.waitForFunction(() => document.querySelector(".world-view")?.getAttribute("data-player-pixel-x") === "1808");
    reports.push({ mode, courtesyStop:52, redDots:1, secondGestureDestination:56 });
  }
  if (errors.length) throw Error(JSON.stringify(errors));
  return { reports, errors };
}
