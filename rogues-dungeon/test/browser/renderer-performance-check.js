async page => {
  const base = "http://127.0.0.1:6080/blockchain-rogues-dungeon-game/";
  const errors = [];
  const consoleListener = message => { if (message.type() === "error" || message.type() === "warning" && !message.text().includes("powerPreference")) errors.push(message.text()); };
  page.on("console", consoleListener);
  await page.goto(base + "?world=1&level=1&run=1&slot=1&seed=17&mute=1");
  await page.locator(".world-view[data-renderer-ready=true]").waitFor();
  await page.getByRole("combobox", { name: "Movement mode", exact: true }).selectOption("gridless");
  await page.getByRole("button", { name: "P: 0", exact: true }).click();
  const context = await page.evaluate(async () => {
    const adapter = await navigator.gpu.requestAdapter();
    return { ua: navigator.userAgent, viewport: [innerWidth, innerHeight], dpr: devicePixelRatio,
      cores: navigator.hardwareConcurrency, gpu: adapter ? {vendor:adapter.info.vendor, architecture:adapter.info.architecture, device:adapter.info.device, description:adapter.info.description} : null };
  });
  const beforeStorage = await page.evaluate(() => JSON.stringify(Object.fromEntries(Object.keys(localStorage).filter(k => k.startsWith("rogues-dungeon.slot.")).sort().map(k => [k,localStorage.getItem(k)]))));
  const cases = [
    ["reference", null], ["local", "Draw: Camera"], ["static", "Animation: Full"],
    ["dynamic-off", "Dynamic: On"], ["minimap-frozen", "Minimap: live"],
    ["minimap-off", "minimap-off"], ["simulation-frozen", "Simulation: live"],
    ["50", "size50"], ["200", "size200"], ["minimal", "minimal"]
  ];
  const results = [];
  for (const [name, action] of cases) {
    await page.evaluate(async () => {
      const p = await import("/blockchain-rogues-dungeon-game/src/systems/rendering/performance-system.ts");
      p.setPerformanceOptions({enabled:true,local:false,animated:true,dynamic:true,minimap:"live",simulation:"live"});
    });
    const size = name === "50" ? 50 : name === "200" ? 200 : 100;
    for (let i=0; i<3 && !(await page.getByRole("button",{name:"World Size: "+size+"×"+size,exact:true}).count()); i++)
      await page.getByRole("button", {name:/^World Size:/}).click();
    await page.getByRole("button",{name:"Restart route",exact:true}).click();
    await page.locator(".world-view[data-renderer-ready=true]").waitFor();
    if (action === "minimap-off") {
      await page.getByRole("button",{name:"Minimap: live",exact:true}).click();
      await page.getByRole("button",{name:"Minimap: frozen",exact:true}).click();
    } else if (action === "minimal") {
      for (const label of ["Draw: Camera","Animation: Full","Dynamic: On","Simulation: live","Minimap: live","Minimap: frozen"])
        await page.getByRole("button",{name:label,exact:true}).click();
    } else if (action && !action.startsWith("size")) {
      await page.getByRole("button",{name:action,exact:true}).click();
    }
    await page.waitForTimeout(5000);
    const label = (await page.locator(".performance-controls").innerText()).split("\n")[0];
    await page.getByRole("button",{name:"Reset sample",exact:true}).click();
    let distance = 0;
    let previous = Number(await page.locator(".world-view").getAttribute("data-player-pixel-x"));
    for (let n=0;n<20;n++) {
      const key = n%2===0 ? "a" : "d";
      await page.keyboard.down(key); await page.waitForTimeout(500); await page.keyboard.up(key);
      const x = Number(await page.locator(".world-view").getAttribute("data-player-pixel-x"));
      distance += Math.abs(x-previous); previous=x;
    }
    const metrics = await page.evaluate(async () => (await import("/blockchain-rogues-dungeon-game/src/systems/rendering/performance-system.ts")).readPerformanceMetrics());
    const result = {name,label,distance,metrics}; results.push(result);
    await page.evaluate(data => sessionStorage.setItem("renderer-perf-comparison", JSON.stringify(data)), {context,results});
    console.log(JSON.stringify(result));
  }
  const afterStorage = await page.evaluate(() => JSON.stringify(Object.fromEntries(Object.keys(localStorage).filter(k => k.startsWith("rogues-dungeon.slot.")).sort().map(k => [k,localStorage.getItem(k)]))));
  await page.getByRole("button",{name:"Exit Perf",exact:true}).click();
  await page.locator(".world-view[data-renderer-ready=true]").waitFor();
  const exitStorage = await page.evaluate(() => JSON.stringify(Object.fromEntries(Object.keys(localStorage).filter(k => k.startsWith("rogues-dungeon.slot.")).sort().map(k => [k,localStorage.getItem(k)]))));
  await page.reload(); await page.getByRole("heading",{name:"Start Game",exact:true}).waitFor();
  const reloadedStorage = await page.evaluate(() => JSON.stringify(Object.fromEntries(Object.keys(localStorage).filter(k => k.startsWith("rogues-dungeon.slot.")).sort().map(k => [k,localStorage.getItem(k)]))));
  page.off("console", consoleListener);
  return {context,results,errors,storageUnchanged:beforeStorage===afterStorage&&beforeStorage===exitStorage&&beforeStorage===reloadedStorage,reloadedMenu:await page.getByRole("heading",{name:"Start Game",exact:true}).count()};
}
