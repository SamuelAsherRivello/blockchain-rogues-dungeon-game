async root => {
  const samples = [];
  for (const live of [true, false]) {
    const context = await root.context().browser().newContext({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    try {
      await context.route("**/src/systems/procedural/world-procedural-system.ts*", async route => {
        const response = await route.fetch(); let body = await response.text();
        body = body.replace("import { countPerformance, measurePerformance }", "import { countPerformance, measurePerformance, performanceOptions as probeOptions }");
        if (!body.includes("return session;") || !body.includes("performanceOptions as probeOptions")) throw Error("Session probe insertion changed");
        body = body.replace("return session;", "if (typeof window !== 'undefined' && probeOptions().enabled) window.__smallEnemySession = session; return session;");
        await route.fulfill({ response, body });
      });
      const page = await context.newPage();
      page.on("pageerror", error => errors.push(error.message));
      page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
      await page.goto("http://127.0.0.1:6080/blockchain-rogues-dungeon-game/?mute=1&world=1&level=1&run=1&slot=1&seed=17");
      await page.locator(".world-view[data-renderer-ready=true]").waitFor();
      await page.locator(".world-view .ui_iris_transition").waitFor({ state: "hidden" });
      const saved = await page.evaluate(() => JSON.stringify({ ...localStorage }));
      await page.getByRole("button", { name: "P: 0", exact: true }).click();
      await page.getByRole("button", { name: "Enemy test: 50×50 / 8", exact: true }).click();
      await page.locator(".world-view[data-renderer-ready=true]").waitFor();
      await page.locator(".world-view .ui_iris_transition").waitFor({ state: "hidden" });
      if (!live) await page.getByRole("button", { name: "Enemy logic: Live", exact: true }).click();
      const snapshot = () => page.evaluate(() => {
        const state = window.__smallEnemySession.getState();
        return { seed: state.floor.seed, width: state.floor.width, height: state.floor.height, time: state.floor.time,
          enemies: state.floor.entities.filter(e => e.kind === "enemy").map(({id,x,y}) => ({id,x,y})), player: {x:state.player.x,y:state.player.y} };
      });
      const before = await snapshot();
      if (before.width !== 50 || before.enemies.length !== 8) throw Error("Wrong small-world fixture");
      await page.waitForTimeout(2000);
      await page.getByRole("button", { name: "Reset sample", exact: true }).click();
      await page.mouse.move(1270, 710);
      for (let i = 0; i < 40; i++) { await page.keyboard.press("x"); await page.waitForTimeout(100); }
      const after = await snapshot(), metrics = JSON.parse(await page.locator(".performance-controls pre").textContent());
      const changed = JSON.stringify(before.enemies) !== JSON.stringify(after.enemies);
      if (after.time <= before.time || changed !== live) throw Error("Enemy logic or wait turns did not match the mode");
      if (!live && (metrics.cpu["navigation (inclusive)"] || metrics.cpu["AI (inclusive)"])) throw Error("Paused mode ran AI");
      await page.getByRole("button", { name: "Exit Perf", exact: true }).click();
      if (await page.evaluate(() => JSON.stringify({ ...localStorage })) !== saved) throw Error("Perf test wrote storage");
      if (errors.length) throw Error(errors.join("; "));
      samples.push({ live, before, after, metrics, canvases: await page.locator("canvas").count(), errors });
    } finally { await context.close(); }
  }
  await root.evaluate(samples => { window.__smallEnemySamples = samples; }, samples);
  return samples;
}
