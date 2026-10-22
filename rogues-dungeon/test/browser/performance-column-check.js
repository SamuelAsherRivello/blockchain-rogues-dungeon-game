async root => {
  const context = await root.context().browser().newContext({viewport:{width:1280,height:720}});
  const errors = [], states = [];
  try {
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if(message.type() === "error") errors.push(message.text()); });
    await page.goto("http://127.0.0.1:6080/blockchain-rogues-dungeon-game/?mute=1&world=1&level=1&run=1&slot=1&seed=17");
    await page.locator(".world-view[data-renderer-ready=true]").waitFor();
    await page.locator(".world-view .ui_iris_transition").waitFor({state:"hidden"});
    const savedSlots = () => page.evaluate(() => JSON.stringify(Object.fromEntries(Object.keys(localStorage).filter(key => key.startsWith("rogues-dungeon.slot.")).sort().map(key => [key,localStorage.getItem(key)]))));
    const saved = await savedSlots();
    const geometry = () => page.evaluate(() => {
      const column=document.querySelector(".information-panels .info-panel--primary"), panel=document.querySelector(".performance-controls"), middle=document.querySelector(".game-screen__middle");
      const rect=element=>{const r=element.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};
      return {column:rect(column),panel:panel?rect(panel):null,middle:rect(middle),primary:middle.dataset.primaryOpen,secondary:middle.dataset.secondaryOpen,
        inert:document.querySelector(".performance-panel-content")?.inert, buttons:panel?[...panel.querySelectorAll("button")].map(b=>({text:b.textContent,overflow:b.scrollWidth>b.clientWidth+1})):[]};
    });
    if(await page.locator(".performance-controls").count())throw Error("Perf panel was visible by default");
    const original = await geometry();
    await page.getByRole("button",{name:"P: 0",exact:true}).click();
    await page.getByRole("button",{name:"P: 1",exact:true}).waitFor();
    await page.locator(".world-view[data-renderer-ready=true]").waitFor();
    await page.locator(".world-view .ui_iris_transition").waitFor({state:"hidden"});
    const initial = await geometry(); states.push(initial);
    if(!initial.panel||Math.abs(initial.column.x-original.column.x)>1||initial.panel.height<initial.column.height-40||initial.panel.right>initial.column.right+1)throw Error("Perf does not fill the primary column");
    if(await page.locator(".information-panels .info-panel--primary .slot_item").count())throw Error("Underlying inventory is still interactive");
    await page.getByRole("button",{name:"Enemy logic: Live",exact:true}).click();
    for(const [primary,secondary] of [["true","false"],["false","false"],["false","true"],["true","true"]]) {
      await page.keyboard.press("c");
      await page.waitForTimeout(350);
      const state=await geometry();states.push(state);
      if(state.primary!==primary||state.secondary!==secondary||state.inert!==(primary==="false"))throw Error("C cycle or collapsed focus boundary changed");
      if(primary==="false"&&state.panel.x<state.middle.right-1)throw Error("Perf stayed over the world when collapsed: "+JSON.stringify(state));
    }
    if(await page.getByRole("button",{name:"Enemy logic: Off",exact:true}).count()!==1)throw Error("C reset diagnostic options");
    await page.getByRole("button",{name:"Fullscreen",exact:true}).click();
    await page.waitForTimeout(350);
    if(!await page.evaluate(()=>Boolean(document.fullscreenElement)))throw Error("Fullscreen did not activate");
    const full=await geometry();states.push(full);
    if(full.panel.bottom>full.middle.bottom+1)throw Error("Perf escaped fullscreen column bounds");
    await page.screenshot({path:"output/optimize-world-renderer/performance-column.png"});
    await page.setViewportSize({width:800,height:450});
    await page.waitForTimeout(350);
    const narrow=await geometry();states.push(narrow);
    if(narrow.panel.bottom>narrow.middle.bottom+1||narrow.buttons.some(button=>button.overflow))throw Error("Narrow column controls overflow");
    await page.getByText("Work counters and CPU milliseconds",{exact:true}).click();
    if(!await page.locator(".performance-controls details").getAttribute("open")&&await page.locator(".performance-controls details").getAttribute("open")!=="")throw Error("Counters did not expand");
    await page.screenshot({path:"output/optimize-world-renderer/performance-column-compact.png"});
    await page.getByRole("button",{name:"Fullscreen",exact:true}).click();
    await page.getByRole("button",{name:"P: 1",exact:true}).click();
    await page.getByRole("button",{name:"P: 0",exact:true}).waitFor();
    if(await page.locator(".performance-controls").count())throw Error("P:0 did not remove the panel");
    await page.keyboard.press("c"); await page.keyboard.press("c");
    await page.getByRole("button",{name:"P: 0",exact:true}).click();
    await page.waitForTimeout(350);
    const reopened=await geometry();states.push(reopened);
    if(reopened.primary!=="true"||!await page.getByRole("button",{name:"Enemy logic: Live",exact:true}).count())throw Error("P did not reopen the column with clean session defaults");
    await page.getByRole("button",{name:"P: 1",exact:true}).click();
    if(await savedSlots()!==saved)throw Error("Panel changes wrote saved campaigns");
    if(errors.length)throw Error(errors.join("; "));
    const canvases=await page.locator("canvas").count();
    if(canvases>2)throw Error("Opening the PC panel activated a hidden mobile minimap");
    return {states,errors,storageUnchanged:true,canvases};
  } finally {await context.close();}
}
