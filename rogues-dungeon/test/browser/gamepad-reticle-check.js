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
  const reset = async (battle = false, campfire = false, unarmed = false, funds = 1000) => {
    await page.goto(`${base}?mute=1`);
    await page.evaluate(async ({battle, campfire, unarmed, funds}) => {
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
      campaign.floor.generatorVersion = "browser-fixture";
      campaign.generatorVersion = undefined; campaign.floorProfiles = {}; campaign.levelStates = {}; campaign.floors = undefined;
      campaign.player.inventory = [{id:"fixture-inventory-stick",name:"Wooden Stick",group:"weapons",modifiers:{offense:1}}];
      if (campfire) { campaign.floor.entities = [{id:"fixture-campfire",kind:"campfire",x:51,y:50}]; campaign.counters.gold = funds; }
      if (unarmed) campaign.player.equipment.weapons = [null,null];
      const {revealDiscovery} = await import("/blockchain-rogues-dungeon-game/src/systems/procedural/map-discovery-system.ts");
      revealDiscovery(campaign, campaign.player, 10);
      const compatibility = await import("/blockchain-rogues-dungeon-game/src/systems/persistence/development-storage-system.ts");
      localStorage.setItem(compatibility.DEVELOPMENT_STORAGE_COMPATIBILITY_KEY, compatibility.DEVELOPMENT_STORAGE_COMPATIBILITY_EPOCH);
      localStorage.setItem("rogues-dungeon.slot.1", JSON.stringify(campaign));
      localStorage.setItem("rogues-dungeon.preferences.v1", JSON.stringify({ movementMode: "grid-tween", zoom: 1, camera: "center" }));
    }, {battle, campfire, unarmed, funds});
    await page.reload(); await page.bringToFront();
    await page.getByRole("button", { name: /Saved Game 1/ }).click();
    await page.locator(".game-screen").waitFor({ state: "visible" });
    await page.waitForFunction(() => !document.body.textContent.includes("Preparing the crypt..."));
    await page.waitForFunction(() => /FPS: [0-9]/.test(document.body.innerText));
    await page.locator('.world-view[data-renderer-ready="true"][data-world-alive="true"]').waitFor();
    await page.locator('.world-view .ui_iris_transition').waitFor({ state: 'detached' });
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
  const sameAim = (a,b) => Math.abs(a.x-b.x)<2 && Math.abs(a.y-b.y)<2;
  const left = async (x = 0, y = 0, dpad = -1) => {
    await page.evaluate(({x,y,dpad}) => { window.testGamepad.axes[0]=x; window.testGamepad.axes[1]=y; for(let i=12;i<16;i++){window.testGamepad.buttons[i].pressed=i===dpad;window.testGamepad.buttons[i].value=Number(i===dpad);} }, {x,y,dpad});
    await page.waitForTimeout(80);
  };
  const saved = () => page.evaluate(async () => (await import("/blockchain-rogues-dungeon-game/src/systems/persistence/save-system.ts")).readSlot(localStorage,"1"));
  const expectNeighbor = async (dx,dy) => {
    const actual = await reticle(); const box = await page.locator(".world-view").boundingBox();
    const size = await page.locator(".world-view__grid-reticle").evaluate(el=>parseFloat(el.style.width));
    if(Math.abs(actual.x-box.width/2-dx*size)>2 || Math.abs(actual.y-box.height/2-dy*size)>2) throw Error(`Wrong neighbor ${dx},${dy}: ${JSON.stringify(actual)}`);
  };
  await reset(); await mouse(128,64);
  const freeMouse = await reticle();
  await left(1); await left();
  if(!sameAim(await reticle(),freeMouse)) throw Error("Left stick stole mouse aiming");
  await left(0,0,13); await left();
  if(!sameAim(await reticle(),freeMouse)) throw Error("D-pad stole mouse aiming");
  await page.waitForTimeout(300);
  await aim(1,-1); await expectNeighbor(1,-1);
  await mouse(129,64); const mouseAgain = await reticle(); await page.waitForTimeout(200);
  if(!sameAim(await reticle(),mouseAgain)) throw Error("Unchanged held stick stole newer mouse aiming");
  await aim(-1,-1); await expectNeighbor(-1,-1);
  for(const [x,y] of [[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]]) { await aim(x,y); await expectNeighbor(x,y); await page.waitForTimeout(100); await expectNeighbor(x,y); }
  await aim();
  await left(1); await page.keyboard.down("ArrowUp"); await page.waitForTimeout(500); await page.keyboard.up("ArrowUp");
  const handedOff = await position(); await page.waitForTimeout(450);
  if(JSON.stringify(await position())!==JSON.stringify(handedOff)) throw Error("Stale controller movement resumed after keyboard release");
  await left(); await aim(1); await aim(); const beforeTrigger = await position();
  await aim(0,0,6); await page.waitForTimeout(500); await aim();
  if((await position()).x!==beforeTrigger.x+1) throw Error("Left trigger did not click neighboring target");
  await aim(1); await aim(); const beforeRight = await position();
  await aim(0,0,7); await page.waitForTimeout(500); await aim();
  if((await position()).x!==beforeRight.x+1) throw Error("Right trigger did not click neighboring target");
  reports.push({mixedInput:"controller movement preserves mouse aiming, direct stick takeover, eight neighbors, movement handoff, triggers"});

  const item = page.locator('[data-drag-kind="inventory"][data-drag-id="fixture-inventory-stick"]').first();
  const itemBox = await item.boundingBox();
  await left(1);
  await page.mouse.move(itemBox.x+itemBox.width/2,itemBox.y+itemBox.height/2); await page.mouse.down();
  await page.mouse.move(itemBox.x+itemBox.width/2+25,itemBox.y+itemBox.height/2+25); await page.waitForTimeout(100);
  const dragPosition = await position();
  await aim(1,0,7); await page.keyboard.down("ArrowDown"); await page.waitForTimeout(500);
  if(JSON.stringify(await position())!==JSON.stringify(dragPosition)) throw Error("World moved during inventory drag");
  if(await page.locator(".world-view__grid-reticle").count()) throw Error("Controller aimed during inventory drag");
  await page.mouse.up(); await page.waitForTimeout(450);
  if(JSON.stringify(await position())!==JSON.stringify(dragPosition)) throw Error("Held controls resumed after drag");
  await page.keyboard.up("ArrowDown"); await left(); await aim();
  const select=page.getByRole("combobox",{name:"Movement mode"}); await select.focus();
  const textPosition=await position(); await left(1); await page.keyboard.down("ArrowDown"); await page.waitForTimeout(300);
  if(JSON.stringify(await position())!==JSON.stringify(textPosition)) throw Error("World moved with editable control focused");
  await select.evaluate(el=>el.blur()); await page.waitForTimeout(400);
  if(JSON.stringify(await position())!==JSON.stringify(textPosition)) throw Error("Stale input resumed after editable focus");
  await page.keyboard.up("ArrowDown"); await left(); await aim();
  reports.push({panels:"inventory drag and editable focus suppress world input and stale resume"});

  await reset(false,true); await aim(1); await left(1); await left();
  const prompt=page.locator('.movement-prompt[aria-label="Interact"]'); await prompt.waitFor({state:"visible"});
  const promptPosition=await position(); await page.waitForTimeout(250);
  if((await saved()).counters.gold!==1000) throw Error("Held stick auto-confirmed new prompt");
  await aim(); await aim(-1); await prompt.waitFor({state:"hidden"});
  if(JSON.stringify(await position())!==JSON.stringify(promptPosition)) throw Error("Right-stick cancellation moved player");
  if(await page.locator(".world-view__grid-reticle").count()) throw Error("Prompt gesture leaked into targeting");
  await aim(); await left(1); await left(); await prompt.waitFor({state:"visible"}); await aim(); await aim(1); await aim();
  await page.waitForFunction(async()=>{const c=(await import("/blockchain-rogues-dungeon-game/src/systems/persistence/save-system.ts")).readSlot(localStorage,"1");return c.counters.gold<1000;},null,{timeout:15000});
  const rested=await saved(); if(rested.player.x!==50 || rested.player.y!==50) throw Error("Rest confirmation also moved player");
  reports.push({prompts:"neutral before new prompt, cancel without movement, confirm rest once"});
  await reset(false,true,false,0); await left(1); await left(); await prompt.waitFor({state:"visible"});
  await aim(); await aim(1); await page.waitForTimeout(350);
  if(!await prompt.isVisible() || (await saved()).counters.gold!==0) throw Error("Disabled rest confirmation executed");
  await aim(); await aim(-1); await prompt.waitFor({state:"hidden"}); await aim();
  await reset(true,false,true);
  const tip=page.locator('.movement-prompt[aria-label="Tip"]'); await tip.waitFor({state:"visible"});
  await aim(); const beforeTip=await position(); await aim(0,-1); await tip.waitFor({state:"hidden"});
  if(JSON.stringify(await position())!==JSON.stringify(beforeTip)) throw Error("Informational prompt dismissal moved player");
  await aim(); await reset(true);
  await aim(-1); await aim(); await aim(0,0,6); await page.waitForTimeout(900);
  if((await position()).x!==49) throw Error("Held left trigger repeated in Battle");
  await aim(); await aim(-1); await aim(); await aim(0,0,7); await page.waitForTimeout(900);
  if((await position()).x!==48) throw Error("Held right trigger repeated in Battle");
  await aim();
  reports.push({promptSafety:"disabled confirmations blocked, informational prompts dismiss, Battle triggers remain one step"});
  if(errors.length) throw Error(errors.join("\n"));
  return {reports,errors};
}
