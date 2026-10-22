async root => {
  const browser = root.context().browser();
  const base = "http://127.0.0.1:6080/blockchain-rogues-dungeon-game/";
  const results = [];
  const { modes, useNative } = await root.evaluate(() => ({ modes: window.__enemyIsolationModes ?? ["normal", "paused"], useNative: window.__enemyIsolationUseNative !== false }));
  // Response overrides exist only in each disposable test context. No app source
  // or normal browser setting changes. Every behavioral override also requires Perf.
  for (const mode of modes) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const errors = [], patches = { domain: 0, renderer: 0, playback: 0 };
    const modeCheck = name => `new URLSearchParams(window.location.search).get("enemy-probe") === "${name}"`;
    try {
      await context.route("**/src/systems/procedural/world-procedural-system.ts*", async route => {
        const response = await route.fetch(); let body = await response.text();
        const token = "function enemyPhase(state, events) {";
        if (!body.includes(token) || !body.includes("return session;")) throw new Error("Domain diagnostic insertion point changed");
        body = body.replace("import { countPerformance, measurePerformance }", "import { countPerformance, measurePerformance, performanceOptions as diagnosticPerformanceOptions }");
        if (!body.includes("performanceOptions as diagnosticPerformanceOptions")) throw new Error("Missing Perf guard import");
        if (!useNative) body = body.replace(token, token + ` if (diagnosticPerformanceOptions().enabled && ${modeCheck("paused")}) { countPerformance("enemy turns suppressed"); return; }`);
        body = body.replace("return session;", "if (typeof window !== \"undefined\" && diagnosticPerformanceOptions().enabled) window.__enemyProbeSession = session; return session;");
        patches.domain++; await route.fulfill({ response, body });
      });
      await context.route("**/src/systems/rendering/babylon-render-system.tsx*", async route => {
        const response = await route.fetch(); let body = await response.text();
        const token = "const detectedNow = detectedCache;";
        if (!body.includes(token)) throw new Error("Renderer diagnostic insertion point changed");
        body = body.replace(token, `const detectedNow = performanceOptions().enabled && ${modeCheck("hidden")} ? new Set() : detectedCache;`);
        body = body.replace("detectedMarkers, (id, fallback)", `(performanceOptions().enabled && ${modeCheck("hidden")} ? new Set() : detectedMarkers), (id, fallback)`);
        body = body.replace("visibleEnemyAnimationKeys = new Set(ENEMY_CHARACTER_NAMES.filter", "if (performanceOptions().enabled) window.__enemyProbeDrawn = Object.values(byKind).reduce((sum, entries) => sum + entries.length, 0); visibleEnemyAnimationKeys = new Set(ENEMY_CHARACTER_NAMES.filter");
        patches.renderer++; await route.fulfill({ response, body });
      });
      await context.route("**/src/systems/animation/turn-presentation-system.ts*", async route => {
        const response = await route.fetch(); let body = await response.text();
        const token = "const visible = enemies(current).filter((enemy) => visibleEnemyIds.has(enemy.id));";
        if (!body.includes(token)) throw new Error("Playback diagnostic insertion point changed");
        body = body.replace(token, `const visible = enemies(current).filter((enemy) => !(typeof document !== "undefined" && document.querySelector(".performance-controls") && ${modeCheck("snap")}) && visibleEnemyIds.has(enemy.id));`);
        patches.playback++; await route.fulfill({ response, body });
      });
      const page = await context.newPage();
      page.on("pageerror", error => errors.push(error.message));
      page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
      await page.goto(base + "?mute=1&world=1&level=1&run=1&slot=1&seed=17&enemy-probe=" + mode);
      await page.locator(".world-view[data-renderer-ready=true]").waitFor();
      await page.locator(".world-view .ui_iris_transition").waitFor({ state: "hidden" });
      const savedBytes = await page.evaluate(() => JSON.stringify(Object.fromEntries(Object.keys(localStorage).filter(key => key.startsWith("rogues-dungeon.slot.")).sort().map(key => [key, localStorage.getItem(key)]))));
      await page.getByRole("combobox", { name: "Movement mode", exact: true }).selectOption("gridless");
      await page.getByRole("button", { name: "P: 0", exact: true }).click();
      await page.locator(".world-view[data-renderer-ready=true]").waitFor();
      for (let i = 0; i < 3 && !(await page.getByRole("button", { name: "World Size: 100×100", exact: true }).count()); i++) {
        await page.getByRole("button", { name: /^World Size:/ }).click();
        await page.locator(".world-view[data-renderer-ready=true]").waitFor();
      }
      await page.getByRole("button", { name: "Restart route", exact: true }).click();
      await page.locator(".world-view[data-renderer-ready=true]").waitFor();
      await page.locator(".world-view .ui_iris_transition").waitFor({ state: "hidden" });
      const fixture = await page.evaluate(() => {
        if (!document.querySelector(".performance-controls")) throw new Error("Fixture requires a temporary Perf session");
        const session = window.__enemyProbeSession;
        if (!session) throw new Error("Perf session was not exposed by test response");
        const state = session.getState();
        const template = state.floor.entities.find(entity => entity.kind === "enemy");
        if (!template) throw new Error("Missing generated enemy template");
        state.floor.entities = state.floor.entities.filter(entity => entity.kind !== "enemy");
        const seen = new Set(), queue = [{ x: state.player.x, y: state.player.y, distance: 0 }], spots = [];
        for (let i = 0; i < queue.length; i++) {
          const point = queue[i], key = point.x + "," + point.y;
          if (seen.has(key)) continue; seen.add(key);
          if (point.distance > 7 || !state.floor.cells[point.y]?.[point.x]?.walkable) continue;
          if (point.distance >= 5 && !state.floor.entities.some(entity => entity.x === point.x && entity.y === point.y)) spots.push(point);
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) queue.push({ x: point.x + dx, y: point.y + dy, distance: point.distance + 1 });
        }
        const selected = spots.slice(0, 4);
        if (selected.length !== 4) throw new Error("Not enough test positions");
        selected.forEach((point, index) => {
          const enemy = structuredClone(template);
          Object.assign(enemy, { id: "enemy-probe-" + index, x: point.x, y: point.y, awareness: 20, nextActionAt: state.floor.time + 2, actionCooldown: 3 });
          state.floor.entities.push(enemy);
        });
        state.progression.attributes.health = 1000;
        state.progression.attributes.perception = 20;
        state.player.resources.health = { current: 10000, currentMax: 10000 };
        // Publish one identical accepted turn so the new fixture is projected.
        session.dispatch({ type: "wait" });
        return { seed: state.floor.seed, width: state.floor.width, height: state.floor.height, enemies: selected.map(({ x, y }) => ({ x, y })) };
      });
      await page.waitForTimeout(3000);
      if (useNative && mode === "paused") await page.getByRole("button", { name: "Enemy logic: Live", exact: true }).click();
      await page.mouse.move(1270, 710);
      await page.getByRole("button", { name: "Reset sample", exact: true }).click();
      const before = await page.evaluate(() => {
        const state = window.__enemyProbeSession.getState();
        return { time: state.floor.time, player: { ...state.player.pixel }, enemies: state.floor.entities.filter(entity => entity.kind === "enemy").map(({ id, x, y }) => ({ id, x, y })), drawn: window.__enemyProbeDrawn ?? -1 };
      });
      let distance = 0, previous = Number(await page.locator(".world-view").getAttribute("data-player-pixel-x"));
      for (let i = 0; i < 20; i++) {
        const key = i % 2 ? "d" : "a";
        await page.keyboard.down(key); await page.waitForTimeout(500); await page.keyboard.up(key);
        const next = Number(await page.locator(".world-view").getAttribute("data-player-pixel-x")); distance += Math.abs(next - previous); previous = next;
      }
      const metrics = JSON.parse(await page.locator(".performance-controls pre").textContent());
      const after = await page.evaluate(() => {
        const state = window.__enemyProbeSession.getState();
        return { time: state.floor.time, enemies: state.floor.entities.filter(entity => entity.kind === "enemy").map(({ id, x, y }) => ({ id, x, y })), drawn: window.__enemyProbeDrawn ?? -1 };
      });
      const changed = JSON.stringify(before.enemies) !== JSON.stringify(after.enemies);
      if (!(distance > 0 && after.time > before.time)) throw new Error("Player/world time did not advance");
      if (mode === "hidden" && (before.drawn !== 0 || after.drawn !== 0 || !changed)) throw new Error("Hidden actors were drawn or stopped simulating");
      if (mode === "paused" && (changed || before.drawn < 1 || after.drawn < 1 || metrics.cpu["navigation (inclusive)"])) throw new Error("Paused enemies moved, disappeared or performed navigation");
      if ((mode === "normal" || mode === "snap") && (!changed || after.drawn < 1)) throw new Error("Visible enemies did not move");
      let resume = null;
      if (useNative && mode === "paused") {
        await page.getByRole("button", { name: "Enemy logic: Off", exact: true }).click();
        resume = await page.evaluate(() => {
          const session = window.__enemyProbeSession, previous = session.getState().floor.time;
          const result = session.dispatch({ type: "wait" });
          return { ticks: result.ticks, elapsed: session.getState().floor.time - previous, enemies: session.getState().floor.entities.filter(entity => entity.kind === "enemy").map(({id,x,y}) => ({id,x,y})) };
        });
        if (resume.ticks !== 1 || resume.elapsed !== 1 || JSON.stringify(resume.enemies) === JSON.stringify(after.enemies)) throw new Error("Enemy logic did not resume on exactly one ordinary turn");
        // Exit with the flag off, then re-enter to check session-only defaults.
        await page.getByRole("button", { name: "Enemy logic: Live", exact: true }).click();
      }
      await page.getByRole("button", { name: "Exit Perf", exact: true }).click();
      await page.getByRole("button", { name: "P: 0", exact: true }).click();
      await page.getByRole("button", { name: "Enemy logic: Live", exact: true }).waitFor();
      const savedAfter = await page.evaluate(() => JSON.stringify(Object.fromEntries(Object.keys(localStorage).filter(key => key.startsWith("rogues-dungeon.slot.")).sort().map(key => [key, localStorage.getItem(key)]))));
      if (savedBytes !== savedAfter) throw new Error("Temporary enemy experiment changed save bytes");
      results.push({ mode, useNative, fixture, patches, before, after, distance, metrics, resume, savesUnchanged: true, liveRestored: true, errors });
      await root.evaluate(data => { window.__enemyIsolationResults = data; }, results);
      if (errors.length) throw new Error("Application error during comparison: " + errors.join("; "));
    } finally { await context.close(); }
  }
  const reference = results[0];
  for (const result of results.filter(result => result.mode === "hidden" || result.mode === "snap")) {
    if (JSON.stringify(reference.after.enemies) !== JSON.stringify(result.after.enemies) || reference.after.time !== result.after.time || reference.distance !== result.distance) throw new Error("Comparison changed authoritative movement, not just presentation");
  }
  return results;
}
