async page => {
  const base = "http://127.0.0.1:6080/blockchain-rogues-dungeon-game/";
  const read = () => page.evaluate(() => JSON.stringify(Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith("rogues-dungeon.slot.")).sort().map(k=>[k,localStorage.getItem(k)]))));
  await page.goto(base+"?mute=1");
  await page.evaluate(async () => {
    const {createRunCampaign} = await import("/blockchain-rogues-dungeon-game/src/systems/procedural/world-procedural-system.ts");
    const {writeSlot,readSlot} = await import("/blockchain-rogues-dungeon-game/src/systems/persistence/save-system.ts");
    if (localStorage.getItem("rogues-dungeon.slot.3")) throw new Error("Test slot already occupied");
    writeSlot(localStorage,"3",createRunCampaign(17,3,1));
    if(!readSlot(localStorage,"3").floor.entities.some(entity=>entity.kind==="stairs")) throw new Error("Fixture did not restore its generated stairs");
  });
  await page.reload();
  await page.getByRole("button",{name:/Saved Game 3/}).click();
  await page.locator(".world-view[data-renderer-ready=true]").waitFor();
  const before = await read();
  const start = await page.locator(".world-view").getAttribute("data-player-pixel-x");
  await page.getByRole("button",{name: "P: 0",exact:true}).click();
  await page.locator(".world-view[data-renderer-ready=true]").waitFor();
  await page.getByRole("button",{name:"Enemy logic: Live",exact:true}).click();
  await page.getByRole("button",{name:"Enemy logic: Off",exact:true}).waitFor();
  await page.waitForTimeout(2000);
  await page.keyboard.down("a"); await page.waitForTimeout(500); await page.keyboard.up("a");
  const moved = await page.locator(".world-view").getAttribute("data-player-pixel-x");
  for(let i=0;i<3;i++) {await page.getByRole("button",{name:/^World Size:/}).click(); await page.locator(".world-view[data-renderer-ready=true]").waitFor();}
  const regenerated = await read();
  await page.getByRole("button",{name:"Settings",exact:true}).click();
  await page.getByRole("button",{name:"Save & Exit",exact:true}).click();
  await page.getByRole("button",{name:"Confirm",exact:true}).click();
  await page.locator(".world-view[data-renderer-ready=true]").waitFor();
  const saveExit = await read();
  const restored = await page.locator(".world-view").getAttribute("data-player-pixel-x");
  await page.getByRole("button",{name: "P: 0",exact:true}).click();
  await page.locator(".world-view[data-renderer-ready=true]").waitFor();
  await page.getByRole("button",{name:"Enemy logic: Live",exact:true}).waitFor();
  const enemyLogicReset = true;
  await page.getByRole("button",{name:"Exit Perf",exact:true}).click();
  const exited = await read();
  await page.reload(); await page.getByRole("heading",{name:"Start Game",exact:true}).waitFor();
  const reloaded = await read();
  const result = {moved:start!==moved,restored:start===restored,enemyLogicReset,nonemptyStorage:JSON.parse(before)["rogues-dungeon.slot.3"]?.length,unchanged:[regenerated,saveExit,exited,reloaded].every(value=>value===before)};
  await page.evaluate(() => { localStorage.removeItem("rogues-dungeon.slot.3"); localStorage.removeItem("rogues-dungeon.slot.v1-backup.3"); });
  return result;
}
