async page => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  const url = "http://127.0.0.1:6080/blockchain-rogues-dungeon-game/?mute=1";
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(url);
  const report = [];
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.1")));
  for (const kind of ["campfire", "chest", "crate", "barrel", "gold", "stairs", "teleport-arrow", "wall"]) {
    await page.evaluate(async kind => {
      const { createCampaign } = await import("/blockchain-rogues-dungeon-game/src/systems/procedural/world-procedural-system.ts");
      const { revealDiscovery } = await import("/blockchain-rogues-dungeon-game/src/systems/procedural/map-discovery-system.ts");
      const state = createCampaign(90210);
      state.floor.cells = Array.from({ length: 100 }, () => Array.from({ length: 100 }, () => ({ walkable: true, role: "floor" })));
      delete state.floor.map; delete state.generatorVersion; delete state.floors;
      state.floor.generatorVersion = "browser-fixture"; state.levelStates = {}; state.floorProfiles = {};
      state.floor.start = { x: 20, y: 20 };
      state.floor.entities = []; state.floor.objectSets = []; state.floor.decorations = []; state.floor.prefabPlacements = [];
      state.player.x = 50; state.player.y = 50; state.player.pixel = { x: 1630, y: 1618 };
      state.counters.gold = 100;
      const position = { x: 51, y: 50 };
      if (kind === "barrel") state.floor.objectSets = [{ id: "gate", kind: "floor-trigger-door-barrel", barrel: position, trigger: { x: 52, y: 50 }, door: { x: 55, y: 50 }, regionRole: "optional-reward" }];
      else if (kind === "wall") state.floor.cells[50][51].walkable = false;
      else state.floor.entities = [{ id: "fixture", kind, ...position, ...(kind === "crate" ? { health: 100 } : kind === "gold" ? { amount: 2 } : kind === "teleport-arrow" ? { destination: "player-home", direction: "n" } : {}) }];
      revealDiscovery(state, state.player);
      localStorage.setItem("rogues-dungeon.slot.1", JSON.stringify(state));
      localStorage.setItem("rogues-dungeon.preferences.v1", JSON.stringify({ movementMode: "gridless", camera: "center", zoom: 1 }));
    }, kind);
    await page.reload();
    await page.getByRole("button", { name: /Saved Game 1/ }).click();
    await page.locator('.world-view[data-renderer-ready="true"][data-world-alive="true"]').waitFor({ timeout: 30000 });
    await page.locator(".world-view .ui_iris_transition").waitFor({ state: "detached", timeout: 15000 });
    await page.evaluate(async () => {
      const { GridlessInteractionController } = await import("/blockchain-rogues-dungeon-game/src/game/gridless-interaction.ts");
      window.interactionTrace = [];
      const start = GridlessInteractionController.prototype.start;
      GridlessInteractionController.prototype.start = function(plan, state, now, valid, commit) {
        const trace = { kind: plan.kind, start: now, origin: state.player.pixel, target: plan.target, before: JSON.parse(localStorage.getItem("rogues-dungeon.slot.1")) };
        const accepted = start.call(this, plan, state, now, valid, at => {
          trace.contact = at;
          trace.beforeCommit = JSON.parse(localStorage.getItem("rogues-dungeon.slot.1"));
          commit(at);
          trace.after = JSON.parse(localStorage.getItem("rogues-dungeon.slot.1"));
        });
        if (accepted) window.interactionTrace.push(trace);
        return accepted;
      };
    });
    const before = await saved();
    await page.keyboard.down("d");
    await page.waitForFunction(() => window.interactionTrace.length > 0);
    await page.keyboard.up("d");
    await page.waitForFunction(() => window.interactionTrace[0]?.contact !== undefined);
    const trace = await page.evaluate(() => window.interactionTrace[0]);
    const minDuration = ["gold", "stairs", "teleport-arrow"].includes(kind) ? 250 : kind === "barrel" ? 562.5 : 312.5;
    if (trace.contact - trace.start < minDuration - 1) throw Error(`${kind} resolved too early: ${JSON.stringify(trace)}`);
    if (trace.beforeCommit.floor.time !== trace.before.floor.time) throw Error(`${kind} charged time before contact`);
    if (kind === "campfire") {
      await page.getByRole("heading", { name: "Campfire", exact: true }).waitFor();
      if ((await saved()).floor.time !== before.floor.time) throw Error("Campfire menu consumed a turn");
      // A fresh click confirms rest through the same bump controller.
      await page.waitForTimeout(140);
      await page.getByRole("button", { name: /Bump to rest/ }).click();
      await page.getByText("Resting ...", { exact: true }).waitFor();
      await page.getByText("Replenishing status ...", { exact: true }).waitFor({ timeout: 15000 });
      await page.waitForFunction(time => JSON.parse(localStorage.getItem("rogues-dungeon.slot.1")).floor.time === time + 1, before.floor.time);
      if ((await saved()).counters.gold !== before.counters.gold - 20) throw Error("Rest cost changed");
    } else if (["chest", "crate", "barrel", "gold"].includes(kind)) {
      if (trace.after.floor.time !== before.floor.time + 1) throw Error(`${kind} changed the turn cost`);
      if (kind === "barrel" && trace.after.floor.objectSets[0].barrel.x !== 52) throw Error("Barrel did not arrive");
      if (kind === "crate" && trace.after.floor.entities.find(e => e.kind === "crate").health !== 50) throw Error("Crate hit did not resolve once");
      if (kind === "gold" && trace.after.counters.gold !== before.counters.gold + 2) throw Error("Pickup did not resolve once");
    } else if (kind === "wall" && trace.after.floor.time !== before.floor.time) throw Error("Wall bump consumed time");
    if (kind === "stairs" || kind === "teleport-arrow") {
      if (trace.after.player.pixel.x !== 1648 || trace.after.player.pixel.y !== 1616) throw Error(`${kind} did not settle at its center`);
    }
    report.push({ kind, duration: Math.round(trace.contact - trace.start), turnCost: trace.after.floor.time - before.floor.time });
    if (await page.locator(".game-screen").count() !== 1 || await page.locator("canvas").count() < 1) throw Error("Missing game/canvas");
    if (await page.getByText(/requires WebGPU|WebGPU.*unavailable/i).count()) throw Error("WebGPU unavailable");
  }
  if (errors.length) throw Error(JSON.stringify(errors));
  return { report, errors };
}
