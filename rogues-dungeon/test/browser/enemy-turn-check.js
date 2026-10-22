async root => {
  const results = [];
  for (const mode of ["per-enemy-control", "batched", "paused"]) {
    const context = await root.context().browser().newContext();
    const errors = [];
    try {
      if (mode === "per-enemy-control") await context.route("**/src/game/enemy-ai-system.ts*", async route => {
        const response = await route.fetch(); let body = await response.text();
        const token = "import { createCardinalPathBatch }";
        if (!body.includes(token)) throw Error("Control import changed");
        body = body.replace(token, "import { findCardinalPath }");
        body += "\nconst createCardinalPathBatch = (floor, to) => (from, options) => findCardinalPath(floor, from, to, options);\n";
        await route.fulfill({ response, body });
      });
      const page = await context.newPage();
      page.on("pageerror", error => errors.push(error.message));
      await page.goto("http://127.0.0.1:6080/blockchain-rogues-dungeon-game/?mute=1");
      const samples = await page.evaluate(async mode => {
        const base = "/blockchain-rogues-dungeon-game/src/";
        const world = await import(base + "systems/procedural/world-procedural-system.ts");
        const grid = await import(base + "systems/procedural/level-grid-system.ts");
        const perf = await import(base + "systems/rendering/performance-system.ts");
        const { copyCampaignMutableState } = await import(base + "systems/procedural/campaign-copy-system.ts");
        const source = world.createCampaign(17);
        const template = source.floor.entities.find(e => e.kind === "enemy");
        source.floors = undefined; source.floor.width = 100; source.floor.height = 100;
        source.floor.cells = grid.createSemanticCells(100, 100, true); source.floor.map = undefined;
        for (let y = 0; y < 100; y++) source.floor.cells[y][50].walkable = false;
        source.floor.objectSets = []; source.floor.decorations = [];
        source.floor.entities = Array.from({ length: 12 }, (_, i) => ({ ...structuredClone(template), id: `pursuer-${i}`, x: 48 - i % 3, y: 48 + Math.floor(i / 3), awareness: 20, nextActionAt: 0, actionCooldown: 1 }));
        source.floor.start = { x: 52, y: 50 }; source.floor.time = 10;
        Object.assign(source.player, source.floor.start, { pixel: { x: 52 * 32 + 16, y: 50 * 32 + 16 } });
        grid.ensureSemanticCells(source.floor); grid.markRuntimeGridValid(source.floor);
        const sample = () => {
          const session = world.createGameSession(copyCampaignMutableState(source), { getEnemyLogicDisabled: () => mode === "paused" });
          const before = performance.now(); const result = session.dispatch({ type: "wait" });
          if (!result.accepted || result.ticks !== 1 || result.state.floor.time !== 11) throw Error("Turn semantics changed");
          if (result.state.floor.entities.some((e, i) => e.x !== source.floor.entities[i].x || e.y !== source.floor.entities[i].y)) throw Error("Blocked enemies moved");
          return performance.now() - before;
        };
        sample(); sample();
        perf.setPerformanceOptions({ enabled: true }); perf.resetPerformanceMetrics();
        const durations = [];
        for (let i = 0; i < 10; i++) { await new Promise(requestAnimationFrame); durations.push(sample()); }
        return { mode, userAgent: navigator.userAgent, seed: 17, dimensions: [100, 100], enemies: 12,
          mean: durations.reduce((sum, value) => sum + value, 0) / durations.length, max: Math.max(...durations), metrics: perf.readPerformanceMetrics() };
      }, mode);
      if (errors.length) throw Error(errors.join("; "));
      results.push(samples);
    } finally { await context.close(); }
  }
  await root.evaluate(results => { window.__enemyTurnResults = results; }, results);
  return results;
}
